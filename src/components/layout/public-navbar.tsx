'use client'

import Link from 'next/link'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ArrowRight, LayoutDashboard, LogIn } from 'lucide-react'


export default function PublicNavbar({ profile }: { profile: Profile | null }) {
  return (
    <nav className="sticky top-0 z-30 h-16 border-b border-neutral-200 dark:border-white/5 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
      {/* Brand logo */}
      <Link href="/" className="flex items-center gap-3">
        <img src="/logo.png" alt="PhotoHub Logo" className="h-9 w-9 rounded-xl object-cover shadow-md shadow-cyan-500/10" />
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-neutral-800 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
          PhotoHub
        </span>
      </Link>
 
      {/* Action buttons */}
      <div className="flex items-center gap-3 md:gap-4">
        <Button asChild variant="outline" className="hidden md:inline-flex h-10 border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-300 font-semibold rounded-xl text-xs md:text-sm">
          <Link href="/apex-request">Request Coverage (APEX)</Link>
        </Button>

        {profile ? (
          <Button asChild className="h-10 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-semibold rounded-xl gap-2 shadow-md shadow-cyan-500/10 text-xs md:text-sm">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>
        ) : (
          <Button asChild className="h-10 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold rounded-xl gap-2 shadow-md shadow-white/5 text-xs md:text-sm">
            <Link href="/login" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              <span>Member Login</span>
            </Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
