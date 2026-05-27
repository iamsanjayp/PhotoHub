'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { createEventSchema, type CreateEventInput, type UpdateEventInput } from '@/lib/validators/events'
import { revalidatePath } from 'next/cache'

// Helper for role checks
async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'leader'].includes(profile.role)) {
    throw new Error('Unauthorized. Admin or Leader privileges required.')
  }
  return profile
}

// 1. ADMIN ONLY: Create Event
export async function createEvent(input: CreateEventInput) {
  try {
    const creator = await assertAdminOrLeader()
    const validated = createEventSchema.parse(input)
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    const supabase = await createClient()

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

    const supabase = await createClient()
    let query = supabase
      .from('events')
      .select('*')
      .is('deleted_at', null)
      .order('start_date', { ascending: true })

    // Apply role-based visibility filter if not admin/leader
    if (!['admin', 'leader'].includes(profile.role)) {
      // Regular members can only see public and members_only events
      query = query.in('visibility', ['public', 'members_only'])
    }

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

    // Fetch registration counts and user's registration status
    const eventsWithMeta = await Promise.all(
      (data || []).map(async (event) => {
        // Fetch count
        const { count } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)

        // Check if current user is registered
        const { data: reg } = await supabase
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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
