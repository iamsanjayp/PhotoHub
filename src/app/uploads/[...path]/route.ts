import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: filePathArray } = await params
    
    if (!filePathArray || filePathArray.length === 0) {
      return new NextResponse('File not found', { status: 404 })
    }

    const filename = filePathArray.join('/')
    // Ensure we are resolving to the public/uploads directory securely
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(baseUploadDir, filename)
    
    // Security check to prevent directory traversal attacks
    if (!filePath.startsWith(baseUploadDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath)
    
    // Determine the content type based on the file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.gif') contentType = 'image/gif'
    else if (ext === '.webp') contentType = 'image/webp'
    else if (ext === '.mp4') contentType = 'video/mp4'
    else if (ext === '.webm') contentType = 'video/webm'
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
