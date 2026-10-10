'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { createEventSchema, type CreateEventInput, type UpdateEventInput } from '@/lib/validators/events'
import { revalidatePath } from 'next/cache'

import { isAdminOrBoard, isClubCoreMember } from '@/lib/constants/roles'
import { addMissedAttendanceRecord, getMissedAttendanceRecords } from './missed-attendance'


// Helper for role checks
async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminOrBoard(profile.role)) {
    throw new Error('Unauthorized. Admin or Board Member privileges required.')
  }
  return profile
}

// 1. ADMIN ONLY: Create Event
export async function createEvent(input: CreateEventInput) {
  try {
    const creator = await assertAdminOrLeader()
    const validated = createEventSchema.parse(input)
    const supabase = await createAdminClient()

    // Handle max_participants parsing if passed as empty string
    const maxParticipants = validated.max_participants === '' || validated.max_participants === undefined 
      ? null 
      : validated.max_participants

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: validated.title,
        description: validated.description || null,
        banner_url: validated.banner_url || null,
        event_type: validated.event_type,
        venue: validated.venue || null,
        start_date: validated.start_date,
        end_date: validated.end_date,
        registration_deadline: validated.registration_deadline || null,
        max_participants: maxParticipants,
        points: validated.points,
        visibility: validated.visibility,
        submission_required: validated.submission_required,
        submission_mode: validated.submission_mode || null,
        external_link: validated.external_link || null,
        created_by: creator.id,
        is_published: true,
      })
      .select()
      .single()

    if (error) throw error

    if (data && (input as any).invited_user_ids?.length) {
      const inviteRows = (input as any).invited_user_ids.map((uid: string) => ({
        event_id: data.id,
        user_id: uid,
        invited_by: creator.id,
      }))
      await supabase.from('event_invites').upsert(inviteRows, { onConflict: 'event_id,user_id' })
    }

    revalidatePath('/events')
    revalidatePath('/admin/events')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createEvent:', error)
    return { error: error.message || 'Failed to create event' }
  }
}

