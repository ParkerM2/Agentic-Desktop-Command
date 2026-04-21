/**
 * useSlackActionModal — Logic hook for SlackActionModal
 */

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { useMcpToolCall } from '../../api/useMcpTool';

export type SlackActionType = 'send_message' | 'read_channel' | 'search' | 'set_status';

export interface SlackFormState {
  channel: string;
  text: string;
  query: string;
  statusText: string;
  statusEmoji: string;
}

export function useSlackActionModal(actionType: SlackActionType | null) {
  const [form, setForm] = useState<SlackFormState>({
    channel: '',
    text: '',
    query: '',
    statusText: '',
    statusEmoji: ':house:',
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpCall = useMcpToolCall();

  function handleInputChange(
    field: keyof SlackFormState,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setResult(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!actionType) return;

    setError(null);
    setResult(null);

    try {
      let toolName: string;
      let args: Record<string, unknown>;

      switch (actionType) {
        case 'send_message':
          toolName = 'slack_send_message';
          args = { channel: form.channel, text: form.text };
          break;
        case 'read_channel':
          toolName = 'slack_read_channel';
          args = { channel: form.channel, limit: 20 };
          break;
        case 'search':
          toolName = 'slack_search';
          args = { query: form.query, count: 20 };
          break;
        case 'set_status':
          toolName = 'slack_set_status';
          args = { text: form.statusText, emoji: form.statusEmoji };
          break;
        default:
          return;
      }

      const response = await mcpCall.mutateAsync({
        server: 'slack',
        tool: toolName,
        args,
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
    result,
    error,
    mcpCall,
    handleInputChange,
    handleSubmit,
  };
}
