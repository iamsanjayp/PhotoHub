'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { getGalleryItems, GalleryItem } from '@/actions/gallery'
import { getWebLinks, WebLinkItem } from '@/actions/web-links'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Play,
  Pause,
  Compass,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const { profile } = useAuth()

  // Fetch gallery items
  const { data: galleryItems = [] } = useQuery<GalleryItem[]>({
    queryKey: ['hero-gallery'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/hero/gallery')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) return json.data as GalleryItem[]
        }
      } catch (e) {
        console.warn('API fetch /api/hero/gallery failed, falling back:', e)
      }
      const saRes = await getGalleryItems()
      return (saRes.data || []) as GalleryItem[]
    },
  })

  // Fetch web links
  const { data: webLinks = [] } = useQuery({
    queryKey: ['hero-web-links'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/hero/links')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) return json.data
        }
      } catch (e) {
        console.warn('API fetch /api/hero/links failed, falling back:', e)
      }
      const saRes = await getWebLinks()
      return saRes.data || []
    },
  })

  // Gallery Active Index & Auto-Play
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [lightboxImage, setLightboxImage] = useState<any | null>(null)

  // Ensure activeIndex is within bounds
  const currentPhoto = galleryItems.length > 0
    ? galleryItems[activeIndex % galleryItems.length]
    : null

  // Auto-cycle photos every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || galleryItems.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % galleryItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, galleryItems.length])

  const handleNext = () => {
    if (galleryItems.length === 0) return
    setActiveIndex((prev) => (prev + 1) % galleryItems.length)
  }

  const handlePrev = () => {
    if (galleryItems.length === 0) return
    setActiveIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
  }

  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-cyan-500 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-100px] w-[500px] h-[400px] bg-purple-500/10 rounded-full blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-24 space-y-16 sm:space-y-20">
        {/* Hero Headline Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold tracking-wide uppercase"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>PhotoHub • Bannari Amman Institute of Technology</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]"
          >
            Where Moments Turn Into{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
              Timeless Stories
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed"
          >
            The official photography, media, and cinematography collective of BIT Sathy.
            Explore our curated masterpieces and official campus channels below.
          </motion.p>


        </div>

        {/* 1. Large Spotlight Gallery Stage */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Featured Gallery
              </h2>
              <Badge className="bg-cyan-500/15 text-cyan-300 border-none text-[10px] font-bold uppercase">
                Spotlight
              </Badge>
            </div>

            {/* Play/Pause & Counter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                className="h-8 px-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={isAutoPlaying ? 'Pause Slideshow' : 'Resume Slideshow'}
              >
                {isAutoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span className="hidden sm:inline">{isAutoPlaying ? 'Auto' : 'Paused'}</span>
              </button>

              <span className="text-xs font-mono text-neutral-500 font-bold">
                {galleryItems.length > 0 ? `${(activeIndex % galleryItems.length) + 1} / ${galleryItems.length}` : '0 / 0'}
              </span>
            </div>
          </div>

          {/* Large Stage Frame */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-950 group">
            {currentPhoto ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhoto.id || activeIndex}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0 w-full h-full"
                >
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                  />

                  {/* Left Bottom Details Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-12 pointer-events-none">
                    <div className="max-w-2xl space-y-2 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-md">
                          {currentPhoto.category || 'Featured'}
                        </Badge>
                        <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                          PhotoHub Masterpiece
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
                        {currentPhoto.title}
                      </h3>

                      {currentPhoto.caption && (
                        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed line-clamp-2 max-w-xl drop-shadow">
                          {currentPhoto.caption}
                        </p>
                      )}

                      <p className="text-[11px] sm:text-xs text-neutral-400 font-medium pt-1">
                        {currentPhoto.author ? `Photo by ${currentPhoto.author}` : 'PhotoHub BIT Sathy'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
                No photographs in gallery yet.
              </div>
            )}

            {/* Stage Left / Right Navigation Buttons */}
            {galleryItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Inspect / Fullscreen Button */}
            {currentPhoto && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLightboxImage(currentPhoto)}
                className="absolute top-4 right-4 h-9 px-3 rounded-xl bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs gap-1.5 opacity-90 hover:opacity-100"
              >
                <ZoomIn className="h-3.5 w-3.5 text-cyan-400" />
                <span>Inspect</span>
              </Button>
            )}
          </div>

          {/* Interactive Miniature Thumbnail Strip */}
          {galleryItems.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {galleryItems.map((item: any, idx: number) => {
                const isSelected = (activeIndex % galleryItems.length) === idx
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx)
                      setIsAutoPlaying(false)
                    }}
                    className={cn(
                      'relative shrink-0 w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden border transition-all duration-300',
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-102 shadow-lg shadow-cyan-950/50'
                        : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/30'
                    )}
                  >
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* 2. Official Web Links Bento Grid (Directly below the gallery) */}
        <section className="space-y-6 pt-6 border-t border-white/5">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Official Web Links & Channels
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Access the institute portal, social handles, event reels, and student media repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {webLinks.map((link: WebLinkItem) => (
              <a
                key={link.id}
                href={link.url}
                target={link.url.startsWith('http') ? '_blank' : undefined}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={cn(
                  'group relative p-6 rounded-3xl border bg-neutral-900/40 backdrop-blur-xl transition-all duration-300 hover:bg-neutral-900/80 shadow-md flex flex-col justify-between hover:-translate-y-1',
                  link.accent || 'border-cyan-500/30 hover:border-cyan-400'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold text-neutral-300 border-white/10 px-2.5 py-0.5 rounded-full"
                    >
                      {link.badge || 'Portal'}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 transition-colors group-hover:text-cyan-300">
                    {link.title}
                  </h3>
                  {link.description && (
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                      {link.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>Visit Resource &rarr;</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-4xl p-0 overflow-hidden rounded-3xl bg-neutral-950 border border-white/10">
          {lightboxImage && (
            <div className="flex flex-col">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-6 bg-neutral-900/90 backdrop-blur-md space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-[10px] font-bold uppercase">
                    {lightboxImage.category || 'Featured'}
                  </Badge>
                  <span className="text-xs text-neutral-400 font-medium">PhotoHub Gallery</span>
                </div>
                <h3 className="text-xl font-black text-white">{lightboxImage.title}</h3>
                {lightboxImage.caption && (
                  <p className="text-xs sm:text-sm text-neutral-300">{lightboxImage.caption}</p>
                )}
                <p className="text-[11px] text-neutral-500 font-medium">
                  {lightboxImage.author ? `Photographed by ${lightboxImage.author}` : 'PhotoHub BIT Sathy'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
