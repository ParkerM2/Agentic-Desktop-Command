/**
 * GreetingHeader — Time-aware greeting with current date
 */

import { useEffect, useState } from 'react';

import { Heading, Text } from '@ui';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function GreetingHeader() {
  const [greeting, setGreeting] = useState(getGreeting);
  const [date, setDate] = useState(formatDate);

  useEffect(() => {
    // Update greeting and date every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setDate(formatDate());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-6">
      <Heading as="h1">{greeting}</Heading>
      <Text className="mt-1" size="sm" variant="muted">{date}</Text>
    </div>
  );
}
