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
import { usePermission } from '@/hooks/usePermission'

export default function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const { can } = usePermission()
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
          {(can('dashboard.view') || can('patient.view') || can('prescription.view') || can('lab.view_results') || can('triage.create') || can('consultation.view')) && (
            <SidebarSection label="Clinical">
              <SidebarNavItem href="/dashboard" label="Dashboard" icon={HomeIcon} permission="dashboard.view" />
              <SidebarNavItem href="/patients" label="Patient Search" icon={UsersIcon} permission="patient.view" />
              <SidebarNavItem href="/pharmacy" label="Pharmacy" icon={BeakerIcon} permission="prescription.view" />
              <SidebarNavItem href="/lab" label="Laboratory" icon={BeakerIcon} permission="lab.view_results" />
            </SidebarSection>
          )}

          {(can('billing.view') || can('referral.view') || can('ward.view')) && (
            <SidebarSection label="Operations">
              <SidebarNavItem href="/billing" label="Billing" icon={CreditCardIcon} permission="billing.view" />
              <SidebarNavItem href="/referrals" label="Referrals" icon={ArrowUpTrayIcon} permission="referral.view" />
              <SidebarNavItem href="/admissions" label="Admissions" icon={BuildingOffice2Icon} permission="ward.view" />
            </SidebarSection>
          )}

          {can('user.manage') && (
            <SidebarDisclosureGroup defaultExpandedKeys={[1]}>
              <SidebarDisclosure id={1}>
                <SidebarDisclosureTrigger>
                  <Cog6ToothIcon />
                  <SidebarLabel>System</SidebarLabel>
                </SidebarDisclosureTrigger>
                <SidebarDisclosurePanel>
                  <SidebarNavItem href="/admin" label="Administration" icon={Cog6ToothIcon} permission="user.manage" />
                </SidebarDisclosurePanel>
              </SidebarDisclosure>
            </SidebarDisclosureGroup>
          )}
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
        <Menu>
          <MenuTrigger className="flex w-full items-center justify-between" aria-label="Profile">
            <div className="flex items-center gap-x-2">
              <Avatar
                initials={initials}
                className="size-8 *:size-8 bg-[#368D80] text-white group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6"
                isSquare
              />
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
            <MenuItem onAction={logout}>
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
  permission,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}) {
  const pathname = usePathname()
  const { can } = usePermission()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  if (permission && !can(permission)) return null

  return (
    <SidebarItem tooltip={label} isCurrent={isActive} href={href}>
      <Icon className="size-4" />
      <SidebarLabel>{label}</SidebarLabel>
    </SidebarItem>
  )
}
