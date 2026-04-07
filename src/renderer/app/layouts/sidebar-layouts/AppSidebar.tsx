/**
 * AppSidebar — Single compositional sidebar component
 *
 * Replaces 16 separate SidebarLayoutXX files. Reads the active layout
 * config and composes the sidebar accordingly. All nav logic is shared.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router';

import { projectViewPath } from '@shared/constants';

import { useLayoutStore } from '@renderer/shared/stores';

import { SidebarAssistantButton } from '@features/assistant';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@ui/sidebar';

import { UserMenu } from '../UserMenu';

import { LAYOUT_CONFIGS } from './layout-configs';
import { NavGroup } from './NavGroup';
import {
  developmentItems,
  personalItems,
} from './shared-nav';

export function AppSidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { activeProjectId, addProjectTab, sidebarLayout } = useLayoutStore();
  const { open } = useSidebar();
  const currentPath = routerState.location.pathname;
  const config = LAYOUT_CONFIGS[sidebarLayout];

  // Sync URL project ID to layout store
  const urlProjectId = /^\/projects\/([^/]+)/.exec(currentPath)?.[1] ?? null;
  if (urlProjectId !== null && urlProjectId !== activeProjectId) {
    addProjectTab(urlProjectId);
  }

  // ── Active-state checkers ─────────────────────────────────

  function isPersonalActive(path: string): boolean {
    return currentPath === path || currentPath.startsWith(`${path}/`);
  }

  function isDevActive(path: string): boolean {
    return activeProjectId !== null && currentPath.endsWith(`/${path}`);
  }

  // ── Navigation handlers ───────────────────────────────────

  function handlePersonalNav(path: string) {
    void navigate({ to: path });
  }

  function handleDevNav(path: string) {
    if (activeProjectId === null) return;
    void navigate({ to: projectViewPath(activeProjectId, path) });
  }

  // ── Render ────────────────────────────────────────────────

  const sidebarContent = (
    <Sidebar
      className={config.className}
      collapsible={config.collapsible ?? 'icon'}
      side={config.side ?? 'left'}
      variant={config.variant}
    >
      <SidebarHeader>
        <UserMenu collapsed={!open} />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup
          devSubGroups={config.devSubGroups}
          disabled={activeProjectId === null}
          groupStyle={config.groupStyle}
          isActive={isDevActive}
          items={developmentItems}
          label="Development"
          showTooltips={config.showTooltips}
          onNavigate={handleDevNav}
        />
        <NavGroup
          groupStyle={config.groupStyle}
          isActive={isPersonalActive}
          items={personalItems}
          label="Personal"
          showTooltips={config.showTooltips}
          onNavigate={handlePersonalNav}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarAssistantButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );

  // Dual sidebar (Layout 15)
  if (config.dualSidebar) {
    return (
      <>
        {sidebarContent}
        <Sidebar
          side={config.dualSidebar.rightSide ?? 'right'}
          variant={config.dualSidebar.rightVariant}
        >
          <SidebarHeader>
            <UserMenu collapsed={!open} />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />
        </Sidebar>
      </>
    );
  }

  return sidebarContent;
}
