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

// 1. Shortlist an approved post to the IG Queue
export async function shortlistPost(postId: string) {
  try {
    const admin = await assertAdminOrLeader()
    const supabase = await createClient()

    // Check if post is approved
    const { data: post } = await supabase
      .from('posts')
      .select('status, caption')
      .eq('id', postId)
      .single()

    if (!post || post.status !== 'approved') {
      throw new Error('Only approved posts can be added to the Instagram Queue.')
    }

    const { data, error } = await supabase
      .from('instagram_queue')
      .insert({
        post_id: postId,
        caption: post.caption,
        status: 'shortlisted',
        managed_by: admin.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Post is already in the Instagram Queue.')
      }
      throw error
    }

    revalidatePath('/admin/instagram-queue')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in shortlistPost:', error)
    return { error: error.message || 'Failed to add post to queue' }
  }
}

// 2. Schedule a queue item
export async function schedulePost(queueId: string, scheduledFor: string, draftCaption?: string | null) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { error } = await supabase
      .from('instagram_queue')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledFor,
        caption: draftCaption || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    if (error) throw error

    revalidatePath('/admin/instagram-queue')
    return { success: true }
  } catch (error: any) {
    console.error('Error in schedulePost:', error)
    return { error: error.message || 'Failed to schedule post' }
  }
}

// 3. Mark as posted
export async function markAsPosted(queueId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { error } = await supabase
      .from('instagram_queue')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    if (error) throw error

    revalidatePath('/admin/instagram-queue')
    return { success: true }
  } catch (error: any) {
    console.error('Error in markAsPosted:', error)
    return { error: error.message || 'Failed to update post status' }
  }
}

// 4. Archive from queue
export async function archiveFromQueue(queueId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    const { error } = await supabase
      .from('instagram_queue')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    if (error) throw error

    revalidatePath('/admin/instagram-queue')
    return { success: true }
  } catch (error: any) {
    console.error('Error in archiveFromQueue:', error)
    return { error: error.message || 'Failed to archive queue item' }
  }
}

// 5. Get all queue items
export async function getQueueItems(status?: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createClient()

    let query = supabase
      .from('instagram_queue')
      .select('*, posts(*, profiles:profiles!posts_user_id_fkey(*), post_media(*)), profiles!instagram_queue_managed_by_fkey(*)')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getQueueItems:', error)
    return { error: error.message || 'Failed to fetch queue' }
  }
}
