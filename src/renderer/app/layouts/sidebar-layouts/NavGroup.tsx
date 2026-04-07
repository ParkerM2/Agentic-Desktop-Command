/**
 * NavGroup — Renders a sidebar nav group in one of five styles
 *
 * Driven by the `groupStyle` prop from the layout config.
 * Each style is a small focused sub-component.
 */

import { ChevronDown } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@ui/sidebar';

import type { DevSubGroup, GroupStyle } from './layout-configs';
import type { NavItem } from './shared-nav';

// ── Props ─────────────────────────────────────────────────────

interface NavGroupProps {
  label: string;
  items: NavItem[];
  groupStyle: GroupStyle;
  showTooltips?: boolean;
  devSubGroups?: DevSubGroup[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  disabled?: boolean;
}

// ── Shared menu item renderer ─────────────────────────────────

interface MenuItemsProps {
  items: NavItem[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  disabled?: boolean;
  showTooltips?: boolean;
}

function MenuItems({ items, isActive, onNavigate, disabled, showTooltips }: MenuItemsProps) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            disabled={disabled}
            isActive={isActive(item.path)}
            tooltip={showTooltips ? item.label : undefined}
            onClick={() => onNavigate(item.path)}
          >
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

// ── Flat Group ────────────────────────────────────────────────

function FlatGroup({ label, items, isActive, onNavigate, disabled, showTooltips }: NavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <MenuItems
            disabled={disabled}
            isActive={isActive}
            items={items}
            showTooltips={showTooltips}
            onNavigate={onNavigate}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ── Collapsible Group ─────────────────────────────────────────

function CollapsibleGroup({ label, items, isActive, onNavigate, disabled, showTooltips }: NavGroupProps) {
  return (
    <Collapsible defaultOpen>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            {label}
            <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=closed]:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItems
                disabled={disabled}
                isActive={isActive}
                items={items}
                showTooltips={showTooltips}
                onNavigate={onNavigate}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// ── Nested Submenu Group ──────────────────────────────────────

function NestedSubmenuGroup({ label, items, isActive, onNavigate, disabled }: NavGroupProps) {
  return (
    <Collapsible defaultOpen>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer">
            {label}
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {disabled ? null : (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <span>Project Views</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {items.map((item) => (
                      <SidebarMenuSubItem key={item.path}>
                        <SidebarMenuSubButton
                          isActive={isActive(item.path)}
                          onClick={() => onNavigate(item.path)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// ── Tree Group ────────────────────────────────────────────────

function TreeGroup({ label, items, isActive, onNavigate, disabled }: NavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton />
            <SidebarMenuSub>
              {items.map((item) => (
                <SidebarMenuSubItem key={item.label}>
                  <SidebarMenuSubButton
                    aria-disabled={disabled}
                    className={disabled ? 'pointer-events-none opacity-50' : ''}
                    isActive={isActive(item.path)}
                    onClick={() => onNavigate(item.path)}
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
    </SidebarGroup>
  );
}

// ── Nested Categorized Group ──────────────────────────────────

function NestedCategorizedGroup({ label, items, isActive, onNavigate, disabled, devSubGroups }: NavGroupProps) {
  const groups = devSubGroups ?? [{ label, startIndex: 0, endIndex: items.length }];

  return (
    <Collapsible defaultOpen>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            {label}
            <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=closed]:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            {groups.map((group) => (
              <Collapsible key={group.label} defaultOpen>
                <div className="pl-2">
                  <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium">
                    {group.label}
                    <ChevronDown className="ml-auto size-3 transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu>
                      {items.slice(group.startIndex, group.endIndex).map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            disabled={disabled}
                            isActive={isActive(item.path)}
                            onClick={() => onNavigate(item.path)}
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
            ))}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// ── NavGroup (public) ─────────────────────────────────────────

export function NavGroup(props: NavGroupProps) {
  const { groupStyle } = props;

  switch (groupStyle) {
    case 'flat': {
      return <FlatGroup {...props} />;
    }
    case 'collapsible': {
      return <CollapsibleGroup {...props} />;
    }
    case 'nested-submenu': {
      return <NestedSubmenuGroup {...props} />;
    }
    case 'tree': {
      return <TreeGroup {...props} />;
    }
    case 'nested-categorized': {
      return <NestedCategorizedGroup {...props} />;
    }
  }
}
