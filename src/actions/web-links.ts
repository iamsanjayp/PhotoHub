'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard } from '@/lib/constants/roles'
import fs from 'fs'
import path from 'path'

export interface WebLinkItem {
  id: string
  title: string
  description?: string | null
  url: string
  badge?: string | null
  accent?: string | null
  sort_order?: number
  created_at?: string
}

export const DEFAULT_WEB_LINKS: WebLinkItem[] = [
  {
    id: 'link-1',
    title: 'BIT Sathy Official Portal',
    description: 'Main website of Bannari Amman Institute of Technology, Sathyamangalam.',
    url: 'https://bitsathy.ac.in',
    badge: 'Institute',
    accent: 'border-cyan-500/30 hover:border-cyan-400 group-hover:text-cyan-400',
    sort_order: 1,
  },
  {
    id: 'link-2',
    title: 'Instagram (@photohub_bit)',
    description: 'Our primary visual feed featuring daily campus captures, reels, and stories.',
    url: 'https://instagram.com/photohub_bit',
    badge: 'Social Feed',
    accent: 'border-pink-500/30 hover:border-pink-400 group-hover:text-pink-400',
    sort_order: 2,
  },
  {
    id: 'link-3',
    title: 'PhotoHub YouTube Channel',
    description: 'Full-length event aftermovies, documentary reels, and student cinematography.',
    url: 'https://youtube.com',
    badge: 'Videos & Films',
    accent: 'border-red-500/30 hover:border-red-400 group-hover:text-red-400',
    sort_order: 3,
  },
  {
    id: 'link-4',
    title: 'Student Media Cloud Drive',
    description: 'Unlimited Google Drive media vault for high-resolution master event archives.',
    url: 'https://drive.google.com',
    badge: 'Media Vault',
    accent: 'border-amber-500/30 hover:border-amber-400 group-hover:text-amber-400',
    sort_order: 4,
  },
]

// Local JSON backup path
function getLocalFallbackPath() {
  return path.join(process.cwd(), 'src', 'data', 'web-links.json')
}

function readLocalLinks(): WebLinkItem[] {
  try {
    const filePath = getLocalFallbackPath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Error reading local web-links.json:', e)
  }
  return DEFAULT_WEB_LINKS
}

function writeLocalLinks(links: WebLinkItem[]) {
  try {
    const filePath = getLocalFallbackPath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(links, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local web-links.json:', e)
  }
}

// 1. Get all web links
export async function getWebLinks() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('web_links')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      const fallback = readLocalLinks()
      return { data: fallback }
    }

    return { data }
  } catch {
    const fallback = readLocalLinks()
    return { data: fallback }
  }
}

// 2. Create web link (Admin & Board)
export async function createWebLink(input: {
  title: string
  description?: string
  url: string
  badge?: string
  accent?: string
  sort_order?: number
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can add web links.' }
    }

    const newItem: WebLinkItem = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      url: input.url.trim(),
      badge: input.badge?.trim() || 'Link',
      accent: input.accent?.trim() || 'border-cyan-500/30 hover:border-cyan-400 group-hover:text-cyan-400',
      sort_order: input.sort_order || 0,
      created_at: new Date().toISOString(),
    }

    // Attempt DB insert
    let dbSuccess = false
    try {
      const adminClient = await createAdminClient()
      const { error } = await adminClient.from('web_links').insert(newItem)
      if (!error) dbSuccess = true
    } catch {
      dbSuccess = false
    }

    // Always sync local fallback
    const current = readLocalLinks()
    writeLocalLinks([...current, newItem])

    revalidatePath('/')
    revalidatePath('/admin/hero')
    return { success: true, data: newItem }
  } catch (error: any) {
    console.error('createWebLink error:', error)
    return { error: error.message || 'Failed to create web link' }
  }
}

// 3. Update web link (Admin & Board)
export async function updateWebLink(
  id: string,
  input: {
    title?: string
    description?: string
    url?: string
    badge?: string
    accent?: string
    sort_order?: number
  }
) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can update web links.' }
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    }
    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.description !== undefined) updates.description = input.description?.trim() || null
    if (input.url !== undefined) updates.url = input.url.trim()
    if (input.badge !== undefined) updates.badge = input.badge?.trim() || null
    if (input.accent !== undefined) updates.accent = input.accent?.trim() || null
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order

    // Attempt DB update
    try {
      const adminClient = await createAdminClient()
      await adminClient.from('web_links').update(updates).eq('id', id)
    } catch {
      // Ignored
    }

    // Update local fallback
    const current = readLocalLinks()
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    writeLocalLinks(updated)

    revalidatePath('/')
    revalidatePath('/admin/hero')
    return { success: true }
  } catch (error: any) {
    console.error('updateWebLink error:', error)
    return { error: error.message || 'Failed to update web link' }
  }
}

// 4. Delete web link (Admin & Board)
export async function deleteWebLink(id: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can delete web links.' }
    }

    // Attempt DB delete
    try {
      const adminClient = await createAdminClient()
      await adminClient.from('web_links').delete().eq('id', id)
    } catch {
      // Ignored
    }

    // Delete from local fallback
    const current = readLocalLinks()
    const filtered = current.filter((item) => item.id !== id)
    writeLocalLinks(filtered)

    revalidatePath('/')
    revalidatePath('/admin/hero')
    return { success: true }
  } catch (error: any) {
    console.error('deleteWebLink error:', error)
    return { error: error.message || 'Failed to delete web link' }
  }
}
