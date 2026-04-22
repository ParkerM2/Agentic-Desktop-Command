/**
 * useEmailPanel — Logic hook for EmailPanel
 */

import { useState } from 'react';

import {
  useEmailConfig,
  useEmailQueue,
  useRemoveEmailQueued,
  useRetryEmailQueued,
  useSendTestEmail,
  useTestEmailConnection,
  useUpdateEmailConfig,
} from '../../api/useEmail';

export type QueueFilter = 'pending' | 'sent' | 'failed';

export function useEmailPanel() {
  const { data: config, isLoading: configLoading } = useEmailConfig();
  const { data: queue, isLoading: queueLoading } = useEmailQueue();
  const updateConfig = useUpdateEmailConfig();
  const testConnection = useTestEmailConnection();
  const sendTestEmail = useSendTestEmail();
  const retryQueued = useRetryEmailQueued();
  const removeQueued = useRemoveEmailQueued();

  const [host, setHost] = useState(config === null || config === undefined ? '' : config.host);
  const [port, setPort] = useState(config === null || config === undefined ? '587' : String(config.port));
  const [user, setUser] = useState(config === null || config === undefined ? '' : config.auth.user);
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(config === null || config === undefined ? false : config.secure);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('pending');

  const connectionResult = testConnection.data;
  const filteredQueue = (queue ?? []).filter((item) => item.status === queueFilter);

  function handleSaveConfig(): void {
    updateConfig.mutate({
      host,
      port: parseInt(port, 10),
      secure,
      auth: { user, pass: password },
      from: user,
    });
  }

  function handleTestConnection(): void {
    testConnection.mutate();
  }

  function handleSendTestEmail(): void {
    sendTestEmail.mutate({
      to: [user],
      subject: 'ADC Test Email',
      body: 'This is a test email from Agent Desktop Command.',
    });
  }

  function handleRetry(emailId: string): void {
    retryQueued.mutate({ emailId });
  }

  function handleRemove(emailId: string): void {
    removeQueued.mutate({ emailId });
  }

  return {
    configLoading,
    queueLoading,
    updateConfig,
    testConnection,
    sendTestEmail,
    connectionResult,
    filteredQueue,
    host,
    setHost,
    port,
    setPort,
    user,
    setUser,
    password,
    setPassword,
    secure,
    setSecure,
    queueFilter,
    setQueueFilter,
    handleSaveConfig,
    handleTestConnection,
    handleSendTestEmail,
    handleRetry,
    handleRemove,
  };
}
