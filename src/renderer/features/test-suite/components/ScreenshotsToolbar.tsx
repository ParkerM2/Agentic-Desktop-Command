/**
 * ScreenshotsToolbar — Run selector + baseline/compare/copy/open-folder actions.
 *
 * Owns no state; all values and callbacks are passed as props from ScreenshotsPanel.
 */

import { Copy, FolderOpen, GitCompare, Target } from 'lucide-react';

import {
  Button,
  Flex,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

// ─── Types ────────────────────────────────────────────────────

type Sensitivity = 'strict' | 'balanced' | 'relaxed';

interface ScreenshotsToolbarProps {
  compareDisabled: boolean;
  copyDisabled: boolean;
  isComparePending: boolean;
  isSetBaselinePending: boolean;
  onCompare: () => void;
  onCopy: () => void;
  onOpenFolder: () => void;
  onRunChange: (runId: string | null) => void;
  onSensitivityChange: (value: Sensitivity) => void;
  onSetBaseline: () => void;
  openFolderDisabled: boolean;
  runs: Array<{ id: string; status: string }>;
  selectedRunId: string | null;
  sensitivity: Sensitivity;
  setBaselineDisabled: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function ScreenshotsToolbar({
  compareDisabled,
  copyDisabled,
  isComparePending,
  isSetBaselinePending,
  onCompare,
  onCopy,
  onOpenFolder,
  onRunChange,
  onSensitivityChange,
  onSetBaseline,
  openFolderDisabled,
  runs,
  selectedRunId,
  sensitivity,
  setBaselineDisabled,
}: ScreenshotsToolbarProps) {
  return (
    <Flex align="center" gap="md" wrap="nowrap">
      <Select
        value={selectedRunId ?? ''}
        onValueChange={(val) => onRunChange(val || null)}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a run..." />
        </SelectTrigger>
        <SelectContent>
          {runs.map((run) => (
            <SelectItem key={run.id} value={run.id}>
              {run.id.slice(0, 8)} — {run.status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
        <Button
          disabled={setBaselineDisabled || isSetBaselinePending}
          size="sm"
          variant="outline"
          onClick={onSetBaseline}
        >
          <Target className="mr-1.5 h-4 w-4" />
          Set as Baseline
        </Button>
        <Button
          disabled={compareDisabled || isComparePending}
          size="sm"
          variant="outline"
          onClick={onCompare}
        >
          <GitCompare className="mr-1.5 h-4 w-4" />
          Compare to Baseline
        </Button>
        <Select
          value={sensitivity}
          onValueChange={(val) => onSensitivityChange(val as Sensitivity)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="strict">Strict</SelectItem>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="relaxed">Relaxed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          disabled={copyDisabled}
          size="sm"
          variant="outline"
          onClick={onCopy}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          Copy
        </Button>
        <Button
          disabled={openFolderDisabled}
          size="sm"
          variant="outline"
          onClick={onOpenFolder}
        >
          <FolderOpen className="mr-1.5 h-4 w-4" />
          Open Folder
        </Button>
      </Flex>
    </Flex>
  );
}
