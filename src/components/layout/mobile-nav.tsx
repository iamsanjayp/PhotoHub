'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/types/database'
import { signOut } from '@/actions/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Image,
  Calendar,
  Trophy,
  Menu,
  Award,
  Megaphone,
  ClipboardList,
  User,
  Shield,
  LogOut,
  Inbox,
  Users,
  Send,
  Camera,
  ArrowLeft,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export default function MobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isAdminWorkspace = pathname.startsWith('/admin')
  const isAdminOrLeader = ['admin', 'leader'].includes(profile.role)

  // Standard student items
  const studentPrimaryItems = [
    { label: 'Dash', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Feed', href: '/feed', icon: Image },
    { label: 'Events', href: '/events', icon: Calendar },
    { label: 'Challenges', href: '/challenges', icon: Trophy },
  ]

  // Admin workspace primary items
  const adminPrimaryItems = [
    { label: 'Admin', href: '/admin', icon: LayoutDashboard },
    { label: 'Mod', href: '/admin/feed-moderation', icon: Inbox },
    { label: 'Apex', href: '/admin/apex', icon: ClipboardList },
    { label: 'Events', href: '/admin/events', icon: Calendar },
  ]

  const primaryItems = (isAdminWorkspace && isAdminOrLeader) ? adminPrimaryItems : studentPrimaryItems

  // Items for the "More" menu
  const studentMoreItems = [
    {
      label: 'Leaderboard',
      href: '/leaderboard',
      icon: Award,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'My Assignments',
      href: '/my-assignments',
      icon: ClipboardList,
      roles: ['admin', 'leader', 'camera_holder'],
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: User,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      roles: ['admin', 'leader'],
      highlight: true,
    },
  ]

  const adminMoreItems = [
    {
      label: 'Members',
      href: '/admin/members',
      icon: Users,
    },
    {
      label: 'Challenges',
      href: '/admin/challenges',
      icon: Trophy,
    },
    {
      label: 'Equipment',
      href: '/admin/equipment',
      icon: Camera,
    },
    {
      label: 'Announcements',
      href: '/admin/announcements',
      icon: Megaphone,
    },
    {
      label: 'Leaderboard Pts',
      href: '/admin/leaderboard',
      icon: Award,
    },
    {
      label: 'Instagram Queue',
      href: '/admin/instagram-queue',
      icon: Send,
    },
    {
      label: 'Student View',
      href: '/dashboard',
      icon: ArrowLeft,
      highlight: true,
    },
  ]

  const filteredMoreItems = (isAdminWorkspace && isAdminOrLeader)
    ? adminMoreItems
    : studentMoreItems.filter((item) => item.roles.includes(profile.role))

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut()
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-neutral-200 dark:border-white/5 bg-sidebar/85 backdrop-blur-lg flex items-center justify-around px-2 z-40">
      {primaryItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all duration-200',
              isActive ? 'text-cyan-400 font-semibold scale-105' : 'text-neutral-500 dark:text-neutral-400'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        )
      })}

      {/* "More" Trigger Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger render={
          <button className="flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl text-neutral-550 dark:text-neutral-450">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        } />
        <SheetContent side="bottom" className="bg-sidebar border-t border-neutral-200 dark:border-white/5 text-foreground rounded-t-3xl max-h-[85vh] overflow-y-auto px-6 pb-8">
          <SheetHeader className="pb-4 border-b border-neutral-200 dark:border-white/5 text-left">
            <SheetTitle className="text-lg font-extrabold text-neutral-800 dark:text-white">
              {isAdminWorkspace ? 'Admin Navigation' : 'Menu Navigation'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 py-6">
            {filteredMoreItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <SheetClose key={item.href} nativeButton={false} render={
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-2xl text-sm font-semibold border transition-all duration-200',
                      isActive
                        ? item.highlight
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-850 dark:text-white'
                        : 'bg-neutral-50 dark:bg-white/[0.01] border-neutral-200 dark:border-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white dark:hover:bg-white/[0.03]'
                    )}
                  />
                }>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </SheetClose>
              )
            })}
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-200 dark:border-white/5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-white/5 overflow-hidden">
                {profile.avatar_url && profile.avatar_url.trim() !== '' ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-neutral-550" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800 dark:text-white truncate">{profile.full_name || 'Member'}</p>
                <p className="text-xs text-neutral-500 truncate capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>
            
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-center text-red-500 hover:text-red-400 hover:bg-red-500/5 h-12 rounded-2xl gap-2 font-bold border border-red-500/10"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
