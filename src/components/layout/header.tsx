'use client'

import { useState, useEffect } from 'react'
import { signOut } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Search, LogOut, User, Shield, Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import Sidebar from '@/components/layout/sidebar'
import AdminSidebar from '@/components/layout/admin-sidebar'

export default function Header({ profile }: { profile: Profile }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const isAdminWorkspace = pathname.startsWith('/admin')

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    fetchUnreadCount()

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id, supabase])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
      {/* Mobile Title & Hamburger */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          } />
          <SheetContent side="left" className="w-[280px] p-0 bg-[#0B0B0B] border-r border-white/5 h-full" showCloseButton={false}>
            {isAdminWorkspace ? (
              <AdminSidebar profile={profile} isMobile={true} />
            ) : (
              <Sidebar profile={profile} isMobile={true} />
            )}
          </SheetContent>
        </Sheet>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          PhotoHub
        </span>
      </div>

      {/* Search Input (Desktop) */}
      <div className="hidden md:flex relative max-w-md w-full ml-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input 
          type="search" 
          placeholder="Search events, posts, members..." 
          className="pl-9 h-10 w-[300px] lg:w-[400px] border-white/5 bg-white/[0.03] text-sm text-neutral-200 placeholder-neutral-500 focus-visible:ring-cyan-500/50 rounded-xl"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications Bell */}
        <Link href="/notifications" className="relative">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold text-black ring-2 ring-black">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0 hover:bg-white/5 border border-white/5" />
          }>
            <Avatar className="h-9 w-9 rounded-xl">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} className="object-cover" />
              <AvatarFallback className="bg-neutral-800 text-neutral-200 text-sm font-semibold rounded-xl">
                {profile.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'PH'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56 bg-neutral-900 border-white/5 text-neutral-200" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-white">{profile.full_name || 'Photography Club Member'}</p>
                  <p className="text-xs text-neutral-400 truncate">{profile.email}</p>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 capitalize">
                      {profile.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuItem render={<Link href="/profile" className="flex items-center gap-2" />} className="focus:bg-white/5 focus:text-white cursor-pointer py-2">
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>

            {['admin', 'leader'].includes(profile.role) && (
              <DropdownMenuItem render={<Link href="/admin" className="flex items-center gap-2" />} className="focus:bg-white/5 focus:text-white cursor-pointer py-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="focus:bg-red-500/10 focus:text-red-400 text-red-500 cursor-pointer py-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
