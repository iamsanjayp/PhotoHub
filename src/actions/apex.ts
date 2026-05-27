'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createApexRequestSchema, type CreateApexRequestInput } from '@/lib/validators/apex'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

// 1. PUBLIC: Create APEX request (uses admin client to bypass RLS since user is unauthenticated)
export async function createApexRequest(input: CreateApexRequestInput) {
  try {
    const validated = createApexRequestSchema.parse(input)
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('apex_requests')
      .insert({
        event_name: validated.event_name,
        organizer_name: validated.organizer_name,
        department: validated.department || null,
        contact_email: validated.contact_email,
        contact_phone: validated.contact_phone || null,
        venue: validated.venue || null,
        event_date: validated.event_date,
        event_time: validated.event_time || null,
        end_time: validated.end_time || null,
        coverage_type: validated.coverage_type,
        notes: validated.notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createApexRequest:', error)
    return { error: error.message || 'Failed to submit coverage request' }
  }
}

// 2. ADMIN ONLY: Get all requests with optional status filter
export async function getApexRequests(status?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    let query = supabase
      .from('apex_requests')
      .select('*')
      .order('event_date', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch assignment counts
    const requestsWithCounts = await Promise.all(
      (data || []).map(async (req) => {
        const { count } = await supabase
          .from('apex_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('request_id', req.id)
        
        return {
          ...req,
          team_count: count || 0
        }
      })
    )

    return { data: requestsWithCounts }
  } catch (error: any) {
    console.error('Error in getApexRequests:', error)
    return { error: error.message || 'Failed to fetch requests' }
  }
}

// 3. AUTHENTICATED: Get single request details
export async function getApexRequestById(requestId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    
    // Fetch request
    const { data: request, error: reqError } = await supabase
      .from('apex_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (reqError) throw reqError

    // Fetch assignments with profiles, equipment, and attendance logs
    const { data: assignments, error: assignError } = await supabase
      .from('apex_assignments')
      .select('*, profiles(*), equipment(*), apex_attendance(*)')
      .eq('request_id', requestId)

    if (assignError) throw assignError

    // Fetch media deliverables
    const { data: media, error: mediaError } = await supabase
      .from('apex_media')
      .select('*, profiles(*)')
      .eq('request_id', requestId)

    if (mediaError) throw mediaError

    return {
      data: {
        ...request,
        assignments: assignments || [],
        media: media || [],
      }
    }
  } catch (error: any) {
    console.error('Error in getApexRequestById:', error)
    return { error: error.message || 'Failed to fetch request detail' }
  }
}

// 4. ADMIN ONLY: Approve Request
export async function approveApexRequest(requestId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('apex_requests')
      .update({
        status: 'approved',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) throw error

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    return { success: true }
  } catch (error: any) {
    console.error('Error in approveApexRequest:', error)
    return { error: error.message || 'Failed to approve request' }
  }
}

// 5. ADMIN ONLY: Reject Request
export async function rejectApexRequest(requestId: string, reason: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('apex_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) throw error

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    return { success: true }
  } catch (error: any) {
    console.error('Error in rejectApexRequest:', error)
    return { error: error.message || 'Failed to reject request' }
  }
}

// 6. ADMIN ONLY: Assign team member and equipment
export async function assignTeamMember(requestId: string, userId: string, role: string, equipmentId?: string | null) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()

    // Insert assignment
    const { error: assignError } = await supabase
      .from('apex_assignments')
      .insert({
        request_id: requestId,
        user_id: userId,
        role,
        equipment_id: equipmentId || null,
        status: 'pending',
      })

    if (assignError) throw assignError

    // If equipment is selected, mark it as assigned
    if (equipmentId) {
      await supabase
        .from('equipment')
        .update({ status: 'assigned' })
        .eq('id', equipmentId)

      // Log equipment checkout
      await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: equipmentId,
          assigned_to: userId,
          assigned_by: profile.id,
          apex_request_id: requestId,
          checked_out_at: new Date().toISOString(),
        })
    }

    // Auto update request status to 'assigned' if it was approved
    const { data: request } = await supabase
      .from('apex_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    if (request && request.status === 'approved') {
      await supabase
        .from('apex_requests')
        .update({ status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', requestId)
    }

    // Create system notification for assigned user
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_title: 'New APEX Assignment',
      p_message: `You have been assigned as a ${role} for the event. Please accept or reject this assignment.`,
      p_type: 'assignment',
      p_source_type: 'apex',
      p_source_id: requestId,
    })

    revalidatePath(`/admin/apex/${requestId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in assignTeamMember:', error)
    return { error: error.message || 'Failed to assign team member' }
  }
}

// 7. ADMIN ONLY: Remove assignment
export async function removeAssignment(assignmentId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()

    // Get assignment details first to see if equipment was checked out
    const { data: assignment } = await supabase
      .from('apex_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (assignment) {
      if (assignment.equipment_id) {
        // Free equipment
        await supabase
          .from('equipment')
          .update({ status: 'available' })
          .eq('id', assignment.equipment_id)

        // Log return
        await supabase
          .from('equipment_assignments')
          .update({ returned_at: new Date().toISOString() })
          .eq('apex_request_id', assignment.request_id)
          .eq('equipment_id', assignment.equipment_id)
          .is('returned_at', null)
      }

      const { error: deleteError } = await supabase
        .from('apex_assignments')
        .delete()
        .eq('id', assignmentId)

      if (deleteError) throw deleteError

      revalidatePath(`/admin/apex/${assignment.request_id}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in removeAssignment:', error)
    return { error: error.message || 'Failed to remove assignment' }
  }
}

