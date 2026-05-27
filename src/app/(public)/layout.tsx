import { getCurrentProfile } from '@/actions/auth'
import PublicNavbar from '@/components/layout/public-navbar'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-foreground flex flex-col">
      {/* Public Navbar */}
      <PublicNavbar profile={profile} />
      
      {/* Page Content */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  )
}
