/**
 * StepReview — Wizard step for reviewing all selections before project creation
 */

import { Check, FolderOpen, GitBranch, Layers } from 'lucide-react';

import { Heading } from '@ui';

interface StepReviewProps {
  name: string;
  description: string;
  path: string;
  techStack: string[];
  createGitHubRepo: boolean;
  githubVisibility: 'public' | 'private';
}

export function StepReview({
  name,
  description,
  path,
  techStack,
  createGitHubRepo,
  githubVisibility,
}: StepReviewProps) {
  return (
    <div className="space-y-4">
      <Heading as="h3" className="text-sm font-medium">Review &amp; Create</Heading>
      <p className="text-muted-foreground text-xs">
        Review your project settings before creating.
      </p>

      {/* Summary card */}
      <div className="border-border divide-border divide-y rounded-lg border">
        {/* Project details section */}
        <div className="flex items-start gap-3 p-3">
          <FolderOpen className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </p>
            <p className="text-sm font-medium">{name}</p>
            {description.trim().length > 0 ? (
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 truncate text-xs">{path}</p>
          </div>
        </div>

        {/* Tech stack section */}
        <div className="flex items-start gap-3 p-3">
          <Layers className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tech Stack
            </p>
            {techStack.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="border-border bg-muted/50 rounded-md border px-2 py-0.5 text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-xs italic">None selected</p>
            )}
          </div>
        </div>

        {/* GitHub section */}
        <div className="flex items-start gap-3 p-3">
          <GitBranch className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              GitHub
            </p>
            {createGitHubRepo ? (
              <p className="mt-0.5 text-sm">
                Create {githubVisibility} repository
              </p>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-xs italic">No GitHub repository</p>
            )}
          </div>
        </div>
      </div>

      {/* What will happen */}
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">What will happen:</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-xs">
            <Check className="text-success h-3.5 w-3.5 shrink-0" />
            <span>Create project folder (if it does not exist)</span>
          </li>
          <li className="flex items-center gap-2 text-xs">
            <Check className="text-success h-3.5 w-3.5 shrink-0" />
            <span>Initialize git repository</span>
          </li>
          {createGitHubRepo ? (
            <li className="flex items-center gap-2 text-xs">
              <Check className="text-success h-3.5 w-3.5 shrink-0" />
              <span>Create {githubVisibility} GitHub repository</span>
            </li>
          ) : null}
          <li className="flex items-center gap-2 text-xs">
            <Check className="text-success h-3.5 w-3.5 shrink-0" />
            <span>Analyze codebase and generate documentation</span>
          </li>
          <li className="flex items-center gap-2 text-xs">
            <Check className="text-success h-3.5 w-3.5 shrink-0" />
            <span>Generate CLAUDE.md with project configuration</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
