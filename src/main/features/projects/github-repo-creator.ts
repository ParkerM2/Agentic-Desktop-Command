/**
 * GitHub Repo Creator — creates GitHub repos via the `gh` CLI
 *
 * Uses `gh repo create` to initialize a remote GitHub repository
 * from a local source directory. Handles missing/unauthenticated CLI gracefully.
 */

import { execFile } from 'node:child_process';

export interface GitHubRepoCreatorService {
  createRepo: (options: {
    name: string;
    visibility: 'public' | 'private';
    sourcePath: string;
    description?: string;
  }) => Promise<{ success: boolean; url?: string; error?: string }>;
}

export function createGitHubRepoCreator(): GitHubRepoCreatorService {
  return {
    createRepo(options) {
      return new Promise((resolve) => {
        const args = [
          'repo',
          'create',
          options.name,
          `--${options.visibility}`,
          '--source',
          options.sourcePath,
          '--push',
        ];

        if (options.description) {
          args.push('--description', options.description);
        }

        execFile('gh', args, { shell: true, timeout: 120_000 }, (error, stdout, stderr) => {
          if (error) {
            const fallback = error instanceof Error ? error.message : 'Unknown error';
            const message = stderr.trim() || fallback;

            // Check for common failure modes
            if (
              message.includes('ENOENT') ||
              message.includes('not recognized') ||
              message.includes('not found')
            ) {
              resolve({
                success: false,
                error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com',
              });
              return;
            }

            if (
              message.includes('not logged') ||
              message.includes('auth login') ||
              message.includes('authentication')
            ) {
              resolve({
                success: false,
                error: 'GitHub CLI is not authenticated. Run `gh auth login` first.',
              });
              return;
            }

            resolve({ success: false, error: message });
            return;
          }

          // gh repo create prints the repo URL to stdout on success
          const url = stdout.trim();
          resolve({ success: true, url: url.length > 0 ? url : undefined });
        });
      });
    },
  };
}
