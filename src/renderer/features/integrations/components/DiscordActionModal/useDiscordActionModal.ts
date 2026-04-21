/**
 * useDiscordActionModal — Logic hook for DiscordActionModal
 */

import { useModalToolAction } from '../../hooks/useModalToolAction';

export type DiscordActionType = 'send_message' | 'call_user' | 'list_servers' | 'set_status';

export interface DiscordFormState {
  channelId: string;
  content: string;
  userId: string;
  status: string;
  activityName: string;
}

export function useDiscordActionModal(actionType: DiscordActionType | null) {
  const {
    form,
    result,
    error,
    mcpCall,
    handleInputChange,
    updateField,
    handleSubmit: submitTool,
  } = useModalToolAction<DiscordFormState>({
    channelId: '',
    content: '',
    userId: '',
    status: 'online',
    activityName: '',
  });

  function handleStatusChange(value: string): void {
    updateField('status', value);
  }

  async function handleSubmit(): Promise<void> {
    if (!actionType) return;

    await submitTool((f) => {
      switch (actionType) {
        case 'send_message':
          return { server: 'discord', tool: 'discord_send_message', args: { channelId: f.channelId, content: f.content } };
        case 'call_user':
          return { server: 'discord', tool: 'discord_call_user', args: { userId: f.userId } };
        case 'list_servers':
          return { server: 'discord', tool: 'discord_list_servers', args: {} };
        case 'set_status':
          return {
            server: 'discord',
            tool: 'discord_set_status',
            args: { status: f.status, activityName: f.activityName.length > 0 ? f.activityName : undefined },
          };
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
    handleStatusChange,
    handleSubmit,
  };
}
