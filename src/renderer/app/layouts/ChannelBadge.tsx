import { Badge } from '@ui';

export function ChannelBadge() {
  const { channel } = window.appInfo;
  if (channel === 'release') return null;

  const label = channel === 'dev' ? 'DEV' : 'LOCAL';
  const variant = channel === 'dev' ? 'default' : 'secondary';

  return (
    <Badge className="ml-2 uppercase tracking-wide" variant={variant}>
      {label}
    </Badge>
  );
}
