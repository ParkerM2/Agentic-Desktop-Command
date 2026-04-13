/**
 * EmailPanel — SMTP configuration, connection testing, and email queue management
 */

import { useState } from 'react';

import { RefreshCw, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import {
  useEmailConfig,
  useEmailQueue,
  useRemoveEmailQueued,
  useRetryEmailQueued,
  useSendTestEmail,
  useTestEmailConnection,
  useUpdateEmailConfig,
} from '../api/useEmail';

type QueueFilter = 'pending' | 'sent' | 'failed';

export function EmailPanel() {
  // 1. Hooks
  const { data: config, isLoading: configLoading } = useEmailConfig();
  const { data: queue, isLoading: queueLoading } = useEmailQueue();
  const updateConfig = useUpdateEmailConfig();
  const testConnection = useTestEmailConnection();
  const sendTestEmail = useSendTestEmail();
  const retryQueued = useRetryEmailQueued();
  const removeQueued = useRemoveEmailQueued();

  // 2. Local form state
  const [host, setHost] = useState(config === null || config === undefined ? '' : config.host);
  const [port, setPort] = useState(config === null || config === undefined ? '587' : String(config.port));
  const [user, setUser] = useState(config === null || config === undefined ? '' : config.auth.user);
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(config === null || config === undefined ? false : config.secure);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('pending');

  // 3. Derived state
  const connectionResult = testConnection.data;
  const filteredQueue = (queue ?? []).filter((item) => item.status === queueFilter);

  // 4. Handlers
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

  // 5. Render helpers
  function renderConnectionBadge() {
    if (testConnection.isPending) {
      return <Spinner size="sm" />;
    }
    if (connectionResult === undefined) return null;
    if (connectionResult.success) {
      return <Badge className="bg-green-600 text-white" variant="default">Connected</Badge>;
    }
    return <Badge variant="destructive">{connectionResult.error ?? 'Connection failed'}</Badge>;
  }

  function renderQueueItems() {
    if (queueLoading) return <Spinner size="sm" />;
    if (filteredQueue.length === 0) {
      return <Text className="text-muted-foreground py-4 text-center" size="sm">No {queueFilter} emails</Text>;
    }
    return (
      <div className="flex flex-col gap-2">
        {filteredQueue.map((item) => (
          <div
            key={item.id}
            className="border-border flex items-start justify-between rounded-md border p-3"
          >
            <div className="flex flex-col gap-1">
              <Text className="font-medium" size="sm">
                {item.email.subject}
              </Text>
              <Text className="text-muted-foreground" size="sm">
                To: {item.email.to.join(', ')}
              </Text>
              {item.error ? (
                <Text className="text-destructive text-xs" size="sm">
                  {item.error}
                </Text>
              ) : null}
            </div>
            {queueFilter === 'failed' ? (
              <div className="flex gap-2">
                <Button
                  aria-label="Retry email"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => { handleRetry(item.id); }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
                <Button
                  aria-label="Remove email"
                  size="sm"
                  type="button"
                  variant="destructive"
                  onClick={() => { handleRemove(item.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Config form */}
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email-host">Host</Label>
              <Input
                id="email-host"
                placeholder="smtp.example.com"
                value={host}
                onChange={(e) => { setHost(e.target.value); }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="email-port">Port</Label>
              <Input
                id="email-port"
                placeholder="587"
                type="number"
                value={port}
                onChange={(e) => { setPort(e.target.value); }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="email-user">Username</Label>
            <Input
              id="email-user"
              placeholder="user@example.com"
              value={user}
              onChange={(e) => { setUser(e.target.value); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="email-password">Password</Label>
            <Input
              id="email-password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={secure}
              id="email-tls"
              onCheckedChange={setSecure}
            />
            <Label htmlFor="email-tls">Use TLS</Label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              disabled={updateConfig.isPending}
              type="button"
              onClick={handleSaveConfig}
            >
              {updateConfig.isPending ? <Spinner size="sm" /> : null}
              Save Config
            </Button>
            <Button
              disabled={testConnection.isPending}
              type="button"
              variant="outline"
              onClick={handleTestConnection}
            >
              Test Connection
            </Button>
            <Button
              disabled={sendTestEmail.isPending}
              type="button"
              variant="secondary"
              onClick={handleSendTestEmail}
            >
              Send Test Email
            </Button>
            {renderConnectionBadge()}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Queue section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={queueFilter}
            onValueChange={(v) => { setQueueFilter(v as QueueFilter); }}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
              {renderQueueItems()}
            </TabsContent>
            <TabsContent value="sent">
              {renderQueueItems()}
            </TabsContent>
            <TabsContent value="failed">
              {renderQueueItems()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
