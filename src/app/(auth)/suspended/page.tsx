'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Ban, Mail, ArrowLeft, LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth'

export default function SuspendedPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-4">
      {/* Background ambient glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-red-600/10 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-red-500/20 bg-neutral-950/80 backdrop-blur-2xl shadow-2xl shadow-red-950/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Ban className="h-8 w-8" />
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Account Suspended
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-red-400 mt-1 uppercase tracking-wider">
              Access Restricted by Administrator
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4 pt-4 text-sm text-neutral-300 leading-relaxed">
            <p>
              Your PhotoHub account has been deactivated. You cannot view club assignments, access photography gear, or upload media while your account is suspended.
            </p>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-neutral-400 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-neutral-300 font-medium">
                <Mail className="h-3.5 w-3.5 text-cyan-400" />
                <span>Need help or reactivation?</span>
              </div>
              <p>
                Reach out to the PhotoHub committee leads or email{' '}
                <a href="mailto:photohub@bitsathy.ac.in" className="text-cyan-400 underline underline-offset-2">
                  photohub@bitsathy.ac.in
                </a>
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pb-6 pt-2">
            <form action={signOut} className="w-full">
              <Button
                type="submit"
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5 gap-2 text-white hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out & Switch Account
              </Button>
            </form>
            <Button asChild variant="ghost" className="w-full text-xs text-neutral-400 hover:text-white">
              <Link href="/login">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
