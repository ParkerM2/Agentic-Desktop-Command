/* eslint-disable react-refresh/only-export-components -- Route config file, not a component module */
/**
 * Auth route group — Login, register (standalone, no sidebar)
 */

import {
  type AnyRoute,
  createRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { LoginPage, RegisterPage, useAuthStore } from '@features/auth';

function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  }
}

export function createAuthRoutes(rootRoute: AnyRoute) {
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.LOGIN,
    beforeLoad: redirectIfAuthenticated,
    component: LoginRouteComponent,
  });

  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.REGISTER,
    beforeLoad: redirectIfAuthenticated,
    component: RegisterRouteComponent,
  });

  return { loginRoute, registerRoute };
}

// ─── Route Components (wired with navigation callbacks) ─────

function LoginRouteComponent() {
  const navigate = useNavigate();

  return (
    <LoginPage
      onNavigateToRegister={() => {
        void navigate({ to: ROUTES.REGISTER });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.DASHBOARD });
      }}
    />
  );
}

function RegisterRouteComponent() {
  const navigate = useNavigate();

  return (
    <RegisterPage
      onNavigateToLogin={() => {
        void navigate({ to: ROUTES.LOGIN });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.DASHBOARD });
      }}
    />
  );
}
