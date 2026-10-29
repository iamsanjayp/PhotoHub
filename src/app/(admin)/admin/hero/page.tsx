'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/actions/gallery'
import { getWebLinks, createWebLink, updateWebLink, deleteWebLink, WebLinkItem } from '@/actions/web-links'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles,
  Upload,
  Globe,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { MediaUpload } from '@/components/ui/media-upload'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS = ['Architecture', 'Portraits', 'Events', 'Cinematic', 'Nature', 'Campus']

const ACCENT_OPTIONS = [
  { label: 'Cyan Glow', value: 'border-cyan-500/30 hover:border-cyan-400 group-hover:text-cyan-400' },
  { label: 'Pink Neon', value: 'border-pink-500/30 hover:border-pink-400 group-hover:text-pink-400' },
  { label: 'Red Cinema', value: 'border-red-500/30 hover:border-red-400 group-hover:text-red-400' },
  { label: 'Amber Warmth', value: 'border-amber-500/30 hover:border-amber-400 group-hover:text-amber-400' },
  { label: 'Emerald Lush', value: 'border-emerald-500/30 hover:border-emerald-400 group-hover:text-emerald-400' },
  { label: 'Purple Pulse', value: 'border-purple-500/30 hover:border-purple-400 group-hover:text-purple-400' },
]

