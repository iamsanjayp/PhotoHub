'use client'

import { useState, useTransition } from 'react'
import { createPost } from '@/actions/posts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CldUploadWidget } from 'next-cloudinary'
import { PlusCircle, Loader2, Image as ImageIcon, Video, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function CreatePostDialog() {
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState('')
  const [media, setMedia] = useState<Array<{
    media_type: 'image' | 'video'
    url: string
    thumbnail_url?: string | null
    cloudinary_public_id?: string | null
  }>>([])
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleUploadSuccess = (result: any) => {
    const info = result.info
    if (info && typeof info === 'object' && 'secure_url' in info) {
      setMedia((prev) => [
        ...prev,
        {
          media_type: info.resource_type === 'video' ? 'video' : 'image',
          url: info.secure_url,
          thumbnail_url: info.thumbnail_url || null,
          cloudinary_public_id: info.public_id || null,
        },
      ])
      toast.success('Media added!')
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!caption && media.length === 0) {
      toast.error('Post content cannot be empty.')
      return
    }

    startTransition(async () => {
      const result = await createPost({
        caption,
        media,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Post submitted for moderation approval.')
        setCaption('')
        setMedia([])
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ['approved-posts'] })
        queryClient.invalidateQueries({ queryKey: ['pending-posts'] })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl gap-2 shadow-md shadow-cyan-500/10 h-10" />
      }>
        <PlusCircle className="h-5 w-5" />
        <span>New Post</span>
      </DialogTrigger>
      <DialogContent className="bg-neutral-950 border-white/5 text-neutral-200 rounded-3xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold text-white">Create New Post</DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Share your best photographs or videography with the club. Posts go to the moderation queue before showing on the feed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Caption text */}
          <div className="space-y-2">
            <Label htmlFor="caption" className="text-neutral-300 font-semibold text-xs">Caption</Label>
            <Textarea
              id="caption"
              placeholder="What's the story behind this shot? Write details..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-sm"
            />
          </div>

          {/* Media previews list */}
          {media.length > 0 && (
            <div className="space-y-2">
              <Label className="text-neutral-300 font-semibold text-xs">Media Previews ({media.length})</Label>
              <div className="grid grid-cols-3 gap-3">
                {media.map((item, idx) => (
                  <div key={idx} className="group relative aspect-square border border-white/5 bg-neutral-900 rounded-xl overflow-hidden">
                    {item.media_type === 'image' ? (
                      <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                        Video
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload widget trigger */}
          <div className="space-y-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">Add media to post:</span>
            <CldUploadWidget
              uploadPreset="photohub_unsigned"
              onSuccess={handleUploadSuccess}
              onClose={() => {
                document.body.style.overflow = '';
                document.body.style.pointerEvents = '';
              }}
            >
              {({ open }) => (
                <Button
                  type="button"
                  onClick={() => open()}
                  variant="outline"
                  className="h-9 border-white/10 hover:bg-white/5 text-xs font-semibold rounded-xl text-white gap-1.5"
                >
                  <ImageIcon className="h-4 w-4 text-neutral-400" />
                  <span>Upload Image/Video</span>
                </Button>
              )}
            </CldUploadWidget>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="outline"
              className="border-white/10 hover:bg-white/5 rounded-xl text-white text-xs h-10 px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl text-xs flex items-center gap-1.5 h-10 px-5 shadow-lg shadow-cyan-500/10"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Publish Post
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
