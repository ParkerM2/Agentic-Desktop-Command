/** SidebarLayout16 — Sticky Header: Sidebar with persistent non-scrolling header and collapsible sections */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';

import { projectViewPath } from '@shared/constants';

import { useLayoutStore } from '@renderer/shared/stores';

import { SidebarAssistantButton } from '@features/assistant';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui/collapsible';
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
  developmentItems,
  personalItems,
} from './shared-nav';


export function SidebarLayout16() {
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
        <UserMenu collapsed={!open} />
      </SidebarHeader>

      <SidebarContent>
        <Collapsible defaultOpen>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Development
                <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                     />
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Personal
                <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <SidebarAssistantButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
