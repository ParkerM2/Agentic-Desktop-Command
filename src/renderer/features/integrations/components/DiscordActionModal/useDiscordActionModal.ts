/**
 * useDiscordActionModal — Logic hook for DiscordActionModal
 */

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { useMcpToolCall } from '../../api/useMcpTool';

export type DiscordActionType = 'send_message' | 'call_user' | 'list_servers' | 'set_status';

type DiscordStatus = 'online' | 'dnd' | 'idle' | 'invisible';

export interface DiscordFormState {
  channelId: string;
  content: string;
  userId: string;
  status: DiscordStatus;
  activityName: string;
}

export function useDiscordActionModal(actionType: DiscordActionType | null) {
  const [form, setForm] = useState<DiscordFormState>({
    channelId: '',
    content: '',
    userId: '',
    status: 'online',
    activityName: '',
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpCall = useMcpToolCall();

  function handleInputChange(
    field: keyof DiscordFormState,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setResult(null);
  }

  function handleStatusChange(value: string): void {
    setForm((prev) => ({ ...prev, status: value as DiscordStatus }));
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
          toolName = 'discord_send_message';
          args = { channelId: form.channelId, content: form.content };
          break;
        case 'call_user':
          toolName = 'discord_call_user';
          args = { userId: form.userId };
          break;
        case 'list_servers':
          toolName = 'discord_list_servers';
          args = {};
          break;
        case 'set_status':
          toolName = 'discord_set_status';
          args = {
            status: form.status,
            activityName: form.activityName.length > 0 ? form.activityName : undefined,
          };
          break;
        default:
          return;
      }

      const response = await mcpCall.mutateAsync({
        server: 'discord',
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
    handleStatusChange,
    handleSubmit,
  };
}
