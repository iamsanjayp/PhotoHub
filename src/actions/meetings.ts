'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard, isClubCoreMember } from '@/lib/constants/roles'

// Helper: Assert core member (admin, board_member, committee_member)
async function assertCoreMember() {
  const profile = await getCurrentProfile()
  if (!profile || !isClubCoreMember(profile.role)) {
    throw new Error('Unauthorized. Meetings are restricted to Board Members, Committee Members, and Admins.')
  }
  return profile
}

// Helper: Assert admin or board member
async function assertAdminOrBoard() {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminOrBoard(profile.role)) {
    throw new Error('Unauthorized. Only Admins and Board Members can perform this action.')
  }
  return profile
}

// 1. Get all meetings visible to current user
export async function getMeetings() {
  try {
    const profile = await assertCoreMember()
    const adminClient = await createAdminClient()

    const { data: meetings, error } = await adminClient
      .from('meetings')
      .select('*, profiles!meetings_created_by_fkey(id, full_name, roll_number, avatar_url, role), meeting_invites(user_id, profiles(id, full_name, roll_number, avatar_url)), meeting_attendance(id, user_id, attended, notes)')
      .order('scheduled_at', { ascending: false })

    if (error) throw error

    // Filter invite-only meetings: Admins & Board members see all; committee members see only if invited
    const isLead = isAdminOrBoard(profile.role)
    const filteredMeetings = (meetings || []).filter((meeting: any) => {
      if (!meeting.is_invite_only) return true
      if (isLead || meeting.created_by === profile.id) return true
      const isInvited = meeting.meeting_invites?.some((inv: any) => inv.user_id === profile.id)
      return isInvited
    })

    return { data: filteredMeetings }
  } catch (error: any) {
    console.error('Error in getMeetings:', error)
    return { error: error.message || 'Failed to fetch meetings' }
  }
}

// 2. Get single meeting details
export async function getMeetingDetails(meetingId: string) {
  try {
    const profile = await assertCoreMember()
    const adminClient = await createAdminClient()

    const { data: meeting, error } = await adminClient
      .from('meetings')
      .select('*, profiles!meetings_created_by_fkey(id, full_name, roll_number, avatar_url, role), meeting_invites(user_id, profiles(id, full_name, roll_number, avatar_url, role)), meeting_attendance(id, user_id, attended, notes, profiles!meeting_attendance_user_id_fkey(id, full_name, roll_number, avatar_url, role))')
      .eq('id', meetingId)
      .single()

    if (error) throw error
    if (!meeting) throw new Error('Meeting not found')

    // If invite only, check access
    const isLead = isAdminOrBoard(profile.role)
    if (meeting.is_invite_only && !isLead && meeting.created_by !== profile.id) {
      const isInvited = meeting.meeting_invites?.some((inv: any) => inv.user_id === profile.id)
      if (!isInvited) {
        throw new Error('You do not have permission to view this invite-only meeting.')
      }
    }

    return { data: meeting }
  } catch (error: any) {
    console.error('Error in getMeetingDetails:', error)
    return { error: error.message || 'Failed to fetch meeting details' }
  }
}

// 3. Create a new meeting (Admin or Board Member)
export async function createMeeting(input: {
  title: string
  description?: string
  scheduled_at: string
  venue?: string
  is_invite_only?: boolean
  invited_user_ids?: string[]
}) {
  try {
    const creator = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    if (!input.title || !input.scheduled_at) {
      throw new Error('Title and Scheduled Date/Time are required.')
    }

    const { data: meeting, error } = await adminClient
      .from('meetings')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        scheduled_at: input.scheduled_at,
        venue: input.venue?.trim() || null,
        is_invite_only: !!input.is_invite_only,
        status: 'scheduled',
        created_by: creator.id,
      })
      .select()
      .single()

    if (error) throw error

    // If invite-only or invited_user_ids specified, add invites
    if (meeting && input.invited_user_ids && input.invited_user_ids.length > 0) {
      const inviteRows = input.invited_user_ids.map((userId) => ({
        meeting_id: meeting.id,
        user_id: userId,
      }))

      const { error: inviteErr } = await adminClient
        .from('meeting_invites')
        .insert(inviteRows)

      if (inviteErr) {
        console.error('Error adding meeting invites:', inviteErr)
      }

      // Notify invited members
      const notifications = input.invited_user_ids.map((userId) => ({
        user_id: userId,
        title: 'Meeting Invitation',
        message: `You have been invited to "${meeting.title}" on ${new Date(meeting.scheduled_at).toLocaleDateString()}.`,
        type: 'info' as const,
        source_type: 'meeting',
        source_id: meeting.id,
      }))

      await adminClient.from('notifications').insert(notifications)
    }

    revalidatePath('/meetings')
    return { success: true, data: meeting }
  } catch (error: any) {
    console.error('Error in createMeeting:', error)
    return { error: error.message || 'Failed to create meeting' }
  }
}

// 4. Update Meeting MoM, Summary, and Status
export async function updateMeetingMoM(
  meetingId: string,
  input: {
    minutes_of_meeting?: string
    summary?: string
    status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  }
) {
  try {
    await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (input.minutes_of_meeting !== undefined) {
      updatePayload.minutes_of_meeting = input.minutes_of_meeting
    }
    if (input.summary !== undefined) {
      updatePayload.summary = input.summary
    }
    if (input.status !== undefined) {
      updatePayload.status = input.status
    }

    const { data, error } = await adminClient
      .from('meetings')
      .update(updatePayload)
      .eq('id', meetingId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/meetings')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateMeetingMoM:', error)
    return { error: error.message || 'Failed to update meeting notes' }
  }
}

// 5. Save Meeting Attendance Checklist
export async function saveMeetingAttendance(
  meetingId: string,
  records: Array<{
    user_id: string
    attended: boolean
    notes?: string | null
  }>
) {
  try {
    const marker = await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    if (!records || records.length === 0) {
      return { success: true }
    }

    const upsertRows = records.map((r) => ({
      meeting_id: meetingId,
      user_id: r.user_id,
      attended: r.attended,
      notes: r.notes || null,
      marked_by: marker.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await adminClient
      .from('meeting_attendance')
      .upsert(upsertRows, { onConflict: 'meeting_id,user_id' })

    if (error) throw error

    revalidatePath('/meetings')
    return { success: true }
  } catch (error: any) {
    console.error('Error in saveMeetingAttendance:', error)
    return { error: error.message || 'Failed to save attendance' }
  }
}

// 6. Delete Meeting
export async function deleteMeeting(meetingId: string) {
  try {
    await assertAdminOrBoard()
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (error) throw error

    revalidatePath('/meetings')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteMeeting:', error)
    return { error: error.message || 'Failed to delete meeting' }
  }
}