export default function AdminHeroPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'gallery' | 'links'>('gallery')

  // --- Gallery Modal States ---
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<any | null>(null)
  const [photoTitle, setPhotoTitle] = useState('')
  const [photoCategory, setPhotoCategory] = useState('Campus')
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoDriveFileId, setPhotoDriveFileId] = useState<string | null>(null)
  const [isPhotoSubmitting, setIsPhotoSubmitting] = useState(false)

  // --- Web Link Modal States ---
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<WebLinkItem | null>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkBadge, setLinkBadge] = useState('Link')
  const [linkAccent, setLinkAccent] = useState(ACCENT_OPTIONS[0].value)

  // Fetch Gallery Items
  const { data: galleryItems = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ['hero-gallery'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/hero/gallery')
        if (res.ok) {
          const json = await res.json()
          if (json.data) return json.data
        }
      } catch (e) {
        console.warn('API fetch /api/hero/gallery failed, falling back:', e)
      }
      const saRes = await getGalleryItems()
      return saRes.data || []
    },
  })

  // Fetch Web Links
  const { data: webLinks = [], isLoading: isLoadingLinks } = useQuery<WebLinkItem[]>({
    queryKey: ['hero-web-links'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/hero/links')
        if (res.ok) {
          const json = await res.json()
          if (json.data) return json.data
        }
      } catch (e) {
        console.warn('API fetch /api/hero/links failed, falling back:', e)
      }
      const saRes = await getWebLinks()
      return saRes.data || []
    },
  })

  // Gallery Mutations
  const deleteGalleryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hero/gallery?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to remove photo')
      }
    },
    onSuccess: () => {
      toast.success('Gallery photo removed')
      queryClient.invalidateQueries({ queryKey: ['hero-gallery'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove photo')
    },
  })

  const openAddPhotoModal = () => {
    setEditingPhoto(null)
    setPhotoTitle('')
    setPhotoCategory('Campus')
    setPhotoCaption('')
    setPhotoPreviewUrl(null)
    setPhotoDriveFileId(null)
    setIsPhotoModalOpen(true)
  }

  const openEditPhotoModal = (item: any) => {
    setEditingPhoto(item)
    setPhotoTitle(item.title || '')
    setPhotoCategory(item.category || 'Campus')
    setPhotoCaption(item.caption || '')
    setPhotoPreviewUrl(item.url || null)
    setPhotoDriveFileId(item.cloudinary_public_id || null)
    setIsPhotoModalOpen(true)
  }

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photoTitle.trim()) {
      toast.error('Title is required')
      return
    }

    if (!photoPreviewUrl) {
      toast.error('Please upload an image')
      return
    }

    try {
      setIsPhotoSubmitting(true)

      const payload = {
        title: photoTitle.trim(),
        category: photoCategory,
        caption: photoCaption.trim(),
        image_url: photoPreviewUrl,
        drive_file_id: photoDriveFileId,
      }

      if (editingPhoto && !editingPhoto.is_seed) {
        const res = await fetch('/api/hero/gallery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPhoto.id, ...payload }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update photo')
        toast.success('Gallery photo updated!')
      } else {
        const res = await fetch('/api/hero/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to add photo')
        toast.success('Photo added to showcase gallery!')
      }

      setIsPhotoModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hero-gallery'] })
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setIsPhotoSubmitting(false)
    }
  }

  // Web Link Mutations
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hero/links?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to remove web link')
    },
    onSuccess: () => {
      toast.success('Web link removed')
      queryClient.invalidateQueries({ queryKey: ['hero-web-links'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove web link')
    },
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: linkTitle,
        description: linkDescription,
        url: linkUrl,
        badge: linkBadge,
        accent: linkAccent,
      }

      if (editingLink) {
        const res = await fetch('/api/hero/links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLink.id, ...payload }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update web link')
      } else {
        const res = await fetch('/api/hero/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to save web link')
      }
    },
    onSuccess: () => {
      toast.success(editingLink ? 'Web link updated!' : 'Web link created!')
      setIsLinkModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hero-web-links'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save web link')
    },
  })

  const openAddLinkModal = () => {
    setEditingLink(null)
    setLinkTitle('')
    setLinkDescription('')
    setLinkUrl('')
    setLinkBadge('Link')
    setLinkAccent(ACCENT_OPTIONS[0].value)
    setIsLinkModalOpen(true)
  }

  const openEditLinkModal = (link: WebLinkItem) => {
    setEditingLink(link)
    setLinkTitle(link.title)
    setLinkDescription(link.description || '')
    setLinkUrl(link.url)
    setLinkBadge(link.badge || 'Link')
    setLinkAccent(link.accent || ACCENT_OPTIONS[0].value)
    setIsLinkModalOpen(true)
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-cyan-400" />
            Hero Showcase & Web Links
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage the large featured gallery images and official public web links displayed on the PhotoHub landing page.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="bg-neutral-900/80 border border-white/5 p-1 rounded-2xl">
          <TabsTrigger
            value="gallery"
            className="gap-2 font-bold text-xs sm:text-sm px-5 rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-neutral-950"
          >
            <ImageIcon className="h-4 w-4" />
            Spotlight Gallery ({galleryItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="links"
            className="gap-2 font-bold text-xs sm:text-sm px-5 rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-neutral-950"
          >
            <LinkIcon className="h-4 w-4" />
            Web Links ({webLinks.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Spotlight Gallery Management */}
        <TabsContent value="gallery" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Spotlight Photographs</h2>
              <p className="text-xs text-neutral-400">Photos will cycle in the dominant landing page hero stage.</p>
            </div>
            <Button
              onClick={openAddPhotoModal}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              Add Photo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item: any) => (
              <Card
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/40 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/30"
              >
                <div className="relative aspect-[16/10] w-full bg-black/60 overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-black/60 backdrop-blur-md text-cyan-300 border-white/10 text-[10px] font-bold uppercase">
                      {item.category || 'Featured'}
                    </Badge>
                  </div>
                  {item.is_seed && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">
                        Default Seed
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">{item.title}</h3>
                    {item.caption && (
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{item.caption}</p>
                    )}
                    <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                      {item.author ? `Photo by ${item.author}` : 'PhotoHub Master Works'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    {!item.is_seed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditPhotoModal(item)}
                        className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {!item.is_seed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this photo from hero gallery?')) {
                            deleteGalleryMutation.mutate(item.id)
                          }
                        }}
                        className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Web Links Management */}
        <TabsContent value="links" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Official Web Links</h2>
              <p className="text-xs text-neutral-400">Links displayed directly below the hero gallery on the landing page.</p>
            </div>
            <Button
              onClick={openAddLinkModal}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              Add Web Link
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webLinks.map((link) => (
              <Card
                key={link.id}
                className={cn(
                  'relative rounded-3xl border bg-neutral-900/40 backdrop-blur-xl p-5 flex flex-col justify-between transition-all hover:bg-neutral-900/80',
                  link.accent
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase border-white/10 text-neutral-300">
                      {link.badge || 'Portal'}
                    </Badge>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{link.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-2">{link.description}</p>
                  <p className="text-[11px] text-cyan-400 truncate mt-3 font-mono">{link.url}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-white/5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditLinkModal(link)}
                    className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${link.title}"?`)) {
                        deleteLinkMutation.mutate(link.id)
                      }
                    }}
                    className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Photo Modal (Add / Edit) */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-neutral-950 border border-white/10 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-cyan-400" />
              {editingPhoto ? 'Edit Gallery Photo' : 'Add Showcase Photo'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Upload and showcase high-resolution captures on the homepage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePhotoSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Photo Title *</Label>
              <Input
                value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
                placeholder="e.g. Architectural Symphony at Twilight"
                required
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPhotoCategory(cat)}
                    className={cn(
                      'text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all',
                      photoCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Caption / Story (Optional)</Label>
              <Textarea
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Short story or camera equipment details..."
                rows={2}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            {/* Image upload / preview */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Image File (Stored in Google Drive) *</Label>
              {photoPreviewUrl ? (
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-white/10 bg-black group">
                  <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <MediaUpload
                      accept="image/*"
                      onSuccess={(result) => {
                        setPhotoPreviewUrl(result.info.url)
                        setPhotoDriveFileId(result.info.public_id)
                      }}
                    >
                      {({ open, isUploading }) => (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => open()}
                          disabled={isUploading}
                          className="h-8 text-xs bg-black/70 hover:bg-black/90 text-white rounded-xl gap-1.5"
                        >
                          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Replace
                        </Button>
                      )}
                    </MediaUpload>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setPhotoPreviewUrl(null)
                        setPhotoDriveFileId(null)
                      }}
                      className="h-8 text-xs rounded-xl"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <MediaUpload
                  accept="image/*"
                  onSuccess={(result) => {
                    setPhotoPreviewUrl(result.info.url)
                    setPhotoDriveFileId(result.info.public_id)
                  }}
                >
                  {({ open, isUploading }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      disabled={isUploading}
                      className="w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl flex flex-col items-center justify-center p-6 gap-2 text-neutral-400 hover:text-white transition-all select-none group"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                          <span className="text-xs font-semibold text-neutral-300">Uploading to Google Drive...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                          <span className="text-xs font-semibold">Click to upload photo</span>
                          <span className="text-[10px] text-neutral-500">Stored safely on Google Drive</span>
                        </>
                      )}
                    </button>
                  )}
                </MediaUpload>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPhotoModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPhotoSubmitting}
                className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs px-5"
              >
                {isPhotoSubmitting ? 'Saving...' : editingPhoto ? 'Update Photo' : 'Add to Showcase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Web Link Modal (Add / Edit) */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-neutral-950 border border-white/10 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-cyan-400" />
              {editingLink ? 'Edit Web Link' : 'Add Web Link'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Configure official portals and social channels displayed on the landing page.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!linkTitle.trim() || !linkUrl.trim()) {
                toast.error('Title and URL are required')
                return
              }
              linkMutation.mutate()
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Official YouTube Channel"
                required
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target URL *</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                required
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Badge / Tag</Label>
              <Input
                value={linkBadge}
                onChange={(e) => setLinkBadge(e.target.value)}
                placeholder="e.g. Social, Channel, Institute"
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                placeholder="Short description of this channel or resource..."
                rows={2}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Accent Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setLinkAccent(opt.value)}
                    className={cn(
                      'text-left text-xs p-2 rounded-xl border transition-all',
                      linkAccent === opt.value
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-bold'
                        : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLinkModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={linkMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs px-5"
              >
                {linkMutation.isPending ? 'Saving...' : editingLink ? 'Update Link' : 'Add Web Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
