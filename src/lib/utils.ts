import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

export function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
  return format(new Date(dateString), formatStr)
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM dd, yyyy · h:mm a')
}

export function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false
  return isBefore(new Date(deadline), new Date())
}

export function isFutureDate(dateString: string): boolean {
  return isAfter(new Date(dateString), new Date())
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getMediaUrl(publicIdOrUrl: string | null | undefined, options?: {
  width?: number
  height?: number
  quality?: string
  format?: string
}): string {
  if (!publicIdOrUrl) return '/placeholder.png'

  // Map any direct Google Drive CDN or share links to our reliable high-speed media route
  const lh3Match = publicIdOrUrl.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
  const driveMatch = publicIdOrUrl.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/)
  const fileId = lh3Match?.[1] || driveMatch?.[1]
  if (fileId) {
    return `/api/media/${fileId}`
  }

  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://') || publicIdOrUrl.startsWith('/')) {
    return publicIdOrUrl
  }
  return `/uploads/${publicIdOrUrl}`
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string
  format?: string
}): string {
  return getMediaUrl(publicId, options)
}
