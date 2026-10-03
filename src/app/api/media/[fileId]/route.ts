import { NextRequest, NextResponse } from 'next/server'
import { drive, type drive_v3 } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'

function getGoogleAuth(): GoogleAuth {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (jsonKey) {
    try {
      const credentials = JSON.parse(jsonKey)
      return new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      })
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', e)
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not configured.')
  }

  privateKey = privateKey.replace(/\\n/g, '\n')

  return new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

import os from 'os'

// Cross-platform safe disk cache directory for high-speed delivery
const CACHE_DIR = path.join(os.tmpdir(), 'photohub-cache')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    if (!fileId || typeof fileId !== 'string' || fileId.includes('..') || fileId.includes('/')) {
      return new NextResponse('Invalid file ID', { status: 400 })
    }

    const cachedFilePath = path.join(CACHE_DIR, fileId)
    const cachedMetaPath = path.join(CACHE_DIR, `${fileId}.meta.json`)

    // 1. Check local cache first for instant 1ms response
    try {
      if (!existsSync(CACHE_DIR)) {
        await fs.mkdir(CACHE_DIR, { recursive: true })
      }

      if (existsSync(cachedFilePath) && existsSync(cachedMetaPath)) {
        const metaRaw = await fs.readFile(cachedMetaPath, 'utf-8')
        const meta = JSON.parse(metaRaw)
        const fileBuffer = await fs.readFile(cachedFilePath)

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': meta.mimeType || 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch (cacheErr) {
      console.warn('Cache lookup skipped, fetching fresh from Google Drive:', cacheErr)
    }

    // 2. Fetch from Google Drive using Service Account with Shared Drive support
    const auth = getGoogleAuth()
    const driveClient: drive_v3.Drive = drive({ version: 'v3', auth })

    // Fetch file metadata
    const metaRes = await driveClient.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true,
    })

    const mimeType = metaRes.data.mimeType || 'image/webp'

    // Fetch binary content
    const mediaRes = await driveClient.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'arraybuffer' }
    )

    const fileBuffer = Buffer.from(mediaRes.data as ArrayBuffer)

    // Save to local cache in the background for subsequent requests
    try {
      await fs.writeFile(cachedFilePath, fileBuffer)
      await fs.writeFile(
        cachedMetaPath,
        JSON.stringify({
          mimeType,
          name: metaRes.data.name,
          size: fileBuffer.length,
          cachedAt: new Date().toISOString(),
        })
      )
    } catch (saveErr) {
      console.warn('Failed to write file to local cache:', saveErr)
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error serving Google Drive media:', error?.message || error)
    return new NextResponse('Media not found or unavailable', { status: 404 })
  }
}
