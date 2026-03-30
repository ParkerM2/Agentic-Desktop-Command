/**
 * File Explorer feature -- public API
 */

// API hooks
export { useFileTree } from './api/useFileTree';
export type { FileTreeNode } from './api/useFileTree';
export { fileExplorerKeys } from './api/queryKeys';

// Events
export { useFileTreeEvents } from './hooks/useFileTreeEvents';

// Store
export { useFileExplorerUI } from './store';

// Components
export { FileExplorer } from './components/FileExplorer';
export { FileNode } from './components/FileNode';
