'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

// Get notifications for current user
export async function getNotifications() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getNotifications:', error)
    return { error: error.message || 'Failed to fetch notifications' }
  }
}

// Mark a single notification as read
export async function markAsRead(notificationId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', profile.id)

    if (error) throw error

    revalidatePath('/notifications')
    return { success: true }
  } catch (error: any) {
    console.error('Error in markAsRead:', error)
    return { error: error.message || 'Failed to update notification' }
  }
}

// Mark all notifications as read
export async function markAllAsRead() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    if (error) throw error

    revalidatePath('/notifications')
    return { success: true }
  } catch (error: any) {
    console.error('Error in markAllAsRead:', error)
    return { error: error.message || 'Failed to mark all as read' }
  }
}

// Get count of unread notifications
export async function getUnreadCount() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return { count: 0 }

    const supabase = await createClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    if (error) throw error

    return { count: count || 0 }
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error)
    return { count: 0 }
  }
}
