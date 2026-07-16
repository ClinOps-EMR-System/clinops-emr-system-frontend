'use client'

import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../store/RoleContext'
import AppSidebar from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-clinical-bg font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#368D80] border-t-transparent" />
          <p className="text-xs font-bold text-clinical-muted font-mono tracking-widest uppercase">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-clinical-bg text-clinical-text focus:outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
