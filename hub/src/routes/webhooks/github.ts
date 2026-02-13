import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';

import type { Setting, WebhookCommand } from '../../lib/types.js';
import { validateGitHubSignature } from '../../lib/webhook-validator.js';
import { broadcast } from '../../ws/broadcaster.js';

const MENTION_PATTERN = /@claudeassistant/i;
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubComment {
  id: number;
  body: string;
  user: { login: string };
  html_url: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  pull_request?: { url: string };
}

interface GitHubRepo {
  full_name: string;
  owner: { login: string };
  name: string;
}

interface GitHubIssueCommentPayload {
  action: string;
  comment: GitHubComment;
  issue: GitHubIssue;
  repository: GitHubRepo;
}

interface GitHubPrReviewCommentPayload {
  action: string;
  comment: GitHubComment;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
  };
  repository: GitHubRepo;
}

function getSetting(db: FastifyInstance['db'], key: string): string | null {
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as Setting | undefined;
  return row?.value ?? null;
}

/**
 * Post a comment on a GitHub issue/PR.
 */
async function postGitHubComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${String(response.status)}: ${text}`);
  }
}

function insertWebhookCommand(
  db: FastifyInstance['db'],
  sourceId: string,
  sourceChannel: string,
  sourceUrl: string,
  commandText: string,
): WebhookCommand {
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO webhook_commands (id, source, source_id, source_channel, source_url, command_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, 'github', sourceId, sourceChannel, sourceUrl, commandText, 'pending', now);

  return db.prepare('SELECT * FROM webhook_commands WHERE id = ?').get(id) as WebhookCommand;
}

async function replyOnGitHub(
  app: FastifyInstance,
  db: FastifyInstance['db'],
  owner: string,
  repoName: string,
  issueNumber: number,
  commandText: string,
): Promise<void> {
  const githubToken = getSetting(db, 'github.token');

  if (!githubToken) {
    return;
  }

  try {
    await postGitHubComment(
      githubToken,
      owner,
      repoName,
      issueNumber,
      `\u2713 Task created: "${commandText}"\n\n\u2014 Claude Assistant`,
    );
  } catch (error: unknown) {
    app.log.error({ error }, 'Failed to post GitHub comment');
  }
}

export async function githubWebhookRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // We need the raw body for signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  /**
   * POST /api/webhooks/github — GitHub webhook handler
   * Filters for issue_comment and pull_request_review_comment events
   * that mention @claudeassistant.
   */
  app.post('/api/webhooks/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = request.body as string;

    const webhookSecret = getSetting(db, 'github.webhookSecret');

    if (!webhookSecret) {
      return reply.status(500).send({ error: 'GitHub webhook secret not configured' });
    }

    // Validate signature
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) {
      return reply.status(401).send({ error: 'Missing X-Hub-Signature-256 header' });
    }

    if (!validateGitHubSignature(webhookSecret, rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid GitHub signature' });
    }

    const eventType = request.headers['x-github-event'] as string | undefined;

    // Only process comment events
    if (eventType !== 'issue_comment' && eventType !== 'pull_request_review_comment') {
      return reply.send({ ok: true, message: 'Event type ignored' });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' });
    }

    if (eventType === 'issue_comment') {
      const data = payload as GitHubIssueCommentPayload;

      if (data.action !== 'created') {
        return reply.send({ ok: true, message: 'Action ignored' });
      }

      if (!MENTION_PATTERN.test(data.comment.body)) {
        return reply.send({ ok: true, message: 'No mention found' });
      }

      const commandText = data.comment.body.replace(MENTION_PATTERN, '').trim();

      if (!commandText) {
        return reply.send({ ok: true, message: 'Empty command' });
      }

      const repo = data.repository;
      const issue = data.issue;
      const isPr = Boolean(issue.pull_request);

      const record = insertWebhookCommand(
        db,
        data.comment.user.login,
        repo.full_name,
        data.comment.html_url,
        commandText,
      );

      broadcast('webhook_command', 'created', record.id, {
        ...record,
        context: {
          repo: repo.full_name,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueUrl: issue.html_url,
          isPullRequest: isPr,
          commentAuthor: data.comment.user.login,
        },
      });

      await replyOnGitHub(app, db, repo.owner.login, repo.name, issue.number, commandText);

      return reply.send({ ok: true });
    }

    // pull_request_review_comment
    const data = payload as GitHubPrReviewCommentPayload;

    if (data.action !== 'created') {
      return reply.send({ ok: true, message: 'Action ignored' });
    }

    if (!MENTION_PATTERN.test(data.comment.body)) {
      return reply.send({ ok: true, message: 'No mention found' });
    }

    const commandText = data.comment.body.replace(MENTION_PATTERN, '').trim();

    if (!commandText) {
      return reply.send({ ok: true, message: 'Empty command' });
    }

    const repo = data.repository;
    const pr = data.pull_request;

    const record = insertWebhookCommand(
      db,
      data.comment.user.login,
      repo.full_name,
      data.comment.html_url,
      commandText,
    );

    broadcast('webhook_command', 'created', record.id, {
      ...record,
      context: {
        repo: repo.full_name,
        prNumber: pr.number,
        prTitle: pr.title,
        prUrl: pr.html_url,
        isPullRequest: true,
        commentAuthor: data.comment.user.login,
      },
    });

    await replyOnGitHub(app, db, repo.owner.login, repo.name, pr.number, commandText);

    return reply.send({ ok: true });
  });
}
