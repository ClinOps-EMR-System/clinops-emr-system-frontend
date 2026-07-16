'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronUpDownIcon,
} from '@heroicons/react/20/solid'
import {
  HomeIcon,
  UsersIcon,
  BeakerIcon,
  CreditCardIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  LifebuoyIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { Avatar } from '@/components/ui/avatar'
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu'
import {
  Sidebar,
  SidebarContent,
  SidebarDisclosure,
  SidebarDisclosureGroup,
  SidebarDisclosurePanel,
  SidebarDisclosureTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarLink,
  SidebarRail,
  SidebarSection,
  SidebarSectionGroup,
} from '@/components/ui/sidebar'
import { useAuth } from '@/store/RoleContext'

export default function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const departmentName = user?.department?.name || 'Clinical Operations'
  const name = user?.name || 'Staff Member'
  const email = user?.email || 'staff@clinops.org'
  const initials = name.split(' ').map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-x-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#368D80] text-white font-extrabold text-sm shrink-0">
            C
          </div>
          <SidebarLabel className="font-semibold text-sm">
            ClinOps <span className="text-muted-fg font-normal">EMR</span>
          </SidebarLabel>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSectionGroup>
          <SidebarSection label="Clinical">
            <SidebarNavItem href="/dashboard" label="Dashboard" icon={HomeIcon} />
            <SidebarNavItem href="/patients" label="Patient Search" icon={UsersIcon} />
            <SidebarNavItem href="/pharmacy" label="Pharmacy" icon={BeakerIcon} />
            <SidebarNavItem href="/lab" label="Laboratory" icon={BeakerIcon} />
          </SidebarSection>

          <SidebarSection label="Operations">
            <SidebarNavItem href="/billing" label="Billing" icon={CreditCardIcon} />
            <SidebarNavItem href="/referrals" label="Referrals" icon={ArrowUpTrayIcon} />
            <SidebarNavItem href="/admissions" label="Admissions" icon={BuildingOffice2Icon} />
          </SidebarSection>

          <SidebarDisclosureGroup defaultExpandedKeys={[1]}>
            <SidebarDisclosure id={1}>
              <SidebarDisclosureTrigger>
                <Cog6ToothIcon />
                <SidebarLabel>System</SidebarLabel>
              </SidebarDisclosureTrigger>
              <SidebarDisclosurePanel>
                <SidebarItem href="/admin" tooltip="Administration">
                  <Cog6ToothIcon />
                  <SidebarLabel>Administration</SidebarLabel>
                </SidebarItem>
              </SidebarDisclosurePanel>
            </SidebarDisclosure>
          </SidebarDisclosureGroup>
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
        <Menu>
          <MenuTrigger className="flex w-full items-center justify-between" aria-label="Profile">
            <div className="flex items-center gap-x-2">
              <Avatar
                className="size-8 *:size-8 group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6"
                isSquare
              >
                <span className="flex size-full items-center justify-center bg-[#368D80] text-white text-xs font-bold">
                  {initials}
                </span>
              </Avatar>
              <div className="in-data-[collapsible=dock]:hidden text-sm">
                <SidebarLabel>{name}</SidebarLabel>
                <span className="-mt-0.5 block text-muted-fg">{departmentName}</span>
              </div>
            </div>
            <ChevronUpDownIcon data-slot="chevron" />
          </MenuTrigger>
          <MenuContent
            className="in-data-[sidebar-collapsible=collapsed]:min-w-56 min-w-(--trigger-width)"
            placement="bottom right"
          >
            <MenuSection>
              <MenuHeader separator>
                <span className="block">{name}</span>
                <span className="font-normal text-muted-fg">{email}</span>
              </MenuHeader>
            </MenuSection>
            <MenuItem href="/dashboard">
              <HomeIcon />
              Dashboard
            </MenuItem>
            <MenuItem href="/admin">
              <Cog6ToothIcon />
              Settings
            </MenuItem>
            <MenuSeparator />
            <MenuItem href="#contact">
              <LifebuoyIcon />
              Support
            </MenuItem>
            <MenuSeparator />
            <MenuItem href="#logout">
              <ArrowRightStartOnRectangleIcon />
              Sign Out
            </MenuItem>
          </MenuContent>
        </Menu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <SidebarItem tooltip={label} isCurrent={isActive} href={href}>
      <Icon className="size-4" />
      <SidebarLabel>{label}</SidebarLabel>
    </SidebarItem>
  )
}
