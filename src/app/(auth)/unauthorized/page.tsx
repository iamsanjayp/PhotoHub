'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'motion/react'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-4">
      {/* Background glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-red-500/20 bg-black/40 backdrop-blur-xl shadow-2xl shadow-red-950/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            
            <CardTitle className="text-2xl font-bold tracking-tight text-red-500">
              Access Denied
            </CardTitle>
            <CardDescription className="text-sm font-medium text-neutral-400 mt-2">
              Domain Restriction Enforced
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4 pt-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              Only users with email addresses ending in <strong className="text-white">@bitsathy.ac.in</strong> are authorized to access PhotoHub.
            </p>
            <p className="text-xs text-neutral-500">
              If you logged in with a personal Gmail account, please log out and sign in using your official Bannari Amman Institute of Technology email.
            </p>
          </CardContent>

          <CardFooter className="flex justify-center pb-6 pt-4">
            <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 gap-2 text-white hover:text-white">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
