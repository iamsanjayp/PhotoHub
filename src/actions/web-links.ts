'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
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

// Fallback 1: Announcements table storage
async function getLinksFromAnnouncements(adminClient: any): Promise<WebLinkItem[] | null> {
  try {
    const { data } = await adminClient
      .from('announcements')
      .select('content')
      .eq('title', '__SYSTEM_HERO_WEB_LINKS__')
      .maybeSingle()

    if (data?.content) {
      const parsed = JSON.parse(data.content)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('getLinksFromAnnouncements error:', e)
  }
  return null
}

async function saveLinksToAnnouncements(adminClient: any, links: WebLinkItem[]) {
  try {
    const { data: existing } = await adminClient
      .from('announcements')
      .select('id')
      .eq('title', '__SYSTEM_HERO_WEB_LINKS__')
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('announcements')
        .update({ content: JSON.stringify(links), updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await adminClient
        .from('announcements')
        .insert({
          title: '__SYSTEM_HERO_WEB_LINKS__',
          content: JSON.stringify(links),
          is_pinned: false,
          priority: 0,
        })
    }
  } catch (e) {
    console.error('saveLinksToAnnouncements error:', e)
  }
}

// Fallback 2: Local JSON file
function readLocalLinks(): WebLinkItem[] {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'web-links.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    // Ignore in production environments without local FS write
  }
  return DEFAULT_WEB_LINKS
}

function writeLocalLinks(links: WebLinkItem[]) {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'web-links.json')
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(links, null, 2), 'utf-8')
  } catch (e) {
    // Non-fatal if filesystem is read-only
  }
}

// 1. Get all web links
export async function getWebLinks(): Promise<{ data: WebLinkItem[] }> {
  try {
    const adminClient = await createAdminClient()
    
    // Try primary web_links table
    try {
      const { data, error } = await adminClient
        .from('web_links')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!error && data && data.length > 0) {
        return { data }
      }
    } catch {
      // Table may not exist yet
    }

    // Try fallback announcements store
    const annLinks = await getLinksFromAnnouncements(adminClient)
    if (annLinks && annLinks.length > 0) {
      return { data: annLinks }
    }

    // Try local JSON
    const local = readLocalLinks()
    return { data: local }
  } catch {
    return { data: DEFAULT_WEB_LINKS }
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

    const adminClient = await createAdminClient()

    // 1. Attempt DB insert into web_links
    let tableSuccess = false
    try {
      const { error } = await adminClient.from('web_links').insert(newItem)
      if (!error) tableSuccess = true
    } catch {
      tableSuccess = false
    }

    // 2. Fetch current list to update fallback
    const { data: currentLinks } = await getWebLinks()
    const updatedList = [...currentLinks, newItem]

    // 3. Save to announcements fallback if table was missing or failed
    if (!tableSuccess) {
      await saveLinksToAnnouncements(adminClient, updatedList)
    }

    // 4. Try local disk backup
    writeLocalLinks(updatedList)

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

    const adminClient = await createAdminClient()

    // 1. Attempt DB update
    let tableSuccess = false
    try {
      const { error } = await adminClient.from('web_links').update(updates).eq('id', id)
      if (!error) tableSuccess = true
    } catch {
      tableSuccess = false
    }

    // 2. Update fallback store
    const { data: currentLinks } = await getWebLinks()
    const updatedList = currentLinks.map((item) => (item.id === id ? { ...item, ...updates } : item))

    if (!tableSuccess) {
      await saveLinksToAnnouncements(adminClient, updatedList)
    }

    writeLocalLinks(updatedList)

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

    const adminClient = await createAdminClient()

    // 1. Attempt DB delete
    let tableSuccess = false
    try {
      const { error } = await adminClient.from('web_links').delete().eq('id', id)
      if (!error) tableSuccess = true
    } catch {
      tableSuccess = false
    }

    // 2. Update fallback store
    const { data: currentLinks } = await getWebLinks()
    const filteredList = currentLinks.filter((item) => item.id !== id)

    if (!tableSuccess) {
      await saveLinksToAnnouncements(adminClient, filteredList)
    }

    writeLocalLinks(filteredList)

    return { success: true }
  } catch (error: any) {
    console.error('deleteWebLink error:', error)
    return { error: error.message || 'Failed to delete web link' }
  }
}
