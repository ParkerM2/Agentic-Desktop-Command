import { useState } from 'react';

import type { AssertMethod } from '@shared/types/test-suite';

import { useSaveScript } from '../../api/useSaveScript';
import { generateAssertionSuggestions, type AssertionSuggestion } from '../../lib/assertion-suggestions';
import { generateSpecPreview } from '../../lib/generate-spec-preview';
import { useTestSuiteStore } from '../../test-suite-store';

import type { RecordedStep } from '../../test-suite-store';

interface UseSaveRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  steps: RecordedStep[];
  projectId: string;
  testDirectory?: string;
}

export function useSaveRecordingDialog({
  onOpenChange,
  defaultName,
  steps,
  projectId,
}: UseSaveRecordingDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [testDir, setTestDir] = useState('tests');
  const [suggestions, setSuggestions] = useState<AssertionSuggestion[]>(() =>
    generateAssertionSuggestions(steps),
  );
  const [showAddAssertion, setShowAddAssertion] = useState(false);
  const [newSelector, setNewSelector] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newMethod, setNewMethod] = useState<AssertMethod>('toHaveText');
  const [newAttribute, setNewAttribute] = useState('');
  const saveScript = useSaveScript(projectId);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const saving = saveScript.isPending;

  const specPreview = generateSpecPreview({
    name: name || 'Untitled',
    steps: steps.map((s) => s.step),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const assertSteps = suggestions
      .filter((s) => s.accepted)
      .map((s) => ({
        type: 'assert' as const,
        selector: s.selector || 'body',
        expected: s.expected,
        assertMethod: s.assertMethod,
        ...(s.attribute ? { attribute: s.attribute } : {}),
      }));

    const allSteps = [...steps.map((s) => s.step), ...assertSteps];

    saveScript.mutate(
      {
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        steps: allSteps,
        tags,
      },
      {
        onSuccess: () => {
          clearSteps();
          onOpenChange(false);
        },
        onError: (err) => {
          console.error('[SaveRecordingDialog] save failed:', err);
          onOpenChange(false);
        },
      },
    );
  };

  const toggleSuggestionAccepted = (index: number, checked: boolean | 'indeterminate') => {
    const next = [...suggestions];
    next[index] = { ...next[index], accepted: checked === true };
    setSuggestions(next);
  };

  const updateSuggestionSelector = (index: number, value: string) => {
    const next = [...suggestions];
    next[index] = { ...next[index], selector: value };
    setSuggestions(next);
  };

  const updateSuggestionExpected = (index: number, value: string) => {
    const next = [...suggestions];
    next[index] = { ...next[index], expected: value };
    setSuggestions(next);
  };

  const handleAddAssertion = () => {
    let desc = `Verify ${newSelector} ${newMethod} "${newExpected}"`;
    if (newMethod === 'toBeVisible') desc = `Verify ${newSelector} is visible`;
    if (newMethod === 'toBeHidden') desc = `Verify ${newSelector} is hidden`;
    setSuggestions((prev) => [...prev, {
      selector: newSelector,
      expected: newExpected,
      assertMethod: newMethod,
      attribute: newAttribute || undefined,
      description: desc,
      accepted: true,
    }]);
    setNewSelector('');
    setNewExpected('');
    setNewAttribute('');
    setShowAddAssertion(false);
  };

  return {
    name,
    setName,
    description,
    setDescription,
    tagsInput,
    setTagsInput,
    testDir,
    setTestDir,
    suggestions,
    showAddAssertion,
    setShowAddAssertion,
    newSelector,
    setNewSelector,
    newExpected,
    setNewExpected,
    newMethod,
    setNewMethod,
    newAttribute,
    setNewAttribute,
    saving,
    specPreview,
    handleSave,
    toggleSuggestionAccepted,
    updateSuggestionSelector,
    updateSuggestionExpected,
    handleAddAssertion,
  };
}
