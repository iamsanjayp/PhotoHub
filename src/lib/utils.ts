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

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string
  format?: string
}): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const transforms = []

  if (options?.width) transforms.push(`w_${options.width}`)
  if (options?.height) transforms.push(`h_${options.height}`)
  transforms.push(`q_${options?.quality || 'auto'}`)
  transforms.push(`f_${options?.format || 'webp'}`)

  const transformStr = transforms.join(',')
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicId}`
}
