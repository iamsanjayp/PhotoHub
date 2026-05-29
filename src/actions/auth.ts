'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        hd: 'bitsathy.ac.in',
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function getCurrentProfile() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
  } catch (error) {
    console.error('Error in getCurrentProfile:', error)
    return null
  }
}

export async function adminAssignRole(userId: string, role: 'admin' | 'leader' | 'camera_holder' | 'participant' | 'guest') {
  try {
    // Verify requester is admin
    const profile = await getCurrentProfile()
    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized. Only admins can assign roles.' }
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/admin/members')
    return { success: true }
  } catch (error: any) {
    console.error('Error in adminAssignRole:', error)
    return { error: error.message || 'Failed to update role' }
  }
}

export async function deactivateAccount(userId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ 
        is_active: false, 
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)

    if (error) throw error

    // Optionally also suspend the user in auth.users
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      userId,
      { ban_duration: '876600h' } // ban for 100 years
    )

    if (banError) {
      console.error('Error banning user in auth:', banError)
    }

    revalidatePath('/admin/members')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deactivateAccount:', error)
    return { error: error.message || 'Failed to deactivate account' }
  }
}

export async function reactivateAccount(userId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ 
        is_active: true, 
        deactivated_at: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)

    if (error) throw error

    // Remove ban in auth.users
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      userId,
      { ban_duration: 'none' }
    )

    if (banError) {
      console.error('Error unbanning user in auth:', banError)
    }

    revalidatePath('/admin/members')
    return { success: true }
  } catch (error: any) {
    console.error('Error in reactivateAccount:', error)
    return { error: error.message || 'Failed to reactivate account' }
  }
}