// 2. ADMIN ONLY: Update Event
export async function updateEvent(eventId: string, input: UpdateEventInput) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    // Filter fields to only update allowed columns
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.banner_url !== undefined) updateData.banner_url = input.banner_url
    if (input.event_type !== undefined) updateData.event_type = input.event_type
    if (input.venue !== undefined) updateData.venue = input.venue
    if (input.start_date !== undefined) updateData.start_date = input.start_date
    if (input.end_date !== undefined) updateData.end_date = input.end_date
    if (input.registration_deadline !== undefined) updateData.registration_deadline = input.registration_deadline
    if (input.max_participants !== undefined) {
      updateData.max_participants = input.max_participants === '' ? null : input.max_participants
    }
    if (input.points !== undefined) updateData.points = input.points
    if (input.visibility !== undefined) updateData.visibility = input.visibility
    if (input.submission_required !== undefined) updateData.submission_required = input.submission_required
    if (input.submission_mode !== undefined) updateData.submission_mode = input.submission_mode
    if (input.external_link !== undefined) updateData.external_link = input.external_link || null

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}`)
    revalidatePath('/events')
    revalidatePath('/admin/events')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateEvent:', error)
    return { error: error.message || 'Failed to update event' }
  }
}

// 3. ADMIN ONLY: Soft Delete Event
export async function deleteEvent(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('events')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (error) throw error

    revalidatePath('/events')
    revalidatePath('/admin/events')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteEvent:', error)
    return { error: error.message || 'Failed to delete event' }
  }
}

// 4. AUTHENTICATED: Get list of events with registration counts
export async function getEvents(filters?: {
  type?: string
  visibility?: string
  status?: 'upcoming' | 'past' | 'all'
  search?: string
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const client = isAdminOrBoard(profile.role)
      ? await createAdminClient()
      : await createClient()
    let query = client
      .from('events')
      .select('*')
      .is('deleted_at', null)
      .order('start_date', { ascending: true })

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('event_type', filters.type)
    }

    if (filters?.visibility && filters.visibility !== 'all') {
      query = query.eq('visibility', filters.visibility)
    }

    const now = new Date().toISOString()
    if (filters?.status === 'upcoming') {
      query = query.gte('end_date', now)
    } else if (filters?.status === 'past') {
      query = query.lt('end_date', now)
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch user's event invites if not admin/board
    let invitedEventIdSet = new Set<string>()
    if (!isAdminOrBoard(profile.role)) {
      const { data: userInvites } = await client
        .from('event_invites')
        .select('event_id')
        .eq('user_id', profile.id)
      if (userInvites) {
        userInvites.forEach((inv: any) => invitedEventIdSet.add(inv.event_id))
      }
    }

    // Role-based visibility filtering:
    // - admin/board: all events
    // - committee_member: public, members_only, and invite_only (if invited)
    // - member: public, and invite_only (if invited). CANNOT view members_only!
    const visibleEvents = (data || []).filter((event: any) => {
      if (isAdminOrBoard(profile.role)) return true
      if (event.visibility === 'public') return true
      if (event.visibility === 'members_only') {
        return isClubCoreMember(profile.role)
      }
      if (event.visibility === 'invite_only') {
        return invitedEventIdSet.has(event.id)
      }
      return false
    })

    // Fetch registration counts and user's registration status
    const eventsWithMeta = await Promise.all(
      visibleEvents.map(async (event: any) => {
        // Fetch count
        const { count } = await client
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)

        // Check if current user is registered
        const { data: reg } = await client
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', event.id)
          .eq('user_id', profile.id)
          .maybeSingle()

        return {
          ...event,
          registration_count: count || 0,
          is_registered: !!reg,
          registration_status: reg?.status || null
        }
      })
    )

    return { data: eventsWithMeta }
  } catch (error: any) {
    console.error('Error in getEvents:', error)
    return { error: error.message || 'Failed to fetch events' }
  }
}

// 5. AUTHENTICATED: Get single event details
export async function getEventById(eventId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: event, error } = await supabase
      .from('events')
      .select('*, profiles(*)')
      .eq('id', eventId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    // Role-based visibility check for single event
    if (!isAdminOrBoard(profile.role)) {
      if (event.visibility === 'members_only' && !isClubCoreMember(profile.role)) {
        return { error: 'Restricted: This event is open only to Board and Committee Members.' }
      }
      if (event.visibility === 'invite_only') {
        const { data: invite } = await supabase
          .from('event_invites')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', profile.id)
          .maybeSingle()
        if (!invite) {
          return { error: 'Restricted: This event is invite-only.' }
        }
      }
    }

    // Registration count
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    // User registration status
    const { data: reg } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .maybeSingle()

    return {
      data: {
        ...event,
        registration_count: count || 0,
        is_registered: !!reg,
        registration_details: reg || null
      }
    }
  } catch (error: any) {
    console.error('Error in getEventById:', error)
    return { error: error.message || 'Failed to fetch event detail' }
  }
}

// 5b. ADMIN/BOARD: Manage Event Invites
export async function getEventInvites(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('event_invites')
      .select('*, profiles:profiles!event_invites_user_id_fkey(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { data: data || [] }
  } catch (error: any) {
    console.error('Error in getEventInvites:', error)
    return { error: error.message || 'Failed to fetch event invites' }
  }
}

export async function inviteUsersToEvent(eventId: string, userIds: string[]) {
  try {
    const admin = await assertAdminOrLeader()
    if (!userIds || userIds.length === 0) return { success: true }
    const supabase = await createAdminClient()

    const rows = userIds.map((uid) => ({
      event_id: eventId,
      user_id: uid,
      invited_by: admin.id,
    }))

    const { error } = await supabase
      .from('event_invites')
      .upsert(rows, { onConflict: 'event_id,user_id' })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in inviteUsersToEvent:', error)
    return { error: error.message || 'Failed to invite users' }
  }
}

export async function removeEventInvite(eventId: string, userId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('event_invites')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in removeEventInvite:', error)
    return { error: error.message || 'Failed to remove invite' }
  }
}

// 6. MEMBER: Register for Event
export async function registerForEvent(eventId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Fetch event limits and deadlines
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    const now = new Date()
    
    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < now) {
      throw new Error('Registration deadline has passed.')
    }

    // Check capacity limit
    if (event.max_participants) {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (count && count >= event.max_participants) {
        throw new Error('Registration is full for this event.')
      }
    }

    // 2. Perform insert
    const { error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: profile.id,
        status: 'registered',
        registered_at: new Date().toISOString(),
      })

    if (regError) {
      if (regError.code === '23505') {
        throw new Error('You are already registered for this event.')
      }
      throw regError
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath('/events')
    return { success: true }
  } catch (error: any) {
    console.error('Error in registerForEvent:', error)
    return { error: error.message || 'Registration failed' }
  }
}

// 7. MEMBER: Unregister from Event
export async function unregisterFromEvent(eventId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Check deadline if applicable
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    const now = new Date()
    if (event.registration_deadline && new Date(event.registration_deadline) < now) {
      throw new Error('Cannot cancel registration after the deadline.')
    }

    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', profile.id)

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath('/events')
    return { success: true }
  } catch (error: any) {
    console.error('Error in unregisterFromEvent:', error)
    return { error: error.message || 'Cancellation failed' }
  }
}

// 8. ADMIN ONLY: Get Event Registrations
export async function getEventRegistrations(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*, profiles(*)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getEventRegistrations:', error)
    return { error: error.message || 'Failed to fetch registrations' }
  }
}

// 9. ADMIN ONLY: Mark user attendance
export async function markAttendance(eventId: string, userId: string, attended: boolean) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const updateData: any = {
      attended,
    }

    if (attended) {
      updateData.checked_in_at = new Date().toISOString()
    } else {
      updateData.checked_in_at = null
    }

    const { error } = await supabase
      .from('event_registrations')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) throw error

    // Refresh leaderboard cache since points are awarded via trigger
    await supabase.rpc('refresh_leaderboard')

    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in markAttendance:', error)
    return { error: error.message || 'Failed to mark attendance' }
  }
}

// 10. ADMIN ONLY: Bulk mark attendance
export async function bulkMarkAttendance(eventId: string, userIds: string[], attended: boolean) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const updateData: any = {
      attended,
    }

    if (attended) {
      updateData.checked_in_at = new Date().toISOString()
    } else {
      updateData.checked_in_at = null
    }

    const { error } = await supabase
      .from('event_registrations')
      .update(updateData)
      .eq('event_id', eventId)
      .in('user_id', userIds)

    if (error) throw error

    // Refresh leaderboard cache since points are awarded via trigger
    await supabase.rpc('refresh_leaderboard')

    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in bulkMarkAttendance:', error)
    return { error: error.message || 'Failed to update attendance' }
  }
}

// 11. ADMIN ONLY: Select event winners
export async function selectWinners(eventId: string, submissionIds: string[]) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    // 1. Reset winners for this submittable
    await supabase
      .from('submissions')
      .update({ status: 'approved' }) // revert old winners to approved status
      .eq('submittable_type', 'event')
      .eq('submittable_id', eventId)
      .eq('status', 'winner')

    // 2. Set new winners
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'winner' })
      .in('id', submissionIds)

    if (error) throw error

    revalidatePath(`/admin/events/${eventId}`)
    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in selectWinners:', error)
    return { error: error.message || 'Failed to select winners' }
  }
}

// 12. ADMIN ONLY: Get event analytics
export async function getEventAnalytics(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    // Registrations count
    const { count: registered } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    // Attendance count
    const { count: attended } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('attended', true)

    // Submissions count
    const { count: submitted } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submittable_type', 'event')
      .eq('submittable_id', eventId)

    return {
      data: {
        registered: registered || 0,
        attended: attended || 0,
        submitted: submitted || 0,
        attendance_rate: registered ? Math.round((attended || 0) / registered * 100) : 0,
        submission_rate: registered ? Math.round((submitted || 0) / registered * 100) : 0,
      }
    }
  } catch (error: any) {
    console.error('Error in getEventAnalytics:', error)
    return { error: error.message || 'Failed to fetch analytics' }
  }
}

// 13. ADMIN ONLY: Get full export data for an event (event, registrations, submissions)
export async function getEventExportData(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('*, profiles(*)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    if (regError) throw regError

    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*, profiles:profiles!submissions_user_id_fkey(*)')
      .eq('submittable_type', 'event')
      .eq('submittable_id', eventId)
      .order('created_at', { ascending: false })

    if (subError) throw subError

    return {
      data: {
        event,
        registrations: registrations || [],
        submissions: submissions || [],
      },
    }
  } catch (error: any) {
    console.error('Error in getEventExportData:', error)
    return { error: error.message || 'Failed to fetch event export data' }
  }
}

// ============================================================
// 14. OTP ATTENDANCE & ATTENDEE FEEDBACK SYSTEM
// ============================================================

const EVENT_OTP_TAG = '<!-- EVENT_OTP_CONFIG:'
const EVENT_OTP_END = '-->'
const EVENT_FEEDBACK_TAG = '<!-- EVENT_FEEDBACK_LIST:'
const EVENT_FEEDBACK_END = '-->'

export interface OtpMetaConfig {
  otp: string
  active: boolean
  updated_at?: string
}

export interface EventFeedbackItem {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_roll?: string
  rating: number
  feedback: string
  created_at: string
}

function parseOtpConfig(text: string | null | undefined): OtpMetaConfig | null {
  if (!text || !text.includes(EVENT_OTP_TAG)) return null
  try {
    const start = text.indexOf(EVENT_OTP_TAG) + EVENT_OTP_TAG.length
    const end = text.indexOf(EVENT_OTP_END, start)
    if (end === -1) return null
    return JSON.parse(text.substring(start, end).trim())
  } catch {
    return null
  }
}

function updateOtpConfigInText(text: string | null | undefined, config: OtpMetaConfig): string {
  const base = (text || '').replace(new RegExp(`${EVENT_OTP_TAG}[\\s\\S]*?${EVENT_OTP_END}`, 'g'), '').trim()
  const block = `\n\n${EVENT_OTP_TAG} ${JSON.stringify(config)} ${EVENT_OTP_END}`
  return base ? `${base}${block}` : block.trim()
}

function parseEventFeedback(text: string | null | undefined): EventFeedbackItem[] {
  if (!text || !text.includes(EVENT_FEEDBACK_TAG)) return []
  try {
    const start = text.indexOf(EVENT_FEEDBACK_TAG) + EVENT_FEEDBACK_TAG.length
    const end = text.indexOf(EVENT_FEEDBACK_END, start)
    if (end === -1) return []
    const parsed = JSON.parse(text.substring(start, end).trim())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function updateEventFeedbackInText(text: string | null | undefined, list: EventFeedbackItem[]): string {
  const base = (text || '').replace(new RegExp(`${EVENT_FEEDBACK_TAG}[\\s\\S]*?${EVENT_FEEDBACK_END}`, 'g'), '').trim()
  const block = `\n\n${EVENT_FEEDBACK_TAG} ${JSON.stringify(list)} ${EVENT_FEEDBACK_END}`
  return base ? `${base}${block}` : block.trim()
}

// 14a. ADMIN: Set Event OTP and Active Status
export async function setEventAttendanceOtp(eventId: string, otp: string, active: boolean) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const cleanOtp = otp.trim().toUpperCase()
    const config: OtpMetaConfig = {
      otp: cleanOtp,
      active,
      updated_at: new Date().toISOString(),
    }

    // 1. Try updating native columns if present
    let updatedNative = false
    try {
      const { error } = await supabase
        .from('events')
        .update({
          attendance_otp: cleanOtp,
          attendance_otp_active: active,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', eventId)

      if (!error) updatedNative = true
    } catch {
      updatedNative = false
    }

    // 2. Fallback update via description metadata
    if (!updatedNative) {
      const { data: ev } = await supabase
        .from('events')
        .select('description')
        .eq('id', eventId)
        .single()

      await supabase
        .from('events')
        .update({
          description: updateOtpConfigInText(ev?.description, config),
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
    }

    revalidatePath(`/admin/events/${eventId}`)
    revalidatePath(`/events/${eventId}`)

    return { success: true, config }
  } catch (error: any) {
    console.error('Error in setEventAttendanceOtp:', error)
    return { error: error.message || 'Failed to set event OTP' }
  }
}

// 14b. GET Event OTP Configuration
export async function getEventOtpConfig(eventId: string) {
  try {
    const profile = await getCurrentProfile()
    const supabase = await createAdminClient()

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error || !event) throw new Error('Event not found')

    // Determine OTP config from columns or fallback metadata
    let config: OtpMetaConfig = {
      otp: (event as any).attendance_otp || '',
      active: !!(event as any).attendance_otp_active,
    }

    if (!config.otp) {
      const meta = parseOtpConfig(event.description)
      if (meta) {
        config = meta
      }
    }

    // Check attendance status for the current user if logged in
    let isCheckedIn = false
    let hasSubmittedFeedback = false
    if (profile) {
      const { data: reg } = await supabase
        .from('event_registrations')
        .select('attended')
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
        .maybeSingle()

      isCheckedIn = !!reg?.attended

      // Check feedback
      try {
        const { data: fb } = await supabase
          .from('event_feedback')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', profile.id)
          .maybeSingle()
        if (fb) hasSubmittedFeedback = true
      } catch {
        // Fallback
        const feedbacks = parseEventFeedback(event.description)
        hasSubmittedFeedback = feedbacks.some((f) => f.user_id === profile.id)
      }
    }

    // Role-based disclosure: Only leadership sees the actual OTP string
    const isLeadership = profile ? isAdminOrBoard(profile.role) : false

    return {
      data: {
        active: config.active,
        otp: isLeadership ? config.otp : undefined,
        isCheckedIn,
        hasSubmittedFeedback,
      },
    }
  } catch (error: any) {
    console.error('Error in getEventOtpConfig:', error)
    return { error: error.message || 'Failed to fetch OTP config' }
  }
}

// 14c. MEMBER: Verify OTP and Claim Attendance
export async function verifyAndCheckInWithOtp(eventId: string, enteredOtp: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      throw new Error('Please sign in to verify attendance.')
    }

    const supabase = await createAdminClient()

    // 1. Fetch event and verify OTP
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (evErr || !event) throw new Error('Event not found')

    let activeOtp = (event as any).attendance_otp || ''
    let isActive = !!(event as any).attendance_otp_active

    if (!activeOtp) {
      const meta = parseOtpConfig(event.description)
      if (meta) {
        activeOtp = meta.otp
        isActive = meta.active
      }
    }

    if (!isActive) {
      throw new Error('OTP check-in is not currently open for this event.')
    }

    if (!activeOtp || enteredOtp.trim().toUpperCase() !== activeOtp.trim().toUpperCase()) {
      throw new Error('Invalid OTP code. Please check with event organizers.')
    }

    // 2. Ensure registration exists (upsert)
    const { data: reg, error: regErr } = await supabase
      .from('event_registrations')
      .select('id, attended')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!reg) {
      // Auto-register attendee if they have the live OTP
      await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: profile.id,
          status: 'registered',
          attended: true,
          checked_in_at: new Date().toISOString(),
          registered_at: new Date().toISOString(),
        })
    } else {
      // Mark attended
      await supabase
        .from('event_registrations')
        .update({
          attended: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', reg.id)
    }

    // 3. Refresh leaderboard points
    await supabase.rpc('refresh_leaderboard')

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}`)

    return {
      success: true,
      message: 'Attendance verified successfully! Please submit your event feedback below.',
    }
  } catch (error: any) {
    console.error('Error in verifyAndCheckInWithOtp:', error)
    return { error: error.message || 'OTP verification failed' }
  }
}

