'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

import { isAdminOrBoard } from '@/lib/constants/roles'

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

    return { data }
  } catch (error: any) {
    console.error('Error in getMembers:', error)
    return { error: error.message || 'Failed to fetch members' }
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
