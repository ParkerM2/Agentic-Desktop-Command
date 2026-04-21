/**
 * GreetingHeader — Time-aware greeting with current date
 */

import { Heading, Text } from '@ui';

import { useGreetingHeader } from './useGreetingHeader';

export function GreetingHeader() {
  const { greeting, date } = useGreetingHeader();

  return (
    <div className="mb-6">
      <Heading as="h1">{greeting}</Heading>
      <Text className="mt-1" size="sm" variant="muted">{date}</Text>
    </div>
  );
}