// 8. MEMBER: Accept or reject assignment
export async function respondToAssignment(assignmentId: string, status: 'accepted' | 'rejected') {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    
    // Update assignment status
    const { data: assignment, error } = await supabase
      .from('apex_assignments')
      .update({ status })
      .eq('id', assignmentId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error) throw error

    // If rejected, free up the equipment
    if (status === 'rejected' && assignment.equipment_id) {
      await supabase
        .from('equipment')
        .update({ status: 'available' })
        .eq('id', assignment.equipment_id)

      await supabase
        .from('equipment_assignments')
        .update({ 
          returned_at: new Date().toISOString(),
          notes: 'Assignment rejected by user.' 
        })
        .eq('apex_request_id', assignment.request_id)
        .eq('equipment_id', assignment.equipment_id)
        .is('returned_at', null)
    }

    revalidatePath('/my-assignments')
    return { success: true }
  } catch (error: any) {
    console.error('Error in respondToAssignment:', error)
    return { error: error.message || 'Failed to submit response' }
  }
}

// 9. MEMBER: Log Attendance
export async function logApexAttendance(assignmentId: string, checkedInAt: string, checkedOutAt?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    let hoursLogged = null
    if (checkedOutAt) {
      const diffMs = new Date(checkedOutAt).getTime() - new Date(checkedInAt).getTime()
      hoursLogged = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2))
    }

    const { error } = await supabase
      .from('apex_attendance')
      .upsert({
        assignment_id: assignmentId,
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt || null,
        hours_logged: hoursLogged,
      })

    if (error) throw error

    revalidatePath('/my-assignments')
    return { success: true }
  } catch (error: any) {
    console.error('Error in logApexAttendance:', error)
    return { error: error.message || 'Failed to log attendance' }
  }
}

// 10. MEMBER: Upload apex deliverables
export async function uploadApexMedia(requestId: string, url: string, mediaType: 'image' | 'video', cloudinaryPublicId?: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
      .from('apex_media')
      .insert({
        request_id: requestId,
        uploaded_by: profile.id,
        url,
        media_type: mediaType,
        cloudinary_public_id: cloudinaryPublicId || null,
      })

    if (error) throw error

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/my-assignments')
    return { success: true }
  } catch (error: any) {
    console.error('Error in uploadApexMedia:', error)
    return { error: error.message || 'Failed to upload deliverable' }
  }
}

// 11. ADMIN OR AUTHOR: Delete apex media
export async function deleteApexMedia(mediaId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    
    // Check if user is admin or uploader
    const { data: media } = await supabase
      .from('apex_media')
      .select('*')
      .eq('id', mediaId)
      .single()

    if (!media) throw new Error('Media not found')

    if (media.uploaded_by !== profile.id && !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const { error } = await supabase
      .from('apex_media')
      .delete()
      .eq('id', mediaId)

    if (error) throw error

    revalidatePath(`/admin/apex/${media.request_id}`)
    revalidatePath('/my-assignments')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteApexMedia:', error)
    return { error: error.message || 'Failed to delete media' }
  }
}

// 12. ADMIN ONLY: Update APEX Status (ongoing, completed, delivered)
export async function updateApexStatus(requestId: string, status: 'ongoing' | 'completed' | 'delivered') {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('apex_requests')
      .update(updateData)
      .eq('id', requestId)

    if (error) throw error

    // If completed/delivered, also release any equipment assigned to this request
    if (['completed', 'delivered'].includes(status)) {
      const { data: assignments } = await supabase
        .from('apex_assignments')
        .select('equipment_id')
        .eq('request_id', requestId)

      if (assignments) {
        const eqIds = assignments.map(a => a.equipment_id).filter(Boolean)
        if (eqIds.length > 0) {
          // Free equipment
          await supabase
            .from('equipment')
            .update({ status: 'available' })
            .in('id', eqIds)

          // Mark return in checkout log
          await supabase
            .from('equipment_assignments')
            .update({ returned_at: new Date().toISOString() })
            .eq('apex_request_id', requestId)
            .is('returned_at', null)
        }
      }
    }

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    return { success: true }
  } catch (error: any) {
    console.error('Error in updateApexStatus:', error)
    return { error: error.message || 'Failed to update request status' }
  }
}

// 13. MEMBER: Get own assignments
export async function getMyAssignments() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('apex_assignments')
      .select('*, apex_requests(*), equipment(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getMyAssignments:', error)
    return { error: error.message || 'Failed to fetch assignments' }
  }
}
