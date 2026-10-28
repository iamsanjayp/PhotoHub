'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGalleryItems, createGalleryItem, deleteGalleryItem } from '@/actions/gallery'
import { uploadMedia } from '@/actions/upload'
import { isAdminOrBoard } from '@/lib/constants/roles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowRight,
  Camera,
  Trophy,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  Globe,
  HardDrive,
  Mail,
  Plus,
  Trash2,
  ZoomIn,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Flame,
} from 'lucide-react'

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  )
}
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'links'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [lightboxImage, setLightboxImage] = useState<any | null>(null)

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Campus')
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const isLeader = profile ? isAdminOrBoard(profile.role) : false

  // Fetch gallery items
  const { data: galleryItems = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ['hero-gallery'],
    queryFn: async () => {
      const res = await getGalleryItems()
      return res.data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteGalleryItem(id)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Gallery photo removed')
      queryClient.invalidateQueries({ queryKey: ['hero-gallery'] })
      if (lightboxImage) setLightboxImage(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove photo')
    },
  })

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error('Please select an image and enter a title')
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)

      const uploadRes = await uploadMedia(formData)
      if (uploadRes.error || !uploadRes.url) {
        throw new Error(uploadRes.error || 'Failed to upload image file')
      }

      const createRes = await createGalleryItem({
        title: uploadTitle.trim(),
        category: uploadCategory,
        caption: uploadCaption.trim(),
        image_url: uploadRes.url,
      })

      if (createRes.error) {
        throw new Error(createRes.error)
      }

      toast.success('Photo added to Best Works Gallery!')
      setIsUploadOpen(false)
      setUploadTitle('')
      setUploadCaption('')
      setUploadFile(null)
      setPreviewUrl(null)
      queryClient.invalidateQueries({ queryKey: ['hero-gallery'] })
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Filter gallery
  const categories = ['All', 'Architecture', 'Portraits', 'Events', 'Cinematic', 'Nature']
  const filteredGallery = galleryItems.filter((item: any) => {
    if (selectedCategory === 'All') return true
    return item.category?.toLowerCase() === selectedCategory.toLowerCase()
  })

  const features = [
    {
      title: 'Event Coverage (APEX)',
      description: 'Request official photography and cinematography for college symposiums, hackathons, and celebrations.',
      icon: Camera,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      title: 'Club Challenges & Streaks',
      description: 'Weekly curated photo prompts, peer critique, leaderboard points, and monthly club exhibitions.',
      icon: Trophy,
      color: 'from-teal-500 to-emerald-500',
    },
    {
      title: 'Workshops & Photowalks',
      description: 'Hands-on lens mastery, camera gear allocation, drone operations, and darkroom post-production.',
      icon: Calendar,
      color: 'from-purple-500 to-indigo-500',
    },
  ]

  const stats = [
    { label: 'Campus Events Covered', value: '250+' },
    { label: 'Registered Club Members', value: '400+' },
    { label: 'Photos & Deliverables', value: '15,000+' },
    { label: 'Years of Visual Storytelling', value: '12+' },
  ]

  const webLinks = [
    {
      title: 'BIT Sathy Official Portal',
      description: 'Main website of Bannari Amman Institute of Technology, Sathyamangalam.',
      url: 'https://bitsathy.ac.in',
      icon: Globe,
      badge: 'Institute',
      accent: 'border-cyan-500/30 hover:border-cyan-400 group-hover:text-cyan-400',
    },
    {
      title: 'Instagram (@photohub_bit)',
      description: 'Our primary visual feed featuring daily campus captures, reels, and stories.',
      url: 'https://instagram.com/photohub_bit',
      icon: InstagramIcon,
      badge: 'Social Feed',
      accent: 'border-pink-500/30 hover:border-pink-400 group-hover:text-pink-400',
    },
    {
      title: 'PhotoHub YouTube Channel',
      description: 'Full-length event aftermovies, documentary reels, and student cinematography.',
      url: 'https://youtube.com',
      icon: YoutubeIcon,
      badge: 'Videos & Films',
      accent: 'border-red-500/30 hover:border-red-400 group-hover:text-red-400',
    },
    {
      title: 'Book APEX Coverage',
      description: 'Official department request portal for high-resolution photo & video coverage.',
      url: '/apex-request',
      icon: Camera,
      badge: 'Service Portal',
      accent: 'border-teal-500/30 hover:border-teal-400 group-hover:text-teal-400',
    },
    {
      title: 'Student Media Cloud Drive',
      description: 'Unlimited Google Drive media vault for high-resolution master event archives.',
      url: 'https://drive.google.com',
      icon: HardDrive,
      badge: 'Cloud Storage',
      accent: 'border-blue-500/30 hover:border-blue-400 group-hover:text-blue-400',
    },
    {
      title: 'Contact Club Operations',
      description: 'Inquiries, collaborations, and gear support via photohub@bitsathy.ac.in.',
      url: 'mailto:photohub@bitsathy.ac.in',
      icon: Mail,
      badge: 'Official Email',
      accent: 'border-amber-500/30 hover:border-amber-400 group-hover:text-amber-400',
    },
  ]

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center bg-[#070707] py-8 sm:py-16 px-4 overflow-hidden">
      {/* Background ambient radial gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-[600px] md:h-[800px] md:w-[800px] rounded-full bg-cyan-500/5 blur-[140px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-20 left-1/4 h-96 w-96 rounded-full bg-teal-500/5 blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="max-w-6xl w-full z-10 space-y-10 sm:space-y-12">
        {/* Hero Top Title & CTAs */}
        <div className="text-center space-y-5 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-400 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Photography & Media Club • BIT Sathy</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              Capture. Compete.
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Collaborate.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl mx-auto text-sm sm:text-lg text-neutral-400 leading-relaxed px-2"
          >
            The centralized production and showcase platform for the Bannari Amman Institute of Technology Photography Club.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Button
              asChild
              className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-95 font-black rounded-2xl gap-2 shadow-lg shadow-cyan-500/20 group"
            >
              <Link href="/login">
                Member Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto h-12 px-7 border-neutral-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-white font-bold rounded-2xl gap-2"
            >
              <Link href="/apex-request">
                <Camera className="h-4 w-4 text-cyan-400" />
                Request Event Coverage
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center justify-center pt-4">
          <div className="flex items-center p-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-xl max-w-md w-full justify-between gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
                activeTab === 'overview'
                  ? 'bg-cyan-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Layers className="h-4 w-4" />
              <span>Features</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
                activeTab === 'gallery'
                  ? 'bg-cyan-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              )}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Best Works</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
                activeTab === 'links'
                  ? 'bg-cyan-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              )}
            >
              <LinkIcon className="h-4 w-4" />
              <span>Web Links</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Features & Stats */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, idx) => {
                const Icon = feature.icon
                return (
                  <div
                    key={idx}
                    className="group relative border border-white/5 bg-neutral-900/40 backdrop-blur-xl p-6 rounded-3xl transition-all duration-300 hover:border-cyan-500/30 hover:bg-neutral-900/70 shadow-sm"
                  >
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr ${feature.color} text-black font-bold shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{feature.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl">
              {stats.map((s, idx) => (
                <div key={idx} className="text-center space-y-1">
                  <div className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab 2: Best Works Gallery */}
        {activeTab === 'gallery' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Gallery Controls & Category Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap',
                      selectedCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {isLeader && (
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs h-9 px-4 gap-2 shrink-0 shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Upload Best Work
                </Button>
              )}
            </div>

            {/* Gallery Grid */}
            {isLoadingGallery ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[4/3] rounded-3xl bg-neutral-900/60 animate-pulse" />
                ))}
              </div>
            ) : filteredGallery.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl space-y-3">
                <ImageIcon className="h-12 w-12 text-neutral-600 mx-auto" />
                <h3 className="text-lg font-bold text-neutral-300">No photos in this category yet</h3>
                <p className="text-xs text-neutral-500">Check back soon for new club master captures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGallery.map((item: any) => (
                  <div
                    key={item.id}
                    className="group relative rounded-3xl overflow-hidden border border-white/10 bg-neutral-950 aspect-[4/3] shadow-md hover:shadow-cyan-500/10 transition-all duration-300"
                  >
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                    {/* Category Tag (Top Right) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <Badge className="bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
                        {item.category || 'Featured'}
                      </Badge>
                      {isLeader && !item.is_seed && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete "${item.title}" from Best Works Gallery?`)) {
                              deleteMutation.mutate(item.id)
                            }
                          }}
                          className="h-7 w-7 rounded-lg bg-black/60 backdrop-blur-md text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Bottom Info Bar & Preview Trigger */}
                    <div className="absolute bottom-0 inset-x-0 p-4 space-y-1 z-10">
                      <h4 className="font-bold text-white text-base leading-tight group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h4>
                      {item.caption && (
                        <p className="text-xs text-neutral-400 line-clamp-1">{item.caption}</p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {item.author ? `Photo by ${item.author}` : 'PhotoHub Master Works'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLightboxImage(item)}
                          className="h-7 px-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg gap-1"
                        >
                          <ZoomIn className="h-3 w-3" /> Inspect
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 3: Web Links Bento Grid */}
        {activeTab === 'links' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center max-w-lg mx-auto space-y-1 mb-6">
              <h3 className="text-xl sm:text-2xl font-black text-white">Official Web Links & Channels</h3>
              <p className="text-xs sm:text-sm text-neutral-400">
                Explore our college channels, social feeds, film portfolios, and booking inquiries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {webLinks.map((link, idx) => {
                const Icon = link.icon
                return (
                  <a
                    key={idx}
                    href={link.url}
                    target={link.url.startsWith('http') ? '_blank' : undefined}
                    rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={cn(
                      'group relative p-6 rounded-3xl border bg-neutral-900/40 backdrop-blur-xl transition-all duration-300 hover:bg-neutral-900/80 shadow-md flex flex-col justify-between',
                      link.accent
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-neutral-400 border-white/10">
                          {link.badge}
                        </Badge>
                      </div>

                      <h4 className="text-base font-bold text-white mb-1.5 transition-colors">
                        {link.title}
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {link.description}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                      <span>Visit Channel</span>
                      <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
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
              <div className="p-5 sm:p-6 bg-neutral-900/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-[10px] font-bold uppercase">
                      {lightboxImage.category}
                    </Badge>
                    <span className="text-xs text-neutral-400 font-medium">PhotoHub Gallery</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">{lightboxImage.title}</h3>
                  {lightboxImage.caption && (
                    <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{lightboxImage.caption}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLeader && !lightboxImage.is_seed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this image from gallery?')) {
                          deleteMutation.mutate(lightboxImage.id)
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
                  >
                    <a href={lightboxImage.url} target="_blank" rel="noopener noreferrer">
                      Open Full Res
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Upload Gallery Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg rounded-3xl bg-card border border-white/10 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-cyan-400" />
              Upload Image to Best Works
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Display curated photography on the public PhotoHub landing showcase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Photo Title *</Label>
              <Input
                placeholder="e.g. Symphony of Shadows"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="rounded-xl text-xs sm:text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full h-10 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs px-3 focus:outline-none focus:border-cyan-500"
              >
                <option value="Architecture">Architecture</option>
                <option value="Portraits">Portraits</option>
                <option value="Events">Events</option>
                <option value="Cinematic">Cinematic</option>
                <option value="Nature">Nature</option>
                <option value="Campus">Campus</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Caption / Story (Optional)</Label>
              <Textarea
                placeholder="A brief behind-the-scenes story or camera settings..."
                rows={2}
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                className="rounded-xl text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Photo File *</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setUploadFile(file)
                    setPreviewUrl(URL.createObjectURL(file))
                  }
                }}
                required
                className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
              />
              {previewUrl && (
                <div className="mt-2 relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !uploadFile || !uploadTitle.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs px-5"
              >
                {isUploading ? 'Uploading Image...' : 'Publish to Showcase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
