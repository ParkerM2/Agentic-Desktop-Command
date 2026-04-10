/**
 * Proxy-based lazy service initialization utility.
 *
 * Defers service construction until the first property access. The factory
 * is called at most once — subsequent accesses reuse the memoized instance.
 * Errors from the factory are NOT cached; a failing factory will be retried
 * on the next property access.
 */

/**
 * Resolves the current instance, calling the factory if not yet initialized.
 * Returned as a narrowed `T` so callers can use it without null assertions.
 */
function resolve<T extends object>(
  state: { instance: T | null; initialized: boolean },
  factory: () => T,
): T {
  if (!state.initialized) {
    // Factory errors propagate — initialized stays false so the next
    // access will retry the factory (errors are not cached).
    state.instance = factory();
    state.initialized = true;
  }
  // At this point initialized is true, so instance is always T.
  // We use a runtime guard to satisfy the type checker without banned assertions.
  const inst = state.instance;
  if (inst === null) throw new Error('[lazyService] invariant violated: instance is null after init');
  return inst;
}

/**
 * Wrap a service factory in a Proxy that defers construction until first use.
 *
 * @param factory - Zero-arg function that constructs the service instance.
 * @returns A typed Proxy that behaves identically to the constructed service,
 *          but delays construction until the first property or method access.
 *
 * @example
 * const db = lazyService(() => initDatabase(dataDir));
 * // initDatabase is NOT called yet
 * db.query('SELECT 1'); // initDatabase is called here, result is memoized
 * db.query('SELECT 2'); // reuses the existing instance
 */
export function lazyService<T extends object>(factory: () => T): T {
  const state: { instance: T | null; initialized: boolean } = {
    instance: null,
    initialized: false,
  };

  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      return Reflect.get(resolve(state, factory), prop);
    },
    has(_, prop: string | symbol) {
      return Reflect.has(resolve(state, factory), prop);
    },
  });
}
