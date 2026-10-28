'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

import { isAdminOrBoard } from '@/lib/constants/roles'
import { parseStudentEmail } from '@/lib/student-email'

// Get members directory (Admin or Authenticated)
export async function getMembers() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const client = await createAdminClient()

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) throw error

    // Auto-capture department and batch for existing members whose fields are missing
    const enriched = (data || []).map((m: any) => {
      if (!m.email) return m
      const parsed = parseStudentEmail(m.email)
      if (!parsed) return m

      let needsDbUpdate = false
      const updates: any = {}

      const resolvedDept = m.department || parsed.department
      const resolvedBatch = m.batch || parsed.batch
      const resolvedName = m.full_name || parsed.name

      if (!m.department && parsed.department) {
        updates.department = parsed.department
        needsDbUpdate = true
      }
      if (!m.batch && parsed.batch) {
        updates.batch = parsed.batch
        needsDbUpdate = true
      }
      if (!m.full_name && parsed.name) {
        updates.full_name = parsed.name
        needsDbUpdate = true
      }

      if (needsDbUpdate) {
        // Asynchronously update in background
        Promise.resolve(
          client
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', m.id)
        ).catch(() => {})
      }

      return {
        ...m,
        department: resolvedDept,
        batch: resolvedBatch,
        full_name: resolvedName,
      }
    })

    return { data: enriched }
  } catch (error: any) {
    console.error('Error in getMembers:', error)
    return { error: error.message || 'Failed to fetch members' }
  }
}

// Explicit bulk sync action to backfill all registered members
export async function syncAllMembersFromEmail() {
  try {
    const adminProfile = await getCurrentProfile()
    if (!adminProfile) throw new Error('Unauthorized')

    const client = await createAdminClient()
    const { data: members, error } = await client
      .from('profiles')
      .select('id, email, department, batch, full_name')

    if (error) throw error

    let updatedCount = 0
    for (const m of (members || [])) {
      if (!m.email) continue
      const parsed = parseStudentEmail(m.email)
      if (!parsed) continue

      const updates: any = {}
      if (!m.department && parsed.department) {
        updates.department = parsed.department
      }
      if (!m.batch && parsed.batch) {
        updates.batch = parsed.batch
      }
      if (!m.full_name && parsed.name) {
        updates.full_name = parsed.name
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        const { error: updErr } = await client.from('profiles').update(updates).eq('id', m.id)
        if (!updErr) updatedCount++
      }
    }

    revalidatePath('/admin/members')
    revalidatePath('/members')
    return { success: true, count: updatedCount }
  } catch (err: any) {
    console.error('Error in syncAllMembersFromEmail:', err)
    return { error: err.message || 'Failed to sync members' }
  }
}

// Update current user's own profile details
export async function updateProfile(input: {
  full_name?: string | null
  roll_number?: string | null
  bio?: string | null
  phone?: string | null
  batch?: string | null
  department?: string | null
  skills?: string[] | null
  avatar_url?: string | null
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single()

    console.log('updateProfile result:', data, error)

    if (error) throw error

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    revalidatePath('/admin/members')
    
    console.log('updateProfile returning success')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateProfile:', error)
    return { error: error.message || 'Failed to update profile' }
  }
}

// Get public profile details
export async function getMemberById(id: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, roll_number, avatar_url, role, bio, skills, batch, department, phone, email, created_at')
      .eq('id', id)
      .single()

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getMemberById:', error)
    return { error: error.message || 'Failed to fetch member' }
  }
}
