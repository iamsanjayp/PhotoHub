import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/actions/auth'
import AdminSidebar from '@/components/layout/admin-sidebar'
import Header from '@/components/layout/header'
import MobileNav from '@/components/layout/mobile-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    redirect('/dashboard')
  }

  if (!profile.is_active) {
    redirect('/unauthorized')
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-foreground flex flex-col md:flex-row">
      {/* Admin Sidebar for Desktop */}
      <AdminSidebar profile={profile} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Header */}
        <Header profile={profile} />
        
        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav profile={profile} />
    </div>
  )
}
