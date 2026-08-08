"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: LucideIcon;
  href?: string;
  children?: NavItem[];
  /** Any-of permissions required to see this item. Admin and `/system` bypass via canAccessAdmin. */
  permissions?: string[];
};

function routeMatches(pathname: string, href?: string, exact = false, allItems: NavItem[] = []): boolean {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  if (exact || pathname === href) return pathname === href;
  
  if (!pathname.startsWith(href + "/")) return false;

  // If another item in allItems has a longer/more specific matching href, return false
  for (const item of allItems) {
    if (item.href && item.href !== href && item.href.length > href.length) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return false;
      }
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.href && child.href !== href && child.href.length > href.length) {
          if (pathname === child.href || pathname.startsWith(child.href + "/")) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function anyChildMatches(pathname: string, children?: NavItem[]): boolean {
  if (!children) return false;
  return children.some(
    (child) =>
      routeMatches(pathname, child.href, true) ||
      anyChildMatches(pathname, child.children)
  );
}


export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [activeParent, setActiveParent] = React.useState<string | null>(
    items.find((i) => !i.isSection)?.title || null
  );
  const [activeChild, setActiveChild] = React.useState<string | null>(null);

  // Sync activeParent with current route
  React.useEffect(() => {
    // Check top-level items without children
    const matchingItem = items.find(
      (item) => !item.isSection && !item.children && item.href && routeMatches(pathname, item.href, false, items)
    );
    if (matchingItem?.title && matchingItem.title !== activeParent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveParent(matchingItem.title);
      setActiveChild(null);
      return;
    }

    // Check children of items with children
    for (const item of items) {
      if (item.children) {
        const matchingChild = item.children.find(
          (child) => child.href && routeMatches(pathname, child.href, true, items)
        );
        if (matchingChild?.title) {
          if (item.title !== activeParent) {
            setActiveParent(item.title!);
          }
          if (matchingChild.title !== activeChild) {
            setActiveChild(matchingChild.title);
          }
          return;
        }
      }
    }
    // Only sync on pathname changes, not when activeParent changes (that would be circular)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {items.map((item, index) => (
        <NavMainItem
          key={`${item.isSection ? 'section' : 'item'}-${item.title || item.label || index}`}
          item={item}
          allItems={items}
          pathname={pathname}
          activeParent={activeParent}
          setActiveParent={setActiveParent}
          activeChild={activeChild}
          setActiveChild={setActiveChild}
        />
      ))}
    </>
  );
}

function NavMainItem({
  item,
  allItems,
  pathname,
  activeParent,
  setActiveParent,
  activeChild,
  setActiveChild,
}: {
  item: NavItem;
  allItems: NavItem[];
  pathname: string;
  activeParent: string | null;
  activeChild: string | null;
  setActiveParent: (val: string) => void;
  setActiveChild: (val: string | null) => void;
}) {
  const hasChildren = !!item.children?.length;
  const isParentActive =
    hasChildren
      ? anyChildMatches(pathname, item.children)
      : routeMatches(pathname, item.href, false, allItems);

  const [isOpen, setIsOpen] = React.useState(isParentActive);

  // Sync open state when activeParent or route changes
  React.useEffect(() => {
    if (isParentActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [isParentActive]);

  // Section label
  if (item.isSection && item.label) {
    return (
      <SidebarGroup className="p-0 pt-5 first:pt-0">
        <SidebarGroupLabel className="p-0 text-xs font-medium uppercase text-sidebar-foreground">
          {item.label}
        </SidebarGroupLabel>
      </SidebarGroup>
    );
  }

  // Item with children → collapsible
  if (hasChildren && item.title) {
    return (
      <SidebarGroup className="p-0">
        <SidebarMenu>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger
                className="w-full"
                render={
                  <SidebarMenuButton
                    id={`nav-main-trigger-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    tooltip={item.title}
                    isActive={isParentActive}
                    onClick={() => setActiveParent(item.title!)}
                    className={cn(
                      "rounded-md text-sm font-medium px-3 py-2 h-9 transition-colors cursor-pointer",
                      isParentActive ? "bg-primary! text-primary-foreground!" : ""
                    )}
                  >
                    {item.icon && <item.icon size={16} />}
                    <span>{item.title}</span>
                    <ChevronRight
                      className={cn(
                        "ml-auto transition-transform duration-200",
                        isOpen && "rotate-90"
                      )}
                    />
                  </SidebarMenuButton>
                }
              />
              <CollapsibleContent>
                <SidebarMenuSub className="me-0 pe-0">
                  {item.children!.map((child, index) => (
                    <NavMainSubItem
                      key={child.title || index}
                      item={child}
                      pathname={pathname}
                      activeParent={activeParent}
                      setActiveParent={setActiveParent}
                      activeChild={activeChild}
                      setActiveChild={setActiveChild}
                      parentTitle={item.title}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Item without children
  if (item.title) {
    return (
      <SidebarGroup className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              id={`nav-main-button-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              tooltip={item.title}
              isActive={isParentActive}
              onClick={() => {
                setActiveParent(item.title!);
                setActiveChild(null);
              }}
              className={cn(
                "rounded-md text-sm font-medium px-3 py-2 h-9 transition-colors cursor-pointer",
                isParentActive ? "bg-primary! text-primary-foreground!" : ""
              )}
              render={<Link href={item.href ?? "#"} />}
            >
              {item.icon && <item.icon />}
              {item.title}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return null;
}

function NavMainSubItem({
  item,
  pathname,
  activeParent,
  setActiveParent,
  activeChild,
  setActiveChild,
  parentTitle,
}: {
  item: NavItem;
  pathname: string;
  activeParent: string | null;
  activeChild: string | null;
  setActiveParent: (val: string) => void;
  setActiveChild: (val: string | null) => void;
  parentTitle?: string;
}) {
  const hasChildren = !!item.children?.length;
  const [isOpen, setIsOpen] = React.useState(
    hasChildren && anyChildMatches(pathname, item.children)
  );

  if (hasChildren && item.title) {
    return (
      <SidebarMenuSubItem>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger
            className="w-full"
            render={
              <SidebarMenuSubButton 
                id={`nav-sub-trigger-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="rounded-md text-sm font-medium px-3 py-2 h-9"
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                <ChevronRight
                  className={cn(
                    "ml-auto transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
              </SidebarMenuSubButton>
            }
          />
          <CollapsibleContent>
            <SidebarMenuSub className="me-0 pe-0">
              {item.children!.map((child, index) => (
                <NavMainSubItem
                  key={child.title || index}
                  item={child}
                  pathname={pathname}
                  activeParent={activeParent}
                  setActiveParent={setActiveParent}
                  activeChild={activeChild}
                  setActiveChild={setActiveChild}
                  parentTitle={parentTitle}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuSubItem>
    );
  }

  if (item.title) {
    return (
      <SidebarMenuSubItem className="w-full">
        <SidebarMenuSubButton
          id={`nav-sub-button-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          className={cn(
            "w-full rounded-md transition-colors",
            activeChild === item.title || routeMatches(pathname, item.href, true)
              ? "bg-muted! text-foreground!"
              : ""
          )}
          isActive={activeChild === item.title || routeMatches(pathname, item.href, true)}
          onClick={() => {
            setActiveParent(parentTitle || "");
            setActiveChild(item.title!);
          }}
          render={<Link href={item.href ?? "#"} />}
        >
          {item.title}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return null;
}
