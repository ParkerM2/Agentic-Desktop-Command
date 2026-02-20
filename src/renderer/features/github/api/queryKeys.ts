/**
 * GitHub query key factory
 */

export const githubKeys = {
  all: ['github'] as const,
  authStatus: () => [...githubKeys.all, 'authStatus'] as const,
  repos: () => [...githubKeys.all, 'repos'] as const,
  prs: () => [...githubKeys.all, 'prs'] as const,
  prList: (owner: string, repo: string) => [...githubKeys.prs(), owner, repo] as const,
  prDetail: (owner: string, repo: string, number: number) =>
    [...githubKeys.prs(), owner, repo, number] as const,
  issues: () => [...githubKeys.all, 'issues'] as const,
  issueList: (owner: string, repo: string) => [...githubKeys.issues(), owner, repo] as const,
  notifications: () => [...githubKeys.all, 'notifications'] as const,
};
