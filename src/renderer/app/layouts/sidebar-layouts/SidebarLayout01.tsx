/** SidebarLayout01 — Grouped: Simple sidebar with labeled section groups */

import { useNavigate, useRouterState } from '@tanstack/react-router';

import { projectViewPath } from '@shared/constants';

import { HubConnectionIndicator } from '@renderer/shared/components/HubConnectionIndicator';
import { useLayoutStore } from '@renderer/shared/stores';

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

import {
  addProjectItem,
  developmentItems,
  personalItems,
  settingsItem,
} from './shared-nav';

export function SidebarLayout01() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { activeProjectId, addProjectTab } = useLayoutStore();
  const { open } = useSidebar();
  const currentPath = routerState.location.pathname;

  const urlProjectId = /^\/projects\/([^/]+)/.exec(currentPath)?.[1] ?? null;
  if (urlProjectId !== null && urlProjectId !== activeProjectId) {
    addProjectTab(urlProjectId);
  }

  function isPersonalActive(path: string): boolean {
    return currentPath === path || currentPath.startsWith(`${path}/`);
  }

  function isDevActive(path: string): boolean {
    return activeProjectId !== null && currentPath.endsWith(`/${path}`);
  }

  function handlePersonalNav(path: string) {
    void navigate({ to: path });
  }

  function handleDevNav(path: string) {
    if (activeProjectId === null) return;
    void navigate({ to: projectViewPath(activeProjectId, path) });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
          ADC
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Development</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPersonalActive(addProjectItem.path)}
                  tooltip={addProjectItem.label}
                  onClick={() => handlePersonalNav(addProjectItem.path)}
                >
                  <addProjectItem.icon />
                  <span>{addProjectItem.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {developmentItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    disabled={activeProjectId === null}
                    isActive={isDevActive(item.path)}
                    tooltip={item.label}
                    onClick={() => handleDevNav(item.path)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Personal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={isPersonalActive(item.path)}
                    tooltip={item.label}
                    onClick={() => handlePersonalNav(item.path)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu collapsed={!open} />
        <HubConnectionIndicator collapsed={!open} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isPersonalActive(settingsItem.path)}
              tooltip={settingsItem.label}
              onClick={() => handlePersonalNav(settingsItem.path)}
            >
              <settingsItem.icon />
              <span>{settingsItem.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
