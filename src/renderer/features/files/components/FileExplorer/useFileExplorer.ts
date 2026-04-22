import { useCallback, useMemo, useRef } from 'react';

import { useFileTree } from '../../api/useFileTree';
import { useFileTreeEvents } from '../../hooks/useFileTreeEvents';
import { useFileExplorerUI } from '../../store';

import type { FileTreeNode } from '../../api/useFileTree';
import type { NodeApi, TreeApi } from 'react-arborist';

interface UseFileExplorerOptions {
  projectPath: string | null;
  onFileActivate?: (filePath: string) => void;
}

export function useFileExplorer({ projectPath, onFileActivate }: UseFileExplorerOptions) {
  const treeRef = useRef<TreeApi<FileTreeNode> | undefined>(undefined);
  const { data: nodes, isLoading, error } = useFileTree(projectPath);
  const { searchQuery, setSearchQuery, clearSearch, selectNode } = useFileExplorerUI();

  // Subscribe to file-watcher events for cache invalidation
  useFileTreeEvents();

  const handleActivate = useCallback(
    (node: NodeApi<FileTreeNode>) => {
      if (!node.data.isDirectory) {
        selectNode(node.id);
        onFileActivate?.(node.id);
      }
    },
    [onFileActivate, selectNode],
  );

  const handleSelect = useCallback(
    (selected: Array<NodeApi<FileTreeNode>>) => {
      if (selected.length > 0) {
        selectNode(selected[0].id);
      } else {
        selectNode(null);
      }
    },
    [selectNode],
  );

  const handleSearchMatch = useCallback(
    (node: NodeApi<FileTreeNode>, term: string): boolean => {
      return node.data.name.toLowerCase().includes(term.toLowerCase());
    },
    [],
  );

  const childrenAccessor = useCallback(
    (d: FileTreeNode): readonly FileTreeNode[] | null => d.children,
    [],
  );

  const idAccessor = useCallback((d: FileTreeNode): string => d.id, []);

  const trimmedSearch = useMemo(() => searchQuery.trim(), [searchQuery]);

  return {
    treeRef,
    nodes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,
    trimmedSearch,
    handleActivate,
    handleSelect,
    handleSearchMatch,
    childrenAccessor,
    idAccessor,
  };
}
