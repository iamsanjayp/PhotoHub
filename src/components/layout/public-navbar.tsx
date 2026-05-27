'use client'

import Link from 'next/link'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ArrowRight, LayoutDashboard, LogIn } from 'lucide-react'

export default function PublicNavbar({ profile }: { profile: Profile | null }) {
  return (
    <nav className="sticky top-0 z-30 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
      {/* Brand logo */}
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 shadow-md shadow-cyan-500/10">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          PhotoHub
        </span>
      </Link>

      {/* Action buttons */}
      <div className="flex items-center gap-3 md:gap-4">
        <Button asChild variant="outline" className="h-10 border-white/10 hover:bg-white/5 hover:text-white text-neutral-300 font-semibold rounded-xl text-xs md:text-sm">
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
          <Button asChild className="h-10 bg-white text-black hover:bg-neutral-200 font-semibold rounded-xl gap-2 shadow-md shadow-white/5 text-xs md:text-sm">
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
