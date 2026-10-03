'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

import { isAdminOrBoard } from '@/lib/constants/roles'

async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminOrBoard(profile.role)) {
    throw new Error('Unauthorized. Admin or Board Member privileges required.')
  }
  return profile
}

export async function createChallenge(input: {
  title: string
  description?: string | null
  theme?: string | null
  banner_url?: string | null
  start_date: string
  end_date: string
  points?: number
  submission_mode?: 'image' | 'text' | 'link' | 'drive_link'
  external_link?: string | null
}) {
  try {
    const creator = await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        title: input.title,
        description: input.description || null,
        theme: input.theme || null,
        banner_url: input.banner_url || null,
        start_date: input.start_date,
        end_date: input.end_date,
        points: input.points ?? 20,
        submission_mode: input.submission_mode || 'image',
        max_submissions_per_user: 1,
        external_link: input.external_link || null,
        created_by: creator.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/challenges')
    revalidatePath('/admin/challenges')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createChallenge:', error)
    return { error: error.message || 'Failed to create challenge' }
  }
}

export async function getChallenges() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .is('deleted_at', null)
      .order('start_date', { ascending: false })

    if (error) throw error

    // Hydrate challenge submissions count
    const hydrated = await Promise.all(
      (data || []).map(async (c) => {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submittable_type', 'challenge')
          .eq('submittable_id', c.id)

        const { count: userCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submittable_type', 'challenge')
          .eq('submittable_id', c.id)
          .eq('user_id', profile.id)

        return {
          ...c,
          submission_count: count || 0,
          user_submission_count: userCount || 0,
        }
      })
    )

    return { data: hydrated }
  } catch (error: any) {
    console.error('Error in getChallenges:', error)
    return { error: error.message || 'Failed to fetch challenges' }
  }
}

export async function getChallengeById(id: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('challenges')
      .select('*, profiles(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    // Fetch user's submission details
    const { data: sub } = await supabase
      .from('submissions')
      .select('*')
      .eq('submittable_type', 'challenge')
      .eq('submittable_id', id)
      .eq('user_id', profile.id)
      .maybeSingle()

    return {
      data: {
        ...data,
        user_submission: sub || null,
      }
    }
  } catch (error: any) {
    console.error('Error in getChallengeById:', error)
    return { error: error.message || 'Failed to fetch challenge' }
  }
}

export async function deleteChallenge(id: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('challenges')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/challenges')
    revalidatePath('/admin/challenges')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteChallenge:', error)
    return { error: error.message || 'Failed to delete challenge' }
  }
}

// 5. ADMIN ONLY: Get full challenge export data
export async function getChallengeExportData(challengeId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (challengeError) throw challengeError

    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*, profiles:profiles!submissions_user_id_fkey(*)')
      .eq('submittable_type', 'challenge')
      .eq('submittable_id', challengeId)
      .order('created_at', { ascending: false })

    if (subError) throw subError

    return {
      data: {
        challenge,
        submissions: submissions || [],
      },
    }
  } catch (error: any) {
    console.error('Error in getChallengeExportData:', error)
    return { error: error.message || 'Failed to fetch challenge export data' }
  }
}

