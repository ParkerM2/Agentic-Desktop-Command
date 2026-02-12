/**
 * App — Root Component (~20 lines, as designed)
 *
 * Composes providers and renders the router. That's it.
 * No state, no effects, no business logic.
 */
import { RouterProvider } from '@tanstack/react-router';
import { Providers } from './providers';
import { router } from './router';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
