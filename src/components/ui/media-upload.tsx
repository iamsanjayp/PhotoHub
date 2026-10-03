'use client'

import React, { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImageIcon, Loader2, UploadCloud } from 'lucide-react'

export interface MediaUploadResult {
  info: {
    secure_url: string
    url: string
    resource_type: 'image' | 'video'
    public_id: string
    thumbnail_url?: string | null
  }
}

interface MediaUploadProps {
  onSuccess?: (result: MediaUploadResult) => void
  onClose?: () => void
  uploadPreset?: string
  accept?: string
  children?: (props: { open: () => void; isUploading: boolean }) => React.ReactNode
  className?: string
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onSuccess,
  onClose,
  accept = 'image/*,video/*',
  children,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const open = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Enforce 10MB file size limit
    const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      toast.error(`File size (${fileSizeMB}MB) exceeds the 10MB limit. Please upload a file smaller than 10MB.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading media...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Reverted to API Route because Server Action size limits are buggy in Next.js 16
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await res.json()
      toast.success('Media uploaded successfully!', { id: toastId })

      if (onSuccess) {
        onSuccess({
          info: {
            secure_url: data.url,
            url: data.url,
            resource_type: data.media_type as 'image' | 'video',
            public_id: data.public_id,
            thumbnail_url: data.thumbnail_url || data.url,
          },
        })
      }
    } catch (error: any) {
      console.error('Media upload error:', error)
      toast.error(error.message || 'Error uploading file.', { id: toastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose?.()
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={isUploading}
      />
      {children ? (
        children({ open, isUploading })
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={isUploading}
          className={`w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl flex flex-col items-center justify-center p-6 gap-2 text-neutral-400 hover:text-white transition-all select-none ${className}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              <span className="text-xs font-semibold text-neutral-300">Uploading file...</span>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-cyan-400" />
              <span className="text-xs font-semibold">Click to choose image or video</span>
              <span className="text-[10px] text-neutral-500">Stored directly on your local independent server</span>
            </>
          )}
        </button>
      )}
    </>
  )
}
