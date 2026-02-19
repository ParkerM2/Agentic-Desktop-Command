/* eslint-disable react-refresh/only-export-components -- Route config file, not a component module */
/**
 * Auth route group — Login, register, hub setup (standalone, no sidebar)
 */

import {
  type AnyRoute,
  createRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { ipc } from '@renderer/shared/lib/ipc';

import { LoginPage, RegisterPage, useAuthStore } from '@features/auth';
import { HubSetupPage } from '@features/hub-setup';

function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  }
}

async function redirectIfHubNotConfigured(): Promise<void> {
  try {
    const config = await ipc('hub.getConfig', {});
    if (!config.hubUrl) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.HUB_SETUP });
    }
  } catch (error: unknown) {
    // Re-throw redirects
    if (
      typeof error === 'object' &&
      error !== null &&
      'to' in error
    ) {
      throw error;
    }
    // IPC failure — don't block, let user proceed to login
  }
}

async function redirectIfHubAlreadyConfigured(): Promise<void> {
  try {
    const config = await ipc('hub.getConfig', {});
    if (config.hubUrl) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.LOGIN });
    }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'to' in error
    ) {
      throw error;
    }
  }
}

export function createAuthRoutes(rootRoute: AnyRoute) {
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.LOGIN,
    beforeLoad: async () => {
      redirectIfAuthenticated();
      await redirectIfHubNotConfigured();
    },
    component: LoginRouteComponent,
  });

  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.REGISTER,
    beforeLoad: async () => {
      redirectIfAuthenticated();
      await redirectIfHubNotConfigured();
    },
    component: RegisterRouteComponent,
  });

  const hubSetupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.HUB_SETUP,
    beforeLoad: async () => {
      redirectIfAuthenticated();
      await redirectIfHubAlreadyConfigured();
    },
    component: HubSetupRouteComponent,
  });

  return { loginRoute, registerRoute, hubSetupRoute };
}

// ─── Route Components (wired with navigation callbacks) ─────

function LoginRouteComponent() {
  const navigate = useNavigate();

  return (
    <LoginPage
      onNavigateToHubSetup={() => {
        void navigate({ to: ROUTES.HUB_SETUP });
      }}
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
      onNavigateToHubSetup={() => {
        void navigate({ to: ROUTES.HUB_SETUP });
      }}
      onNavigateToLogin={() => {
        void navigate({ to: ROUTES.LOGIN });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.DASHBOARD });
      }}
    />
  );
}

function HubSetupRouteComponent() {
  const navigate = useNavigate();

  return (
    <HubSetupPage
      onNavigateToLogin={() => {
        void navigate({ to: ROUTES.LOGIN });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.LOGIN });
      }}
    />
  );
}
