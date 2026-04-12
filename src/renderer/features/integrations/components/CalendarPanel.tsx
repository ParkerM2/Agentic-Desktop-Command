/**
 * CalendarPanel — Calendar integration placeholder
 *
 * Displayed when no calendar service is connected.
 * Guides the user to Settings to configure a calendar integration.
 */

import { useNavigate } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';

import { Button, EmptyState } from '@ui';

export function CalendarPanel() {
  const navigate = useNavigate();

  function handleConnect(): void {
    void navigate({ to: '/settings' });
  }

  return (
    <EmptyState
      description="Connect a calendar service in Settings to view and manage your events here."
      icon={Calendar}
      title="No Calendar Connected"
    >
      <Button type="button" variant="outline" onClick={handleConnect}>
        Go to Settings
      </Button>
    </EmptyState>
  );
}
