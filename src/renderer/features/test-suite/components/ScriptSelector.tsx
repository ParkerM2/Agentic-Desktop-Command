/**
 * ScriptSelector — Dropdown to select a saved QA script
 */

import { FileSearch } from 'lucide-react';

import {
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ui';

import { useScripts } from '../api/useScripts';
import { useTestSuiteStore } from '../store';

export function ScriptSelector() {
  const { data: scripts, isLoading } = useScripts();
  const selectedScriptId = useTestSuiteStore((s) => s.selectedScriptId);
  const selectScript = useTestSuiteStore((s) => s.selectScript);

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  if (!scripts || scripts.length === 0) {
    return (
      <EmptyState
        data-testid="script-selector-empty"
        description="Record and save a QA script to get started"
        icon={FileSearch}
        title="No scripts saved"
      />
    );
  }

  return (
    <Select
      value={selectedScriptId ?? ''}
      onValueChange={(value) => selectScript(value || null)}
    >
      <SelectTrigger className="w-full max-w-xs" data-testid="script-selector-trigger">
        <SelectValue placeholder="Select a script..." />
      </SelectTrigger>
      <SelectContent>
        {scripts.map((script) => (
          <SelectItem key={script.id} value={script.id}>
            {script.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
