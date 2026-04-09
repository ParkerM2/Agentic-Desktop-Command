type DomainChannels<D extends string, M extends Record<string, readonly string[]>> = {
  [V in keyof M & string]: {
    [N in M[V][number] & string as Uppercase<N>]: `${D}.${Lowercase<V>}.${N}`;
  };
};

type EventChannels<D extends string, M extends Record<string, readonly string[]>> = {
  [V in keyof M & string]: {
    [N in M[V][number] & string as Uppercase<N>]: `event:${D}.${Lowercase<V>}.${N}`;
  };
};

export function domain<D extends string, M extends Record<string, readonly string[]>>(
  d: D,
  map: M,
): DomainChannels<D, M> {
  const result: Record<string, Record<string, string>> = {};
  for (const [verb, nouns] of Object.entries(map)) {
    const group: Record<string, string> = {};
    for (const noun of nouns as readonly string[]) {
      group[noun.toUpperCase()] = `${d}.${verb.toLowerCase()}.${noun}`;
    }
    result[verb] = group;
  }
  return result as DomainChannels<D, M>;
}

export function events<D extends string, M extends Record<string, readonly string[]>>(
  d: D,
  map: M,
): EventChannels<D, M> {
  const result: Record<string, Record<string, string>> = {};
  for (const [verb, nouns] of Object.entries(map)) {
    const group: Record<string, string> = {};
    for (const noun of nouns as readonly string[]) {
      group[noun.toUpperCase()] = `event:${d}.${verb.toLowerCase()}.${noun}`;
    }
    result[verb] = group;
  }
  return result as EventChannels<D, M>;
}
