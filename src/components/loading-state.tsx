'use client'

import { Loader2, Camera } from 'lucide-react'

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 w-full py-12 select-none">
      <div className="relative flex items-center justify-center">
        {/* Glowing backdrop shadow */}
        <div className="absolute h-16 w-16 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />
        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
        <Camera className="h-5 w-5 text-white absolute" />
      </div>
      <p className="text-xs font-bold text-neutral-500 tracking-widest uppercase animate-pulse">
        Loading PhotoHub...
      </p>
    </div>
  )
}
