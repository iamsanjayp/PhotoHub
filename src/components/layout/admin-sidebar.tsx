'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/types/database'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Inbox,
  Send,
  Trophy,
  Camera,
  Megaphone,
  Award,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react'
import { motion } from 'motion/react'

export default function AdminSidebar({ profile, isMobile = false }: { profile: Profile; isMobile?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const collapsed = isMobile ? false : isCollapsed
  const pathname = usePathname()

  const adminItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Members',
      href: '/admin/members',
      icon: Users,
    },
    {
      label: 'Events',
      href: '/admin/events',
      icon: Calendar,
    },
    {
      label: 'Apex Requests',
      href: '/admin/apex',
      icon: ClipboardList,
    },
    {
      label: 'Feed Moderation',
      href: '/admin/feed-moderation',
      icon: Inbox,
    },
    {
      label: 'Instagram Queue',
      href: '/admin/instagram-queue',
      icon: Send,
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
      label: 'Leaderboard Points',
      href: '/admin/leaderboard',
      icon: Award,
    },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <aside
      className={cn(
        isMobile
          ? 'flex flex-col h-full bg-[#0A0A0A] text-foreground select-none'
          : 'hidden md:flex flex-col h-screen sticky top-0 border-r border-cyan-500/10 bg-[#0A0A0A] transition-all duration-300 z-40 shrink-0 select-none shadow-lg shadow-cyan-950/5',
        !isMobile && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Admin Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-cyan-500/10">
        <Link href="/admin" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 shadow-md shadow-cyan-500/10">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-white leading-none">PhotoHub</span>
              <span className="text-[10px] font-bold text-cyan-400 mt-0.5 tracking-wider uppercase">Admin Portal</span>
            </div>
          )}
        </Link>
        {!collapsed && !isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 text-neutral-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapse button for small width */}
      {collapsed && !isMobile && (
        <div className="flex justify-center py-2 border-b border-cyan-500/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8 text-neutral-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back to User Dashboard Link */}
      <div className="p-2 border-b border-white/5">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white/5 text-white hover:bg-white/10 outline-none',
            collapsed ? 'justify-center' : ''
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-cyan-400 animate-pulse" />
          {!collapsed && <span>User Dashboard</span>}
          {collapsed && (
            <div className="absolute left-16 scale-0 rounded-lg border border-white/5 bg-neutral-950 px-2 py-1 text-xs font-medium text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50">
              User Dashboard
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {adminItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 outline-none',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
              )}
            >
              {/* Active Accent indicator */}
              {isActive && (
                <motion.div
                  layoutId="adminActiveIndicator"
                  className="absolute left-0 w-1 h-6 rounded-r-full bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105', isActive ? 'text-cyan-400' : 'text-neutral-500 group-hover:text-neutral-300')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-16 scale-0 rounded-lg border border-cyan-500/10 bg-neutral-950 px-2 py-1 text-xs font-medium text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-cyan-500/10 bg-black/10">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="h-9 w-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                {profile.avatar_url && profile.avatar_url.trim() !== '' ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-neutral-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{profile.full_name || 'Admin'}</p>
                <p className="text-[10px] text-cyan-400 truncate capitalize font-bold">{profile.role}</p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-500/5 h-10 px-3 rounded-xl gap-3 font-semibold"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sign Out</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl group relative"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <div className="absolute left-16 scale-0 rounded-lg border border-white/5 bg-neutral-950 px-2 py-1 text-xs font-medium text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50">
                Sign Out
              </div>
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
