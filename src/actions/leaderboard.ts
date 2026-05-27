'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

// Get leaderboard list joined with profiles
export async function getLeaderboard(period: 'total' | 'monthly' | 'semester' = 'total') {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    
    // Determine order field
    let orderField = 'total_points'
    if (period === 'monthly') orderField = 'monthly_points'
    if (period === 'semester') orderField = 'semester_points'

    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('*, profiles(*)')
      .order(orderField, { ascending: false })
      .limit(50)

    if (error) throw error

    // Re-rank items since the ranks in cache are static and might be for total_points
    const rankedData = (data || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))

    return { data: rankedData }
  } catch (error: any) {
    console.error('Error in getLeaderboard:', error)
    return { error: error.message || 'Failed to fetch leaderboard' }
  }
}

// Get user points overview
export async function getUserPoints(userId?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const targetUserId = userId || profile.id
    const supabase = await createClient()

    const { data: cacheEntry, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (error) throw error

    return {
      data: cacheEntry || {
        user_id: targetUserId,
        total_points: 0,
        monthly_points: 0,
        semester_points: 0,
        event_count: 0,
        submission_count: 0,
        rank: 9999,
      }
    }
  } catch (error: any) {
    console.error('Error in getUserPoints:', error)
    return { error: error.message || 'Failed to fetch user points' }
  }
}

// Get point logs for a user
export async function getPointsLog(userId?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const targetUserId = userId || profile.id
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('points_log')
      .select('*, profiles!points_log_awarded_by_fkey(full_name)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getPointsLog:', error)
    return { error: error.message || 'Failed to fetch points log' }
  }
}

// ADMIN ONLY: Award manual points
export async function awardManualPoints(userId: string, points: number, reason: string) {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('points_log')
      .insert({
        user_id: userId,
        points,
        reason,
        source_type: 'manual',
        awarded_by: admin.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Refresh the leaderboard cache
    await supabase.rpc('refresh_leaderboard')

    revalidatePath('/leaderboard')
    revalidatePath('/admin/leaderboard')
    revalidatePath(`/profile/${userId}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in awardManualPoints:', error)
    return { error: error.message || 'Failed to award points' }
  }
}

// ADMIN ONLY: Refresh leaderboard cache
export async function refreshLeaderboardCache() {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }
    const supabase = await createClient()
    await supabase.rpc('refresh_leaderboard')
    revalidatePath('/leaderboard')
    revalidatePath('/admin/leaderboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error in refreshLeaderboardCache:', error)
    return { error: error.message || 'Failed to refresh leaderboard' }
  }
}
