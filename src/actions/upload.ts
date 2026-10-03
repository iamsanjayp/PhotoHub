'use server'

import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { isGoogleDriveConfigured, uploadToGoogleDrive } from '@/lib/google-drive'

export async function uploadMedia(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized. Please log in to upload media.' }
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return { error: 'No file provided.' }
    }

    const mimeType = file.type || ''
    const isImage = mimeType.startsWith('image/')
    const isVideo = mimeType.startsWith('video/')

    if (!isImage && !isVideo) {
      return { error: 'Invalid file format. Only images and videos are allowed.' }
    }

    const originalName = file.name || 'media'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Google Drive direct upload if credentials configured (0 bytes on server disk)
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadToGoogleDrive(buffer, originalName, mimeType)
        return {
          success: true,
          url: driveResult.url,
          media_type: driveResult.mediaType,
          public_id: driveResult.fileId,
          thumbnail_url: driveResult.thumbnailUrl,
          storage: 'google_drive',
        }
      } catch (driveError: any) {
        console.error('Google Drive upload failed, falling back to local disk:', driveError)
      }
    }

    // 2. Local Disk Fallback
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const extension = path.extname(originalName) || (isVideo ? '.mp4' : '.webp')
    const baseName = path.basename(originalName, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const filename = `${baseName}-${uniqueId}${extension}`
    const filePath = path.join(uploadDir, filename)

    await fs.writeFile(filePath, buffer)
    const mediaUrl = `/uploads/${filename}`

    return {
      success: true,
      url: mediaUrl,
      media_type: isVideo ? 'video' : 'image',
      public_id: filename,
      thumbnail_url: isImage ? mediaUrl : null,
      storage: 'local',
    }
  } catch (error: any) {
    console.error('Error in uploadMedia server action:', error)
    return { error: error?.message || 'Internal server error during file upload.' }
  }
}
