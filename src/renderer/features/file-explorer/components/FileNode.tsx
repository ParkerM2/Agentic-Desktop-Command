/**
 * FileNode -- Custom node renderer for react-arborist tree
 *
 * Renders file/folder icons, name with truncation,
 * and a modified indicator for git-changed files.
 */

import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  Image,
  Settings,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import type { FileTreeNode } from '../api/useFileTree';
import type { NodeRendererProps } from 'react-arborist';

// ─── Icon Mapping ──────────────────────────────────────────────

const ICON_SIZE = 16;

/** Maps file extensions to lucide icon components */
const EXTENSION_ICON_MAP: Record<string, React.ElementType> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,
  json: FileJson,
  md: FileText,
  mdx: FileText,
  txt: FileText,
  css: FileType,
  scss: FileType,
  html: FileCode,
  svg: Image,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  ico: Image,
  yml: Settings,
  yaml: Settings,
  toml: Settings,
  env: Settings,
};

function getFileIcon(extension: string | null): React.ElementType {
  if (extension === null) return File;
  return EXTENSION_ICON_MAP[extension] ?? File;
}

// ─── Folder Icon Sub-component ─────────────────────────────────

interface FolderIconProps {
  isOpen: boolean;
}

function FolderIcon({ isOpen }: FolderIconProps) {
  if (isOpen) {
    return <FolderOpen className="text-primary" size={ICON_SIZE} />;
  }
  return <Folder className="text-primary" size={ICON_SIZE} />;
}

// ─── File Icon Sub-component ───────────────────────────────────

interface FileIconProps {
  extension: string | null;
}

function FileIcon({ extension }: FileIconProps) {
  const Icon = getFileIcon(extension);
  return <Icon className="text-muted-foreground" size={ICON_SIZE} />;
}

// ─── Component ─────────────────────────────────────────────────

export function FileNode({ node, style, dragHandle }: NodeRendererProps<FileTreeNode>) {
  const { isDirectory, isModified } = node.data;

  return (
    <div
      ref={dragHandle}
      aria-expanded={isDirectory ? node.isOpen : undefined}
      aria-selected={node.isSelected}
      role="treeitem"
      style={style}
      tabIndex={-1}
      className={cn(
        'flex items-center gap-1 rounded-sm px-1 py-0.5 text-sm',
        'cursor-pointer select-none',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        node.isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground',
        node.isFocused ? 'ring-1 ring-ring' : '',
      )}
      onClick={(e) => {
        node.handleClick(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (isDirectory) {
            node.toggle();
          } else {
            node.activate();
          }
        }
      }}
    >
      {/* Expand/Collapse chevron for directories */}
      {isDirectory ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center"
        >
          {node.isOpen ? (
            <ChevronDown className="text-muted-foreground" size={ICON_SIZE} />
          ) : (
            <ChevronRight className="text-muted-foreground" size={ICON_SIZE} />
          )}
        </span>
      ) : (
        <span aria-hidden="true" className="w-4 shrink-0" />
      )}

      {/* File/Folder icon */}
      <span aria-hidden="true" className="flex shrink-0 items-center">
        {isDirectory ? (
          <FolderIcon isOpen={node.isOpen} />
        ) : (
          <FileIcon extension={node.data.extension} />
        )}
      </span>

      {/* File name */}
      <span className="min-w-0 flex-1 truncate">
        {node.data.name}
      </span>

      {/* Modified indicator */}
      {isModified ? (
        <span
          aria-label="Modified file"
          className="ml-auto shrink-0 rounded-full bg-warning"
          style={{ width: 6, height: 6 }}
          title="Modified"
        />
      ) : null}
    </div>
  );
}
