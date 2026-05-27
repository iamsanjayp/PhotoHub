'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'leader'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }
  return profile
}

export async function createAnnouncement(input: {
  title: string
  content: string
  is_pinned?: boolean
  expires_at?: string | null
  external_link?: string | null
}) {
  try {
    const creator = await assertAdminOrLeader()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: input.title,
        content: input.content,
        is_pinned: input.is_pinned || false,
        expires_at: input.expires_at || null,
        external_link: input.external_link || null,
        created_by: creator.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/announcements')
    revalidatePath('/dashboard')
    revalidatePath('/admin/announcements')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createAnnouncement:', error)
    return { error: error.message || 'Failed to create announcement' }
  }
}

export async function updateAnnouncement(announcementId: string, input: {
  title?: string
  content?: string
  is_pinned?: boolean
  expires_at?: string | null
}) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('announcements')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/announcements')
    revalidatePath('/dashboard')
    revalidatePath('/admin/announcements')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateAnnouncement:', error)
    return { error: error.message || 'Failed to update announcement' }
  }
}

export async function deleteAnnouncement(announcementId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { error } = await supabase
      .from('announcements')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId)

    if (error) throw error

    revalidatePath('/announcements')
    revalidatePath('/dashboard')
    revalidatePath('/admin/announcements')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteAnnouncement:', error)
    return { error: error.message || 'Failed to delete announcement' }
  }
}

export async function pinAnnouncement(announcementId: string, isPinned: boolean) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { error } = await supabase
      .from('announcements')
      .update({
        is_pinned: isPinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId)

    if (error) throw error

    revalidatePath('/announcements')
    revalidatePath('/dashboard')
    revalidatePath('/admin/announcements')
    return { success: true }
  } catch (error: any) {
    console.error('Error in pinAnnouncement:', error)
    return { error: error.message || 'Failed to pin announcement' }
  }
}

export async function getAnnouncements(includeExpired = false) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    let query = supabase
      .from('announcements')
      .select('*, profiles(*)')
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (!includeExpired) {
      const now = new Date().toISOString()
      // Filter where expires_at is null or in the future
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`)
    }

    const { data, error } = await query

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getAnnouncements:', error)
    return { error: error.message || 'Failed to fetch announcements' }
  }
}
