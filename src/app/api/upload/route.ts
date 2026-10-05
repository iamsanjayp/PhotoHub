import { NextResponse, type NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { isGoogleDriveConfigured, uploadToGoogleDrive } from '@/lib/google-drive'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to upload media.' },
        { status: 401 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formErr: any) {
      console.error('FormData error in /api/upload:', formErr)
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit. Please upload a smaller file.' },
        { status: 413 }
      )
    }

    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      )
    }

    // Enforce 10MB server-side limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit. Please upload a file smaller than 10MB.' },
        { status: 413 }
      )
    }

    // 2. Validate file type
    const mimeType = file.type || ''
    const isImage = mimeType.startsWith('image/')
    const isVideo = mimeType.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Invalid file format. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    const originalName = file.name || 'media'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. If Google Drive is configured, stream upload directly to unlimited Google Drive (0 bytes on server disk!)
    if (isGoogleDriveConfigured()) {
      try {
        const driveResult = await uploadToGoogleDrive(buffer, originalName, mimeType)

        return NextResponse.json({
          success: true,
          url: driveResult.url,
          media_type: driveResult.mediaType,
          public_id: driveResult.fileId,
          thumbnail_url: driveResult.thumbnailUrl,
          storage: 'google_drive',
        })
      } catch (driveError: any) {
        console.error('❌ Google Drive upload failed, attempting local fallback:', {
          message: driveError?.message,
          code: driveError?.code,
          details: driveError?.response?.data || driveError?.errors,
        })
        // If Drive upload errors out, fall back to local disk so user is never blocked
      }
    }

    // 4. Local Disk Fallback (Used when Google Drive credentials are not yet set in .env)
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

    return NextResponse.json({
      success: true,
      url: mediaUrl,
      media_type: isVideo ? 'video' : 'image',
      public_id: filename,
      thumbnail_url: isImage ? mediaUrl : null,
      storage: 'local',
    })
  } catch (error: any) {
    console.error('Error in /api/upload:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error during file upload.' },
      { status: 500 }
    )
  }
}
