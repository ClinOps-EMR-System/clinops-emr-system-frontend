'use client'

import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { Breadcrumbs, BreadcrumbsItem } from '@/components/ui/breadcrumbs'
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu'
import { SidebarNav, SidebarTrigger } from '@/components/ui/sidebar'
import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  HomeIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/store/RoleContext'

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  patients: 'Patient Search',
  register: 'Patient Registration',
  triage: 'Triage',
  consultation: 'Consultation',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  billing: 'Billing',
  referrals: 'Referrals',
  admissions: 'Admissions',
  admin: 'Administration',
}

export default function AppSidebarNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const name = user?.name || 'Staff Member'
  const email = user?.email || 'staff@clinops.org'
  const initials = name.split(' ').map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2)

  const pathParts = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathParts.map((part, index) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/')
    let label = breadcrumbMap[part] || part.charAt(0).toUpperCase() + part.slice(1)
    if (/^\d+$/.test(part)) label = `#${part}`
    return { label, href }
  })

  return (
    <SidebarNav>
      <span className="flex items-center gap-x-4">
        <SidebarTrigger className="-ml-2.5 lg:ml-0" />
        {breadcrumbs.length > 0 && (
          <Breadcrumbs className="hidden md:flex">
            <BreadcrumbsItem href="/dashboard">Home</BreadcrumbsItem>
            {breadcrumbs.map((crumb, idx) => (
              <BreadcrumbsItem
                key={idx}
                href={idx === breadcrumbs.length - 1 ? undefined : crumb.href}
              >
                {crumb.label}
              </BreadcrumbsItem>
            ))}
          </Breadcrumbs>
        )}
      </span>
      <UserMenu name={name} email={email} initials={initials} logout={logout} />
    </SidebarNav>
  )
}

function UserMenu({
  name,
  email,
  initials,
  logout,
}: {
  name: string
  email: string
  initials: string
  logout: () => void
}) {
  return (
    <Menu>
      <MenuTrigger className="ml-auto md:hidden" aria-label="Open Menu">
        <Avatar isSquare>
          <span className="flex size-full items-center justify-center bg-[#368D80] text-white text-xs font-bold">
            {initials}
          </span>
        </Avatar>
      </MenuTrigger>
      <MenuContent popover={{ placement: 'bottom end' }} className="min-w-64">
        <MenuHeader separator>
          <span className="block">{name}</span>
          <span className="font-normal text-muted-fg">{email}</span>
        </MenuHeader>
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
        <MenuItem onPress={() => logout()}>
          <ArrowRightStartOnRectangleIcon />
          Sign Out
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
