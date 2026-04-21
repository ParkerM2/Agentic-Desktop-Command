/**
 * useSlackActionModal — Logic hook for SlackActionModal
 */

import { useModalToolAction } from '../../hooks/useModalToolAction';

export type SlackActionType = 'send_message' | 'read_channel' | 'search' | 'set_status';

export interface SlackFormState {
  channel: string;
  text: string;
  query: string;
  statusText: string;
  statusEmoji: string;
}

export function useSlackActionModal(actionType: SlackActionType | null) {
  const {
    form,
    result,
    error,
    mcpCall,
    handleInputChange,
    handleSubmit: submitTool,
  } = useModalToolAction<SlackFormState>({
    channel: '',
    text: '',
    query: '',
    statusText: '',
    statusEmoji: ':house:',
  });

  async function handleSubmit(): Promise<void> {
    if (!actionType) return;

    await submitTool((f) => {
      switch (actionType) {
        case 'send_message':
          return { server: 'slack', tool: 'slack_send_message', args: { channel: f.channel, text: f.text } };
        case 'read_channel':
          return { server: 'slack', tool: 'slack_read_channel', args: { channel: f.channel, limit: 20 } };
        case 'search':
          return { server: 'slack', tool: 'slack_search', args: { query: f.query, count: 20 } };
        case 'set_status':
          return { server: 'slack', tool: 'slack_set_status', args: { text: f.statusText, emoji: f.statusEmoji } };
        default:
          return null;
      }
    });
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
