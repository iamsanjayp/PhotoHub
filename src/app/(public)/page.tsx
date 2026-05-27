'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { ArrowRight, Camera, Trophy, Calendar, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' as const } }
  }

  const features = [
    {
      title: 'Event Coverage (APEX)',
      description: 'Request photography and videography coverage for college events, workshops, and symposiums.',
      icon: Camera,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      title: 'Club Challenges',
      description: 'Participate in weekly and monthly photography contests, vote on submissions, and climb the ranks.',
      icon: Trophy,
      color: 'from-teal-500 to-emerald-500'
    },
    {
      title: 'Learning & Workshops',
      description: 'Register for hands-on photowalks, workshops, and expert webinars to hone your camera skills.',
      icon: Calendar,
      color: 'from-purple-500 to-indigo-500'
    }
  ]

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] py-16 px-4">
      {/* Background radial gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] md:h-[600px] md:w-[600px] rounded-full bg-cyan-500/5 blur-[120px] animate-pulse duration-[10000ms]" />
        <div className="absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-teal-500/5 blur-[120px] animate-pulse duration-[15000ms]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl w-full text-center z-10 space-y-16"
      >
        {/* Hero Section */}
        <div className="space-y-6">
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/10 bg-cyan-500/5 px-4 py-1.5 text-xs font-semibold text-cyan-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Operations Hub</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Capture. Compete.
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Collaborate.
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="max-w-2xl mx-auto text-base sm:text-lg text-neutral-400 leading-relaxed"
          >
            Welcome to PhotoHub, the centralized operations platform for the Bannari Amman Institute of Technology Photography Club.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button asChild className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl gap-2 shadow-lg shadow-cyan-500/15 group">
              <Link href="/apex-request">
                Submit APEX Request
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 border-white/10 hover:bg-white/5 hover:text-white text-neutral-300 font-bold rounded-xl">
              <Link href="/login">
                Member Sign In
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-8"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div 
                key={idx}
                className="group relative border border-white/5 bg-black/40 backdrop-blur-xl p-6 rounded-2xl transition-all duration-300 hover:border-white/10 hover:bg-black/60"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${feature.color} text-black font-bold shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </motion.div>
      </motion.div>
    </div>
  )
}
