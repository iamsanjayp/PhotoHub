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
  Image,
  Calendar,
  Trophy,
  Award,
  Megaphone,
  ClipboardList,
  Bell,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { motion } from 'motion/react'

export default function Sidebar({ profile, isMobile = false }: { profile: Profile; isMobile?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const collapsed = isMobile ? false : isCollapsed
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'Feed',
      href: '/feed',
      icon: Image,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'Events',
      href: '/events',
      icon: Calendar,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
    {
      label: 'Challenges',
      href: '/challenges',
      icon: Trophy,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
    },
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
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      roles: ['admin', 'leader', 'camera_holder', 'participant', 'guest'],
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

  const filteredItems = navItems.filter((item) => item.roles.includes(profile.role))

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <aside
      className={cn(
        isMobile
          ? 'flex flex-col h-full bg-sidebar text-foreground select-none'
          : 'hidden md:flex flex-col h-screen sticky top-0 border-r border-neutral-200 dark:border-white/5 bg-sidebar transition-all duration-300 z-40 shrink-0 select-none',
        !isMobile && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="PhotoHub Logo" className="h-9 w-9 rounded-xl object-cover shrink-0 shadow-md shadow-cyan-500/10" />
          {!collapsed && (
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-neutral-800 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              PhotoHub
            </span>
          )}
        </Link>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!collapsed)}
            className="h-8 w-8 text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg hidden md:flex items-center justify-center shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto scrollbar-none">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 outline-none',
                isActive
                  ? item.highlight
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-850 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.02]',
                item.highlight && !isActive && 'text-cyan-400/80 hover:text-cyan-400 hover:bg-cyan-500/5'
              )}
            >
              {/* Active Tab Accent Line */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className={cn(
                    "absolute left-0 w-1 h-6 rounded-r-full",
                    item.highlight ? "bg-cyan-400" : "bg-neutral-800 dark:bg-white"
                  )}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105', isActive ? '' : 'text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-16 scale-0 rounded-lg border border-neutral-200 dark:border-white/5 bg-popover px-2 py-1 text-xs font-medium text-foreground shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer / User Profile & Sign Out */}
      <div className="p-2 border-t border-neutral-200 dark:border-white/5 bg-black/[0.02] dark:bg-black/10">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-white/5 overflow-hidden">
                {profile.avatar_url && profile.avatar_url.trim() !== '' ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }} />
                ) : (
                  <User className="h-4 w-4 text-neutral-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-800 dark:text-white truncate">{profile.full_name || 'Member'}</p>
                <p className="text-[10px] text-neutral-500 truncate capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-450 hover:bg-red-500/5 h-10 px-3 rounded-xl gap-3 font-semibold"
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
              className="h-10 w-10 text-red-500 hover:text-red-450 hover:bg-red-500/5 rounded-xl group relative"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <div className="absolute left-16 scale-0 rounded-lg border border-neutral-200 dark:border-white/5 bg-popover px-2 py-1 text-xs font-medium text-foreground shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50">
                Sign Out
              </div>
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
