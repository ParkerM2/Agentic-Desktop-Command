import { useEffect, useState } from 'react';

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

export function useGreetingHeader() {
  const [greeting, setGreeting] = useState(getGreeting);
  const [date, setDate] = useState(formatDate);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setDate(formatDate());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return { greeting, date };
}