// 14d. MEMBER: Submit Event Feedback and (optional) PCDP Missed Attendance
export async function submitEventFeedbackAndMissedAttendance(
  eventId: string,
  input: {
    rating: number
    feedback: string
    missedHours?: number[]
    rollNumber?: string
    notes?: string
  }
) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Please sign in to submit feedback.')

    const supabase = await createAdminClient()
    const cleanRating = Math.max(1, Math.min(5, Number(input.rating) || 5))
    const cleanFeedback = input.feedback?.trim() || ''

    // 1. Record feedback in native table or metadata fallback
    let savedNativeFb = false
    try {
      const { error: fbErr } = await supabase
        .from('event_feedback')
        .upsert(
          {
            event_id: eventId,
            user_id: profile.id,
            rating: cleanRating,
            feedback: cleanFeedback,
          },
          { onConflict: 'event_id,user_id' }
        )

      if (!fbErr) savedNativeFb = true
    } catch {
      savedNativeFb = false
    }

    if (!savedNativeFb) {
      const { data: ev } = await supabase
        .from('events')
        .select('description')
        .eq('id', eventId)
        .single()

      const currentFeedbacks = parseEventFeedback(ev?.description)
      const existingIdx = currentFeedbacks.findIndex((f) => f.user_id === profile.id)
      const fbItem: EventFeedbackItem = {
        id: crypto.randomUUID(),
        user_id: profile.id,
        user_name: profile.full_name || 'Member',
        user_email: profile.email,
        user_roll: input.rollNumber || profile.roll_number || '',
        rating: cleanRating,
        feedback: cleanFeedback,
        created_at: new Date().toISOString(),
      }

      if (existingIdx >= 0) {
        currentFeedbacks[existingIdx] = fbItem
      } else {
        currentFeedbacks.unshift(fbItem)
      }

      await supabase
        .from('events')
        .update({
          description: updateEventFeedbackInText(ev?.description, currentFeedbacks),
        })
        .eq('id', eventId)
    }

    // 2. If student indicated missed hours in institute PCDP app, log to missed_attendance!
    if (input.missedHours && input.missedHours.length > 0) {
      await addMissedAttendanceRecord({
        sourceType: 'event',
        sourceId: eventId,
        userId: profile.id,
        name: profile.full_name || 'Student',
        email: profile.email,
        rollNumber: input.rollNumber || profile.roll_number || 'N/A',
        hours: input.missedHours,
        notes: input.notes ? `PCDP Missed: ${input.notes}` : 'Missed in PCDP app during event',
      })
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Error in submitEventFeedbackAndMissedAttendance:', error)
    return { error: error.message || 'Failed to submit feedback' }
  }
}

