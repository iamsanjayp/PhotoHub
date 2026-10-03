'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types/database'

function getPublicOrigin() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return process.env.SITE_URL || 'https://photohub.bitsathy.ac.in'
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = getPublicOrigin()

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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('getCurrentProfile -> getUser:', user?.email, user?.id, userError?.message)
    
    if (!user) return null

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || profileError) {
      console.log('getCurrentProfile -> fallback to admin client for profile check due to:', profileError?.message || 'null profile')
      const adminClient = await createAdminClient()
      const { data: adminProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (adminProfile) {
        profile = adminProfile
      } else {
        const email = user.email || ''
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]
        const { data: newProfile, error: insertError } = await adminClient
          .from('profiles')
          .insert({
            id: user.id,
            email: email,
            full_name: fullName,
            role: email === 'photohub@bitsathy.ac.in' ? 'admin' : 'member',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single()
        if (insertError) {
          console.error('getCurrentProfile -> adminClient insert error:', insertError)
        }
        profile = newProfile
      }
    }

    console.log('getCurrentProfile -> resolved profile:', profile?.email, profile?.role, profile?.is_active)
    return profile
  } catch (error) {
    console.error('Error in getCurrentProfile:', error)
    return null
  }
}

export async function adminAssignRole(userId: string, role: UserRole) {
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
