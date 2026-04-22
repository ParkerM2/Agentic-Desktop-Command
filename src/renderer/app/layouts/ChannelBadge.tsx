import { Badge } from '@ui';

export function ChannelBadge() {
  const channel = window.appInfo.channel;
  if (channel === 'release') return null;

  const label = channel === 'dev' ? 'DEV' : 'LOCAL';
  const variant = channel === 'dev' ? 'default' : 'secondary';

  return (
    <Badge variant={variant} className="ml-2 uppercase tracking-wide">
      {label}
    </Badge>
  );
}
