/* eslint-disable react-refresh/only-export-components -- Route config file, not a component module */
/**
 * Auth route group — Login, register, hub setup (standalone, no sidebar)
 */

import { Suspense } from 'react';

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
  useNavigate,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';
import { HUB } from '@shared/ipc/hub/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useAuthStore } from '@features/auth';

import { Spinner } from '@ui/spinner';

function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  }
}

async function redirectIfHubNotConfigured(): Promise<void> {
  try {
    const config = await ipc(HUB.GET.CONFIG, {});
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
    const config = await ipc(HUB.GET.CONFIG, {});
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

// ─── Lazy Page Components ─────────────────────────────────────

const LazyLoginPage = lazyRouteComponent(
  () => import('@features/auth'),
  'LoginPage',
);

const LazyRegisterPage = lazyRouteComponent(
  () => import('@features/auth'),
  'RegisterPage',
);

const LazyHubSetupPage = lazyRouteComponent(
  () => import('@features/hub-setup'),
  'HubSetupPage',
);

// ─── Auth Suspense Fallback ───────────────────────────────────

function AuthPendingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner aria-label="Loading" size="lg" />
    </div>
  );
}

// ─── Route Factory ────────────────────────────────────────────

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
    <Suspense fallback={<AuthPendingFallback />}>
      <LazyLoginPage
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
    </Suspense>
  );
}

function RegisterRouteComponent() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<AuthPendingFallback />}>
      <LazyRegisterPage
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
    </Suspense>
  );
}

function HubSetupRouteComponent() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<AuthPendingFallback />}>
      <LazyHubSetupPage
        onNavigateToLogin={() => {
          void navigate({ to: ROUTES.LOGIN });
        }}
        onSuccess={() => {
          void navigate({ to: ROUTES.LOGIN });
        }}
      />
    </Suspense>
  );
}
