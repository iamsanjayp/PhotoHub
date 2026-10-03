'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard, isClubCoreMember, canAccessCamera, ROLE_LABELS } from '@/lib/constants/roles'

// Helper: Assert authenticated user
async function assertAuth() {
  const profile = await getCurrentProfile()
  if (!profile) {
    throw new Error('Unauthorized. Please sign in.')
  }
  return profile
}

// Helper: Assert admin or board member
async function assertAdminOrBoard() {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminOrBoard(profile.role)) {
    throw new Error('Unauthorized. Only Admins and Board Members have access to this action.')
  }
  return profile
}

// Helper: Assert core club member (admin, board_member, committee_member)
async function assertCoreMember() {
  const profile = await getCurrentProfile()
  if (!profile || !isClubCoreMember(profile.role)) {
    throw new Error('Unauthorized. Access is restricted to Board Members, Committee Members, and Admins.')
  }
  return profile
}

// ============================================================
// IDEA SUBMISSIONS (Accessible to all members)
// ============================================================

// 1. Submit a shoot idea (All members)
export async function submitShootIdea(input: {
  title: string
  description: string
  category?: string
  reference_links?: string
}) {
  try {
    const profile = await assertAuth()
    const supabase = await createClient()

    if (!input.title || !input.description) {
      throw new Error('Title and Description are required.')
    }

    const { data, error } = await supabase
      .from('shoot_ideas')
      .insert({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category?.trim() || 'creative',
        reference_links: input.reference_links?.trim() || null,
        status: 'pending',
        created_by: profile.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/ideas')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in submitShootIdea:', error)
    return { error: error.message || 'Failed to submit idea' }
  }
}

// 2. Get all shoot ideas (All members can view)
export async function getShootIdeas() {
  try {
    await assertAuth()
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('shoot_ideas')
      .select('*, profiles!shoot_ideas_created_by_fkey(id, full_name, roll_number, avatar_url, role), reviewer:profiles!shoot_ideas_reviewed_by_fkey(id, full_name, roll_number)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getShootIdeas:', error)
    return { error: error.message || 'Failed to fetch shoot ideas' }
  }
}

// 3. Review a shoot idea (Admin or Board Member)
// If approved: awards points and automatically creates a PH Shoot project!
export async function reviewShootIdea(
  ideaId: string,
  input: {
    status: 'approved' | 'rejected'
    review_notes?: string
    points?: number
  }
) {
  try {
    const admin = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    // Fetch the idea first
    const { data: idea, error: fetchErr } = await adminClient
      .from('shoot_ideas')
      .select('*, profiles!shoot_ideas_created_by_fkey(id, full_name)')
      .eq('id', ideaId)
      .single()

    if (fetchErr || !idea) throw new Error('Shoot idea not found')

    const pointsToAward = input.points ?? 20
    const willAwardPoints = input.status === 'approved' && !idea.points_awarded

    // 1. Update idea record
    const { error: updateErr } = await adminClient
      .from('shoot_ideas')
      .update({
        status: input.status,
        reviewed_by: admin.id,
        review_notes: input.review_notes || null,
        points_awarded: willAwardPoints ? true : idea.points_awarded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    // 2. If approved, create the PH Shoot project
    if (input.status === 'approved') {
      const { data: newShoot, error: shootErr } = await adminClient
        .from('ph_shoots')
        .insert({
          idea_id: idea.id,
          title: idea.title,
          description: idea.description,
          status: 'planning',
          created_by: admin.id,
        })
        .select()
        .single()

      if (shootErr) {
        console.error('Error creating ph_shoot from approved idea:', shootErr)
      }

      // Award points to idea submitter
      if (willAwardPoints && idea.created_by) {
        await adminClient.from('points_log').insert({
          user_id: idea.created_by,
          points: pointsToAward,
          reason: `Shoot idea approved: "${idea.title}"`,
          source_type: 'shoot_idea',
          source_id: idea.id,
          awarded_by: admin.id,
          created_at: new Date().toISOString(),
        })

        await adminClient.rpc('refresh_leaderboard')
      }

      // Notify the submitter
      await adminClient.from('notifications').insert({
        user_id: idea.created_by,
        title: 'Shoot Idea Approved! 🎬',
        message: `Your shoot idea "${idea.title}" was approved by ${admin.full_name || 'the team'} and moved to PH Shoots! (+${pointsToAward} pts)`,
        type: 'success',
        source_type: 'shoot_idea',
        source_id: idea.id,
      })
    } else {
      // Notify rejected
      await adminClient.from('notifications').insert({
        user_id: idea.created_by,
        title: 'Shoot Idea Update',
        message: `Your shoot idea "${idea.title}" was reviewed: ${input.review_notes || 'Not approved at this time.'}`,
        type: 'warning',
        source_type: 'shoot_idea',
        source_id: idea.id,
      })
    }

    revalidatePath('/ideas')
    revalidatePath('/shoots')
    return { success: true }
  } catch (error: any) {
    console.error('Error in reviewShootIdea:', error)
    return { error: error.message || 'Failed to review shoot idea' }
  }
}

// ============================================================
// PH SHOOTS (Management for core members & crew)
// ============================================================

// 4. Get all PH Shoots
export async function getPhShoots() {
  try {
    const profile = await assertAuth()
    const isCore = isClubCoreMember(profile.role)

    const adminClient = await createAdminClient()

    const { data: shoots, error } = await adminClient
      .from('ph_shoots')
      .select('*, creator:profiles!ph_shoots_created_by_fkey(id, full_name, roll_number, avatar_url), idea:shoot_ideas(id, title, category, description), assignments:shoot_assignments(*, profiles:profiles!shoot_assignments_user_id_fkey(id, full_name, roll_number, avatar_url, role))')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Core members see all shoots. Normal members only see shoots they are assigned to.
    const visibleShoots = (shoots || []).filter((shoot: any) => {
      if (isCore) return true
      return shoot.assignments?.some((a: any) => a.user_id === profile.id)
    })

    return { data: visibleShoots }
  } catch (error: any) {
    console.error('Error in getPhShoots:', error)
    return { error: error.message || 'Failed to fetch shoots' }
  }
}

// 5. Get Single PH Shoot Details
export async function getPhShootDetails(shootId: string) {
  try {
    const profile = await assertAuth()
    const adminClient = await createAdminClient()

    const { data: shoot, error } = await adminClient
      .from('ph_shoots')
      .select('*, creator:profiles!ph_shoots_created_by_fkey(id, full_name, roll_number, avatar_url), idea:shoot_ideas(id, title, category, description), assignments:shoot_assignments(*, profiles:profiles!shoot_assignments_user_id_fkey(id, full_name, roll_number, avatar_url, role))')
      .eq('id', shootId)
      .single()

    if (error) throw error
    if (!shoot) throw new Error('Shoot not found')

    const isCore = isClubCoreMember(profile.role)
    const isAssigned = shoot.assignments?.some((a: any) => a.user_id === profile.id)
    if (!isCore && !isAssigned) {
      throw new Error('Unauthorized. You do not have access to this shoot.')
    }

    return { data: shoot }
  } catch (error: any) {
    console.error('Error in getPhShootDetails:', error)
    return { error: error.message || 'Failed to fetch shoot details' }
  }
}

// 6. Create Shoot directly (Admin or Board Member)
export async function createPhShoot(input: {
  title: string
  description?: string
  location?: string
  shoot_date?: string
  post_date?: string
}) {
  try {
    const admin = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    if (!input.title) throw new Error('Shoot title is required.')

    const { data, error } = await adminClient
      .from('ph_shoots')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        shoot_date: input.shoot_date || null,
        post_date: input.post_date || null,
        status: 'planning',
        created_by: admin.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/shoots')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createPhShoot:', error)
    return { error: error.message || 'Failed to create shoot' }
  }
}

// 7. Update Shoot details (Admin or Board Member)
export async function updatePhShoot(
  shootId: string,
  input: {
    title?: string
    description?: string
    location?: string
    shoot_date?: string | null
    post_date?: string | null
    status?: 'planning' | 'scheduled' | 'shooting' | 'editing' | 'completed' | 'cancelled'
  }
) {
  try {
    await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('ph_shoots')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shootId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/shoots')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updatePhShoot:', error)
    return { error: error.message || 'Failed to update shoot' }
  }
}

// 8. Assign Crew Member to Shoot (Admin or Board Member)
// CRITICAL RULE: Camera roles can ONLY be assigned to Admin, Board Member, or Committee Member!
// Normal members can be assigned Director, Editor, Sound, Writer, Actor, etc.
export async function assignShootCrew(input: {
  shoot_id: string
  user_id: string
  role: string
  notes?: string
}) {
  try {
    const admin = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    if (!input.shoot_id || !input.user_id || !input.role) {
      throw new Error('Shoot ID, Member, and Role are required.')
    }

    // Fetch the target user's profile to verify permissions
    const { data: targetUser, error: userErr } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', input.user_id)
      .single()

    if (userErr || !targetUser) throw new Error('Member not found')

    // Camera role restriction check
    const normalizedRole = input.role.toLowerCase()
    const isCameraRole = /camera|cinematograph|dop|videograph/i.test(normalizedRole)

    if (isCameraRole && !canAccessCamera(targetUser.role)) {
      const userRoleLabel = ROLE_LABELS[targetUser.role as keyof typeof ROLE_LABELS] || targetUser.role
      throw new Error(
        `Camera & cinematography roles can ONLY be assigned to Board Members and Committee Members. ${targetUser.full_name || 'This user'} is currently a '${userRoleLabel}'.`
      )
    }

    // Fetch shoot title for notification
    const { data: shoot } = await adminClient
      .from('ph_shoots')
      .select('title')
      .eq('id', input.shoot_id)
      .single()

    // Insert or update assignment
    const { data, error } = await adminClient
      .from('shoot_assignments')
      .upsert(
        {
          shoot_id: input.shoot_id,
          user_id: input.user_id,
          role: input.role.trim(),
          status: 'pending',
          notes: input.notes?.trim() || null,
          assigned_by: admin.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shoot_id,user_id,role' }
      )
      .select()
      .single()

    if (error) throw error

    // Notify member
    await adminClient.from('notifications').insert({
      user_id: input.user_id,
      title: 'New Shoot Assignment 🎬',
      message: `You have been assigned as "${input.role}" for the shoot "${shoot?.title || 'PH Shoot'}". Please accept or decline.`,
      type: 'assignment',
      source_type: 'shoot',
      source_id: input.shoot_id,
    })

    revalidatePath('/shoots')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in assignShootCrew:', error)
    return { error: error.message || 'Failed to assign crew member' }
  }
}

// 9. Remove Crew Assignment (Admin or Board Member)
export async function removeShootCrew(assignmentId: string) {
  try {
    await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('shoot_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) throw error

    revalidatePath('/shoots')
    return { success: true }
  } catch (error: any) {
    console.error('Error in removeShootCrew:', error)
    return { error: error.message || 'Failed to remove crew assignment' }
  }
}

// 10. Accept or Decline Assignment (Assigned user or Admin)
export async function respondShootAssignment(
  assignmentId: string,
  status: 'accepted' | 'declined'
) {
  try {
    const profile = await assertAuth()
    const adminClient = await createAdminClient()

    // Fetch assignment
    const { data: assignment, error: fetchErr } = await adminClient
      .from('shoot_assignments')
      .select('*, shoot:ph_shoots(title)')
      .eq('id', assignmentId)
      .single()

    if (fetchErr || !assignment) throw new Error('Assignment not found')

    const isAuthorized = assignment.user_id === profile.id || isAdminOrBoard(profile.role)
    if (!isAuthorized) {
      throw new Error('Unauthorized to respond to this assignment.')
    }

    const { error: updateErr } = await adminClient
      .from('shoot_assignments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)

    if (updateErr) throw updateErr

    revalidatePath('/shoots')
    return { success: true }
  } catch (error: any) {
    console.error('Error in respondShootAssignment:', error)
    return { error: error.message || 'Failed to update assignment status' }
  }
}

// 11. Complete Shoot and Award Points to Confirmed Crew Members (Admin or Board Member)
export async function completePhShoot(shootId: string, pointsPerMember: number = 30) {
  try {
    const admin = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    // Fetch shoot + accepted assignments
    const { data: shoot, error: fetchErr } = await adminClient
      .from('ph_shoots')
      .select('*, assignments:shoot_assignments(*)')
      .eq('id', shootId)
      .single()

    if (fetchErr || !shoot) throw new Error('Shoot not found')

    // Mark shoot as completed
    const { error: updateErr } = await adminClient
      .from('ph_shoots')
      .update({
        status: 'completed',
        points_awarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shootId)

    if (updateErr) throw updateErr

    // Award points to all accepted crew members
    const acceptedAssignments = (shoot.assignments || []).filter(
      (a: any) => a.status === 'accepted'
    )

    if (acceptedAssignments.length > 0 && !shoot.points_awarded) {
      const pointLogs = acceptedAssignments.map((a: any) => ({
        user_id: a.user_id,
        points: pointsPerMember,
        reason: `Crew role (${a.role}) in PH Shoot: "${shoot.title}"`,
        source_type: 'shoot_completed',
        source_id: shoot.id,
        awarded_by: admin.id,
        created_at: new Date().toISOString(),
      }))

      await adminClient.from('points_log').insert(pointLogs)

      // Notify crew members
      const notifications = acceptedAssignments.map((a: any) => ({
        user_id: a.user_id,
        title: 'Shoot Completed! 🏆',
        message: `The shoot "${shoot.title}" is officially completed! You earned ${pointsPerMember} points for your work as ${a.role}.`,
        type: 'success' as const,
        source_type: 'shoot',
        source_id: shoot.id,
      }))

      await adminClient.from('notifications').insert(notifications)

      await adminClient.rpc('refresh_leaderboard')
    }

    revalidatePath('/shoots')
    return { success: true }
  } catch (error: any) {
    console.error('Error in completePhShoot:', error)
    return { error: error.message || 'Failed to complete shoot' }
  }
}
