import { drive, type drive_v3 } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'
import { Readable } from 'stream'
import sharp from 'sharp'
import path from 'path'

function cleanEnvValue(val: string | undefined): string {
  if (!val) return ''
  return val.trim().replace(/^["']|["']$/g, '').trim()
}

/**
 * Checks whether Google Drive credentials are configured in the environment.
 */
export function isGoogleDriveConfigured(): boolean {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const email = cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL)
  const key = cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY)
  const folderId = cleanEnvValue(process.env.GOOGLE_DRIVE_FOLDER_ID)
  return !!((jsonKey || (email && key)) && folderId)
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

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

  const clientEmail = cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL)
  let privateKey = cleanEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY)

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not fully configured in environment variables.')
  }

  // Handle newlines in private key string whether passed as \n or actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n')

  return new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

export interface DriveUploadResult {
  fileId: string
  url: string
  thumbnailUrl: string
  filename: string
  mediaType: 'image' | 'video'
}

/**
 * Optimizes image buffer with Sharp: converts to WebP, limits max dimensions to 2560px.
 * If file is video or processing fails, returns original buffer.
 */
export async function optimizeMediaBuffer(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const isImage = mimeType.startsWith('image/')
  if (!isImage) {
    return { buffer, filename: originalFilename, mimeType }
  }

  try {
    const ext = path.extname(originalFilename)
    const baseName = path.basename(originalFilename, ext)
    const optimizedFilename = `${baseName}.webp`

    const optimized = await sharp(buffer)
      .resize({
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer()

    return {
      buffer: optimized,
      filename: optimizedFilename,
      mimeType: 'image/webp',
    }
  } catch (err) {
    console.warn('Sharp optimization skipped, using original buffer:', err)
    return { buffer, filename: originalFilename, mimeType }
  }
}

/**
 * Uploads a file buffer directly to PhotoHub's unlimited Google Drive folder.
 * Makes the file viewable via Google's high-speed CDN endpoint.
 */
export async function uploadToGoogleDrive(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<DriveUploadResult> {
  const auth = getGoogleAuth()
  const driveClient: drive_v3.Drive = drive({ version: 'v3', auth })

  const folderId = cleanEnvValue(process.env.GOOGLE_DRIVE_FOLDER_ID)

  // 1. Optimize images automatically before upload to save bandwidth & speed up loading
  const { buffer: uploadBuffer, filename, mimeType: finalMimeType } = await optimizeMediaBuffer(
    buffer,
    originalFilename,
    mimeType
  )

  const isVideo = finalMimeType.startsWith('video/')

  // 2. Upload file to Google Drive
  const fileMetadata: drive_v3.Schema$File = {
    name: filename,
    ...(folderId ? { parents: [folderId] } : {}),
  }

  const media = {
    mimeType: finalMimeType,
    body: bufferToStream(uploadBuffer),
  }

  const response = await driveClient.files.create({
    supportsAllDrives: true,
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
  })

  const fileId = response.data.id
  if (!fileId) {
    throw new Error('Google Drive did not return a valid file ID.')
  }

  // 3. Set permission so anyone with the link can view (public CDN view)
  try {
    await driveClient.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
  } catch (permErr: any) {
    console.warn('Warning: Could not set public permission on Drive file:', permErr?.message)
  }

  // 4. Construct high-speed media viewing URL served reliably via PhotoHub media API
  const cdnUrl = `/api/media/${fileId}`
  const thumbnailUrl = `/api/media/${fileId}`

  return {
    fileId,
    url: cdnUrl,
    thumbnailUrl,
    filename,
    mediaType: isVideo ? 'video' : 'image',
  }
}

/**
 * Deletes or trashes a file from Google Drive (supports Shared Drives).
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<boolean> {
  if (!fileId) return false
  try {
    const auth = getGoogleAuth()
    const driveClient: drive_v3.Drive = drive({ version: 'v3', auth })

    try {
      await driveClient.files.delete({
        fileId,
        supportsAllDrives: true,
      })
      return true
    } catch (delErr: any) {
      // If direct delete fails (e.g. requires organizer permission in shared drive), attempt trashing
      await driveClient.files.update({
        fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true,
      })
      return true
    }
  } catch (err: any) {
    console.warn(`Failed to delete or trash file ${fileId} from Drive:`, err?.message)
    return false
  }
}
