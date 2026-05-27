'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

export async function createSubmission(input: {
  submittable_type: 'event' | 'challenge' | 'apex'
  submittable_id: string
  content_type: 'image' | 'text' | 'link' | 'drive_link'
  content_url?: string | null
  caption?: string | null
  external_link?: string | null
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. If it's an event submission, check if user is registered
    if (input.submittable_type === 'event') {
      const { data: reg, error: regError } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', input.submittable_id)
        .eq('user_id', profile.id)
        .maybeSingle()

      if (regError || !reg) {
        throw new Error('You must be registered for this event to submit.')
      }
    }

    // 2. Insert submission
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        user_id: profile.id,
        submittable_type: input.submittable_type,
        submittable_id: input.submittable_id,
        content_type: input.content_type,
        content_url: input.content_url || null,
        caption: input.caption || null,
        external_link: input.external_link || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already submitted for this entry.')
      }
      throw error
    }

    // Revalidate paths
    revalidatePath(`/events/${input.submittable_id}`)
    revalidatePath(`/challenges/${input.submittable_id}`)
    revalidatePath(`/admin/events/${input.submittable_id}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createSubmission:', error)
    return { error: error.message || 'Failed to submit' }
  }
}

// Get all submissions for a specific submittable entity (event, challenge, apex)
export async function getSubmissions(submittableType: 'event' | 'challenge' | 'apex', submittableId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('submissions')
      .select('*, profiles:profiles!submissions_user_id_fkey(*)')
      .eq('submittable_type', submittableType)
      .eq('submittable_id', submittableId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getSubmissions:', error)
    return { error: error.message || 'Failed to fetch submissions' }
  }
}

// Get own submission for a specific submittable entity
export async function getMySubmission(submittableType: 'event' | 'challenge' | 'apex', submittableId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return { data: null }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('submittable_type', submittableType)
      .eq('submittable_id', submittableId)
      .eq('user_id', profile.id)
      .maybeSingle()

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getMySubmission:', error)
    return { error: error.message || 'Failed to fetch your submission' }
  }
}

// Get user's own submissions history
export async function getUserSubmissions(userId?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const targetUserId = userId || profile.id
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('submissions')
      .select('*, events(title), challenges(title)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getUserSubmissions:', error)
    return { error: error.message || 'Failed to fetch user submissions' }
  }
}

// ADMIN ONLY: Score a submission and provide feedback
export async function scoreSubmission(submissionId: string, score: number, feedback: string) {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('submissions')
      .update({
        score,
        feedback,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/events/${data.submittable_id}`)
    revalidatePath(`/events/${data.submittable_id}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in scoreSubmission:', error)
    return { error: error.message || 'Failed to score submission' }
  }
}

// ADMIN ONLY: Update submission status (approve/reject)
export async function updateSubmissionStatus(submissionId: string, status: 'approved' | 'rejected') {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('submissions')
      .update({
        status,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) throw error

    // Refresh leaderboard cache since points are awarded via trigger
    await supabase.rpc('refresh_leaderboard')

    revalidatePath(`/admin/events/${data.submittable_id}`)
    revalidatePath(`/events/${data.submittable_id}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateSubmissionStatus:', error)
    return { error: error.message || 'Failed to update submission status' }
  }
}
