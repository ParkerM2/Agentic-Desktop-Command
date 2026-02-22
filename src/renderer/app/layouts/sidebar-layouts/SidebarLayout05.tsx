/** SidebarLayout05 — Collapsible Submenus with search input */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import { ChevronDown, Settings } from 'lucide-react';

import { projectViewPath } from '@shared/constants';

import { HubConnectionIndicator } from '@renderer/shared/components/HubConnectionIndicator';
import { useLayoutStore } from '@renderer/shared/stores';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

export function SidebarLayout05() {
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <span className="text-foreground px-2 text-sm font-semibold">ADC</span>
        <SidebarInput placeholder="Search..." />
      </SidebarHeader>

      <SidebarContent>
        <Collapsible defaultOpen>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer">
                Development
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isPersonalActive(addProjectItem.path)}
                      onClick={() => handlePersonalNav(addProjectItem.path)}
                    >
                      <addProjectItem.icon />
                      <span>{addProjectItem.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>Project Views</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {developmentItems.map((item) => (
                        <SidebarMenuSubItem key={item.path}>
                          <SidebarMenuSubButton
                            isActive={isDevActive(item.path)}
                            onClick={() => handleDevNav(item.path)}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer">
                Personal
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {personalItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isPersonalActive(item.path)}
                        onClick={() => handlePersonalNav(item.path)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu collapsed={!open} />
        <HubConnectionIndicator collapsed={!open} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isPersonalActive(settingsItem.path)}
              onClick={() => handlePersonalNav(settingsItem.path)}
            >
              <Settings />
              <span>{settingsItem.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