// 14e. ADMIN: Get Feedback & Missed Attendance for Event Dashboard
export async function getEventFeedbackAndMissedAttendance(eventId: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    // 1. Fetch feedbacks
    let feedbacks: EventFeedbackItem[] = []
    try {
      const { data: fbData, error: fbErr } = await supabase
        .from('event_feedback')
        .select('*, profiles(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (!fbErr && Array.isArray(fbData)) {
        feedbacks = fbData.map((f: any) => ({
          id: f.id,
          user_id: f.user_id,
          user_name: f.profiles?.full_name || 'Attendee',
          user_email: f.profiles?.email || '',
          user_roll: f.profiles?.roll_number || '',
          rating: f.rating || 5,
          feedback: f.feedback || '',
          created_at: f.created_at,
        }))
      }
    } catch {
      // Fallback
    }

    if (feedbacks.length === 0) {
      const { data: ev } = await supabase
        .from('events')
        .select('description')
        .eq('id', eventId)
        .maybeSingle()
      feedbacks = parseEventFeedback(ev?.description)
    }

    // 2. Fetch missed attendance records for this event
    const { data: missedAttendance } = await getMissedAttendanceRecords('event', eventId)

    return {
      data: {
        feedbacks: feedbacks || [],
        missedAttendance: missedAttendance || [],
      },
    }
  } catch (error: any) {
    console.error('Error in getEventFeedbackAndMissedAttendance:', error)
    return { error: error.message || 'Failed to fetch feedback' }
  }
}


