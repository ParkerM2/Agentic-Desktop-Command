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
import { SETTINGS } from '@shared/ipc/settings/channels';

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

const LOCAL_SESSION_TOKEN = 'local-session';

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
    beforeLoad: () => {
      redirectIfAuthenticated();
      // Hub is optional — don't redirect to hub-setup
    },
    component: LoginRouteComponent,
  });

  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROUTES.REGISTER,
    beforeLoad: () => {
      redirectIfAuthenticated();
      // Hub is optional — don't redirect to hub-setup
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
        onSkip={() => {
          useAuthStore.getState().setAuth(
            { id: 'local', email: 'local@localhost', displayName: 'Local User', avatarUrl: null, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() },
            { accessToken: LOCAL_SESSION_TOKEN, refreshToken: LOCAL_SESSION_TOKEN, expiresIn: 0 },
          );
          useAuthStore.getState().setInitializing(false);
          // Skip onboarding for local-skip users (returning / non-new users)
          void ipc(SETTINGS.UPDATE.ALL, { onboardingCompleted: true }).then(() =>
            navigate({ to: ROUTES.DASHBOARD }),
          );
        }}
        onSuccess={() => {
          // Skip onboarding for returning users who log in
          void ipc(SETTINGS.UPDATE.ALL, { onboardingCompleted: true }).then(() =>
            navigate({ to: ROUTES.DASHBOARD }),
          );
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
        onSkip={() => {
          // Local-only mode: skip Hub, create a local session and go to dashboard
          useAuthStore.getState().setAuth(
            { id: 'local', email: 'local@localhost', displayName: 'Local User', avatarUrl: null, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() },
            { accessToken: LOCAL_SESSION_TOKEN, refreshToken: LOCAL_SESSION_TOKEN, expiresIn: 0 },
          );
          useAuthStore.getState().setInitializing(false);
          // Skip onboarding for local-skip users
          void ipc(SETTINGS.UPDATE.ALL, { onboardingCompleted: true }).then(() =>
            navigate({ to: ROUTES.DASHBOARD }),
          );
        }}
        onSuccess={() => {
          void navigate({ to: ROUTES.LOGIN });
        }}
      />
    </Suspense>
  );
}
