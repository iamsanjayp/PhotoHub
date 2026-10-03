'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard } from '@/lib/constants/roles'

// Get leaderboard list joined with profiles
export async function getLeaderboard(period: 'total' | 'monthly' | 'semester' = 'total') {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const adminClient = await createAdminClient()

    // Refresh leaderboard cache to make sure latest point logs and activities are calculated
    await adminClient.rpc('refresh_leaderboard')

    // Determine order field
    let orderField = 'total_points'
    if (period === 'monthly') orderField = 'monthly_points'
    if (period === 'semester') orderField = 'semester_points'

    const { data, error } = await adminClient
      .from('leaderboard_cache')
      .select('*, profiles(*)')
      .order(orderField, { ascending: false })
      .limit(100)

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
    const adminClient = await createAdminClient()

    const { data: cacheEntry, error } = await adminClient
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
      },
    }
  } catch (error: any) {
    console.error('Error in getUserPoints:', error)
    return { error: error.message || 'Failed to fetch user points' }
  }
}

// Get point logs for a user or global activity for admins
export async function getPointsLog(userId?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const adminClient = await createAdminClient()

    let query = adminClient
      .from('points_log')
      .select(
        '*, recipient:profiles!points_log_user_id_fkey(id, full_name, roll_number, avatar_url, role), awarder:profiles!points_log_awarded_by_fkey(id, full_name), profiles:profiles!points_log_awarded_by_fkey(full_name)'
      )
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (!isAdminOrBoard(profile.role)) {
      // Normal members only see their own point history
      query = query.eq('user_id', profile.id)
    }
    // If admin or board member and no userId passed, returns all points activity across the club!

    const { data, error } = await query.limit(100)

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
    if (!admin || !isAdminOrBoard(admin.role)) {
      throw new Error('Unauthorized')
    }

    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
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

    // Notify user of points
    await adminClient.from('notifications').insert({
      user_id: userId,
      title: points >= 0 ? 'Points Awarded! 🏆' : 'Points Deducted',
      message: `${points >= 0 ? '+' : ''}${points} points: ${reason}`,
      type: points >= 0 ? 'success' : 'warning',
      source_type: 'manual_points',
      source_id: data.id,
    })

    // Refresh the leaderboard cache immediately
    await adminClient.rpc('refresh_leaderboard')

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
    if (!admin || !isAdminOrBoard(admin.role)) {
      throw new Error('Unauthorized')
    }
    const adminClient = await createAdminClient()
    await adminClient.rpc('refresh_leaderboard')
    revalidatePath('/leaderboard')
    revalidatePath('/admin/leaderboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error in refreshLeaderboardCache:', error)
    return { error: error.message || 'Failed to refresh leaderboard' }
  }
}
