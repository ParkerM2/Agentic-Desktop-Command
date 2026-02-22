/** SidebarLayout09 — Nested: Collapsible nested sidebars with wider default width */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';

import { projectViewPath } from '@shared/constants';

import { HubConnectionIndicator } from '@renderer/shared/components/HubConnectionIndicator';
import { useLayoutStore } from '@renderer/shared/stores';

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
  settingsItem,
} from './shared-nav';

const codeItems = developmentItems.slice(0, 3);
const planItems = developmentItems.slice(3, 6);
const trackItems = developmentItems.slice(6, 9);

export function SidebarLayout09() {
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
    <Sidebar className="w-[350px]">
      <SidebarHeader>
        <span className="text-lg font-bold tracking-tight">ADC</span>
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
                <Collapsible defaultOpen>
                  <div className="pl-2">
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      Code
                      <ChevronDown className="ml-auto size-3 transition-transform group-data-[state=closed]:-rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
                        {codeItems.map((item) => (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                              disabled={activeProjectId === null}
                              isActive={isDevActive(item.path)}
                              onClick={() => handleDevNav(item.path)}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible defaultOpen>
                  <div className="pl-2">
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      Plan
                      <ChevronDown className="ml-auto size-3 transition-transform group-data-[state=closed]:-rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
                        {planItems.map((item) => (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                              disabled={activeProjectId === null}
                              isActive={isDevActive(item.path)}
                              onClick={() => handleDevNav(item.path)}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible defaultOpen>
                  <div className="pl-2">
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      Track
                      <ChevronDown className="ml-auto size-3 transition-transform group-data-[state=closed]:-rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
                        {trackItems.map((item) => (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                              disabled={activeProjectId === null}
                              isActive={isDevActive(item.path)}
                              onClick={() => handleDevNav(item.path)}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
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
