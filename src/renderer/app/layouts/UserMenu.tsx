/**
 * UserMenu -- Sidebar user menu with logout dropdown
 *
 * Shows the current user's avatar and display name in the sidebar footer.
 * Click opens a dropdown with user info and a logout button.
 * In collapsed mode, only the avatar is shown.
 */

import { useNavigate } from '@tanstack/react-router';
import { ChevronUp, LogOut } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui';

import { useAuthStore, useLogout } from '@features/auth';

// -- Types --

interface UserMenuProps {
  collapsed: boolean;
}

// -- Helpers --

function getInitial(displayName: string, email: string): string {
  const source = displayName.length > 0 ? displayName : email;
  return source.charAt(0).toUpperCase();
}

// -- Component --

export function UserMenu({ collapsed }: UserMenuProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const initial = getInitial(user.displayName, user.email);
  const displayLabel = user.displayName.length > 0 ? user.displayName : user.email;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: ROUTES.LOGIN });
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={collapsed ? `User menu for ${displayLabel}` : undefined}
          title={collapsed ? displayLabel : undefined}
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {/* Avatar */}
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          >
            {initial}
          </span>
          {collapsed ? null : (
            <>
              <span className="text-foreground min-w-0 flex-1 truncate text-left text-sm font-medium">
                {displayLabel}
              </span>
              <ChevronUp className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-0 group-data-[state=closed]:rotate-180" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={collapsed ? 'start' : 'end'}
        className="w-56"
        side="top"
        sideOffset={4}
      >
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="text-muted-foreground truncate text-xs font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
