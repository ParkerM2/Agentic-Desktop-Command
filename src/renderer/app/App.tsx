/**
 * App — Root component (~20 lines, as promised)
 *
 * Composes providers and renders the router. That's it.
 */

import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
