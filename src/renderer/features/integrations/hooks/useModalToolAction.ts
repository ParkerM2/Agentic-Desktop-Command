/**
 * useModalToolAction — shared MCP tool execution pattern for action modals.
 *
 * Extracts the form state, result/error tracking, input change handler, and
 * submit-via-mcpCall logic duplicated in DiscordActionModal and SlackActionModal.
 */

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { useMcpToolCall } from '../api/useMcpTool';

interface ToolCall {
  server: string;
  tool: string;
  args: Record<string, unknown>;
}

export function useModalToolAction<TForm extends object>(initialForm: TForm) {
  const [form, setForm] = useState<TForm>(initialForm);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpCall = useMcpToolCall();

  function handleInputChange(
    field: keyof TForm,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setResult(null);
  }

  function updateField<K extends keyof TForm>(field: K, value: TForm[K]): void {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setResult(null);
  }

  async function handleSubmit(buildCall: (form: TForm) => ToolCall | null): Promise<void> {
    const call = buildCall(form);
    if (!call) return;

    setError(null);
    setResult(null);

    try {
      const response = await mcpCall.mutateAsync({
        server: call.server,
        tool: call.tool,
        args: call.args,
      });

      if (response.isError) {
        const errorText = response.content[0]?.text ?? 'Unknown error';
        setError(errorText);
      } else {
        const resultText = response.content[0]?.text ?? 'Success';
        setResult(resultText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }

  return {
    form,
    setForm,
    result,
    error,
    mcpCall,
    handleInputChange,
    updateField,
    handleSubmit,
  };
}
