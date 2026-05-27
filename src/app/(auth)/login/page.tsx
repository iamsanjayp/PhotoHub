'use client'

import { signInWithGoogle } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'motion/react'
import Link from 'next/link'
import { ArrowRight, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] animate-pulse duration-10000" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px] animate-pulse duration-[15000ms]" />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/10">
          <CardHeader className="text-center pb-2">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20"
            >
              <svg 
                className="h-9 w-9 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.div>
            
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              PhotoHub
            </CardTitle>
            <CardDescription className="text-sm font-medium text-neutral-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
              Bannari Amman Institute of Technology Photography Club Operations
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            <form action={async () => {
              await signInWithGoogle()
            }}>
              <Button 
                type="submit" 
                className="w-full h-12 bg-white text-black hover:bg-neutral-200 font-semibold transition-all duration-300 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-white/5 group"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign in with Google
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>

            <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/10 bg-yellow-500/5 p-3 text-xs text-yellow-500/80">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Required:</strong> Access is restricted to members with active <strong>@bitsathy.ac.in</strong> email accounts only.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6 text-center border-t border-white/5 pt-4">
            <span className="text-xs text-neutral-500">Need event coverage?</span>
            <Link 
              href="/apex-request" 
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 group"
            >
              Submit APEX Coverage Request
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
