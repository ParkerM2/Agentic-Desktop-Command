/**
 * File explorer query keys factory
 */
export const fileExplorerKeys = {
  all: ['file-explorer'] as const,
  trees: () => [...fileExplorerKeys.all, 'tree'] as const,
  tree: (projectPath: string) => [...fileExplorerKeys.trees(), projectPath] as const,
};
