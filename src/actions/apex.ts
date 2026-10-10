'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { 
  createApexRequestSchema, 
  type CreateApexRequestInput,
  createInternalApexSchema,
  type CreateInternalApexInput 
} from '@/lib/validators/apex'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard, canAccessCamera } from '@/lib/constants/roles'
import { POINT_VALUES } from '@/lib/constants/points'
import { getMissedAttendanceRecords } from './missed-attendance'

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
    if (!profile || !isAdminOrBoard(profile.role)) {
      throw new Error('Unauthorized')
    }

    const adminClient = await createAdminClient()
    let query = adminClient
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
        const { count } = await adminClient
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

    const adminClient = await createAdminClient()
    
    // Fetch request
    const { data: request, error: reqError } = await adminClient
      .from('apex_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (reqError) throw reqError

    // Fetch assignments with profiles, equipment, and attendance logs
    const { data: assignments, error: assignError } = await adminClient
      .from('apex_assignments')
      .select('*, profiles(*), equipment(*), apex_attendance(*)')
      .eq('request_id', requestId)

    if (assignError) throw assignError

    // Fetch equipment assignments (for all allocated gear items on this shoot)
    const { data: eqAssignments } = await adminClient
      .from('equipment_assignments')
      .select('*, equipment(*), profiles:assigned_to(*)')
      .eq('apex_request_id', requestId)

    // Fetch media deliverables
    const { data: media, error: mediaError } = await adminClient
      .from('apex_media')
      .select('*, profiles(*)')
      .eq('request_id', requestId)

    if (mediaError) throw mediaError

    // Fetch profile of the person who reviewed/assigned/scheduled the shoot
    let reviewedByProfile = null
    if (request.reviewed_by) {
      const { data: revProf } = await adminClient
        .from('profiles')
        .select('id, full_name, email, role, phone, avatar_url, roll_number, department')
        .eq('id', request.reviewed_by)
        .maybeSingle()
      reviewedByProfile = revProf || null
    }

    // Fetch missed attendance records for this shoot
    const { data: missedAttendance } = await getMissedAttendanceRecords('shoot', requestId)

    return {
      data: {
        ...request,
        reviewed_by_profile: reviewedByProfile,
        missed_attendance: missedAttendance || [],
        assignments: assignments || [],
        equipment_assignments: eqAssignments || [],
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
    if (!profile || !isAdminOrBoard(profile.role)) {
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
    if (!profile || !isAdminOrBoard(profile.role)) {
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
    if (!profile || !isAdminOrBoard(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createAdminClient()

    // If equipment is selected, verify camera access permissions
    if (equipmentId) {
      const { data: eq } = await supabase
        .from('equipment')
        .select('type, name')
        .eq('id', equipmentId)
        .single()

      if (eq?.type === 'camera') {
        const { data: assignee } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

        if (!assignee || !canAccessCamera(assignee.role)) {
          return { error: 'Camera equipment can only be assigned to Admin, Board Member, or Committee Member.' }
        }
      }
    }

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

    // Auto update request status to 'assigned' if it was approved
    const { data: request } = await supabase
      .from('apex_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    // If equipment is selected, log reservation; only mark physically assigned if shoot is ongoing
    if (equipmentId) {
      if (request?.status === 'ongoing') {
        await supabase
          .from('equipment')
          .update({ status: 'assigned' })
          .eq('id', equipmentId)
      }

      // Log equipment assignment/reservation
      await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: equipmentId,
          assigned_to: userId,
          assigned_by: profile.id,
          apex_request_id: requestId,
          checked_out_at: new Date().toISOString(),
          notes: request?.status === 'ongoing' ? 'In Use' : 'Reserved for Shoot',
        })
    }

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
    if (!profile || !isAdminOrBoard(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createAdminClient()

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

    const adminClient = await createAdminClient()

    // Fetch existing attendance record if any
    const { data: existing } = await adminClient
      .from('apex_attendance')
      .select('id, checked_in_at')
      .eq('assignment_id', assignmentId)
      .maybeSingle()

    const effectiveCheckIn = existing?.checked_in_at || checkedInAt

    let hoursLogged = null
    if (checkedOutAt && effectiveCheckIn) {
      const diffMs = new Date(checkedOutAt).getTime() - new Date(effectiveCheckIn).getTime()
      hoursLogged = parseFloat(Math.max(0, diffMs / (1000 * 60 * 60)).toFixed(2))
    }

    if (existing) {
      const { error } = await adminClient
        .from('apex_attendance')
        .update({
          checked_in_at: effectiveCheckIn,
          checked_out_at: checkedOutAt || null,
          hours_logged: hoursLogged,
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await adminClient
        .from('apex_attendance')
        .insert({
          assignment_id: assignmentId,
          checked_in_at: effectiveCheckIn,
          checked_out_at: checkedOutAt || null,
          hours_logged: hoursLogged,
        })

      if (error) throw error
    }

    // Transition request status to ongoing if checked in and currently approved/assigned
    const { data: assignment } = await adminClient
      .from('apex_assignments')
      .select('request_id, user_id, role')
      .eq('id', assignmentId)
      .single()

    if (assignment?.request_id) {
      const { data: req } = await adminClient
        .from('apex_requests')
        .select('id, event_name, status')
        .eq('id', assignment.request_id)
        .single()

      if (req && ['approved', 'assigned'].includes(req.status)) {
        await adminClient
          .from('apex_requests')
          .update({ status: 'ongoing', updated_at: new Date().toISOString() })
          .eq('id', assignment.request_id)

        // Mark allocated equipment as actively assigned / in use on shoot day
        const { data: shootGear } = await adminClient
          .from('apex_assignments')
          .select('equipment_id')
          .eq('request_id', assignment.request_id)

        const eqIds = (shootGear || []).map((g: any) => g.equipment_id).filter(Boolean)
        if (eqIds.length > 0) {
          await adminClient
            .from('equipment')
            .update({ status: 'assigned' })
            .in('id', eqIds)
        }
      }

      // If user is checking out, award them points if not already awarded
      if (checkedOutAt) {
        const { data: existingPoints } = await adminClient
          .from('points_log')
          .select('id')
          .eq('user_id', assignment.user_id)
          .eq('source_type', 'apex_completed')
          .eq('source_id', assignment.request_id)
          .maybeSingle()

        if (!existingPoints) {
          const pts = POINT_VALUES.apex_completed || 25
          await adminClient.from('points_log').insert({
            user_id: assignment.user_id,
            points: pts,
            reason: `APEX Event Coverage: "${req?.event_name || 'Shoot'}" (${assignment.role})`,
            source_type: 'apex_completed',
            source_id: assignment.request_id,
            awarded_by: profile.id,
            created_at: new Date().toISOString(),
          })

          await adminClient.from('notifications').insert({
            user_id: assignment.user_id,
            title: 'APEX Completed! 📸',
            message: `Event coverage attendance logged for "${req?.event_name || 'Shoot'}"! You earned ${pts} points.`,
            type: 'success',
            source_type: 'apex',
            source_id: assignment.request_id,
          })

          await adminClient.rpc('refresh_leaderboard')
        }

        // Check if all accepted crew members have checked out
        const { data: allAssignments } = await adminClient
          .from('apex_assignments')
          .select(`
            id,
            status,
            apex_attendance (
              id,
              checked_out_at
            )
          `)
          .eq('request_id', assignment.request_id)
          .eq('status', 'accepted')

        const allCheckedOut = allAssignments && allAssignments.length > 0 && allAssignments.every(
          (a: any) => a.apex_attendance?.some((att: any) => !!att.checked_out_at)
        )

        if (allCheckedOut && req && req.status !== 'completed' && req.status !== 'delivered') {
          // Transition request to completed and release equipment / award any remaining crew points
          await updateApexStatus(assignment.request_id, 'completed')
        }
      }
    }

    revalidatePath('/my-assignments')
    revalidatePath('/admin/apex')
    revalidatePath('/leaderboard')
    revalidatePath('/dashboard')
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

    if (media.uploaded_by !== profile.id && !isAdminOrBoard(profile.role)) {
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

// Helper: Award points for completed APEX assignment
export async function awardPointsForApex(requestId: string, awardedById?: string) {
  try {
    const adminClient = await createAdminClient()

    // 1. Fetch request details and assignments
    const { data: req, error: reqErr } = await adminClient
      .from('apex_requests')
      .select(`
        id, 
        event_name, 
        apex_assignments (
          id, 
          user_id, 
          role, 
          status
        )
      `)
      .eq('id', requestId)
      .single()

    if (reqErr || !req) {
      console.error('awardPointsForApex: request not found', reqErr)
      return { error: 'Request not found' }
    }

    const assignments = req.apex_assignments || []
    if (assignments.length === 0) {
      return { success: true, count: 0 }
    }

    // 2. Fetch all existing apex_completed points for this request
    const { data: existingLogs, error: logErr } = await adminClient
      .from('points_log')
      .select('user_id')
      .eq('source_type', 'apex_completed')
      .eq('source_id', requestId)

    if (logErr) throw logErr

    const alreadyAwardedUserIds = new Set((existingLogs || []).map((l: any) => l.user_id))

    // 3. Filter members who haven't received points yet
    const eligibleAssignments = assignments.filter((a: any) => 
      a.status !== 'rejected' && !alreadyAwardedUserIds.has(a.user_id)
    )

    if (eligibleAssignments.length === 0) {
      return { success: true, count: 0 }
    }

    const pointsPerMember = POINT_VALUES.apex_completed || 25

    const pointLogs = eligibleAssignments.map((a: any) => ({
      user_id: a.user_id,
      points: pointsPerMember,
      reason: `APEX Event Coverage: "${req.event_name}" (${a.role})`,
      source_type: 'apex_completed',
      source_id: requestId,
      awarded_by: awardedById || null,
      created_at: new Date().toISOString(),
    }))

    const { error: insertErr } = await adminClient.from('points_log').insert(pointLogs)
    if (insertErr) throw insertErr

    // 4. Send in-app notification to each crew member
    const notifications = eligibleAssignments.map((a: any) => ({
      user_id: a.user_id,
      title: 'APEX Shoot Completed! 🏆',
      message: `Event coverage "${req.event_name}" has been completed! You earned ${pointsPerMember} points for your work as ${a.role}.`,
      type: 'success' as const,
      source_type: 'apex',
      source_id: requestId,
    }))

    await adminClient.from('notifications').insert(notifications)

    // 5. Refresh leaderboard
    await adminClient.rpc('refresh_leaderboard')

    revalidatePath('/leaderboard')
    revalidatePath('/dashboard')
    revalidatePath('/my-assignments')
    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')

    return { success: true, count: eligibleAssignments.length }
  } catch (error: any) {
    console.error('Error in awardPointsForApex:', error)
    return { error: error.message || 'Failed to award points' }
  }
}

// 12. Update APEX Status (ongoing, completed, delivered)
export async function updateApexStatus(requestId: string, status: 'ongoing' | 'completed' | 'delivered') {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const adminClient = await createAdminClient()

    // Permission check: Admin/Board, OR assigned camera holder/creator
    const isLeadership = isAdminOrBoard(profile.role)
    if (!isLeadership) {
      const { data: assignment } = await adminClient
        .from('apex_assignments')
        .select('id')
        .eq('request_id', requestId)
        .eq('user_id', profile.id)
        .maybeSingle()

      const { data: request } = await adminClient
        .from('apex_requests')
        .select('reviewed_by')
        .eq('id', requestId)
        .maybeSingle()

      const isAssignedCrew = !!assignment && canAccessCamera(profile.role)
      const isCreator = request?.reviewed_by === profile.id

      if (!isAssignedCrew && !isCreator) {
        throw new Error('Unauthorized. You do not have permission to update this shoot status.')
      }
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { error } = await adminClient
      .from('apex_requests')
      .update(updateData)
      .eq('id', requestId)

    if (error) throw error

    // If marked ongoing, mark all allocated shoot equipment as 'assigned'
    if (status === 'ongoing') {
      const { data: assignments } = await adminClient
        .from('apex_assignments')
        .select('equipment_id')
        .eq('request_id', requestId)

      const { data: eqAssignments } = await adminClient
        .from('equipment_assignments')
        .select('equipment_id')
        .eq('apex_request_id', requestId)
        .is('returned_at', null)

      const eqIds = Array.from(new Set([
        ...(assignments || []).map(a => a.equipment_id),
        ...(eqAssignments || []).map(ea => ea.equipment_id),
      ])).filter(Boolean)

      if (eqIds.length > 0) {
        await adminClient
          .from('equipment')
          .update({ status: 'assigned' })
          .in('id', eqIds)
      }
    }

    // If completed/delivered, also release any equipment assigned to this request and award points
    if (['completed', 'delivered'].includes(status)) {
      const { data: assignments } = await adminClient
        .from('apex_assignments')
        .select('equipment_id')
        .eq('request_id', requestId)

      const { data: eqAssignments } = await adminClient
        .from('equipment_assignments')
        .select('equipment_id')
        .eq('apex_request_id', requestId)
        .is('returned_at', null)

      const eqIds = Array.from(new Set([
        ...(assignments || []).map(a => a.equipment_id),
        ...(eqAssignments || []).map(ea => ea.equipment_id),
      ])).filter(Boolean)

      if (eqIds.length > 0) {
        // Free equipment
        await adminClient
          .from('equipment')
          .update({ status: 'available' })
          .in('id', eqIds)

        // Mark return in checkout log
        await adminClient
          .from('equipment_assignments')
          .update({ returned_at: new Date().toISOString() })
          .eq('apex_request_id', requestId)
          .is('returned_at', null)
      }

      // AWARD POINTS to crew members
      await awardPointsForApex(requestId, profile.id)
    }

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    revalidatePath('/my-assignments')
    revalidatePath('/dashboard')
    revalidatePath('/leaderboard')
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

    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('apex_assignments')
      .select(`
        *,
        apex_requests (
          *,
          apex_media (*),
          equipment_assignments (
            id,
            equipment_id,
            assigned_to,
            checked_out_at,
            returned_at,
            notes,
            equipment (*),
            profiles:assigned_to (id, full_name, avatar_url, role)
          ),
          apex_assignments (
            id,
            user_id,
            role,
            status,
            equipment (id, name, model, serial_number, type),
            profiles (id, full_name, avatar_url, role)
          )
        ),
        equipment (*),
        apex_attendance (*)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getMyAssignments:', error)
    return { error: error.message || 'Failed to fetch assignments' }
  }
}

// 14. INTERNAL: Create Internal APEX coverage or unannounced shoot
export async function createInternalApex(input: CreateInternalApexInput) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      throw new Error('Unauthorized. Please sign in.')
    }

    if (!canAccessCamera(profile.role)) {
      throw new Error('Unauthorized. Access is restricted to Camera Holders (Board Members, Committee Members) and Admins.')
    }

    const validated = createInternalApexSchema.parse(input)
    const adminClient = await createAdminClient()

    const hasCrew = validated.crew && validated.crew.length > 0
    const initialStatus = validated.initial_status || (hasCrew ? 'assigned' : 'approved')

    // Create apex request
    const { data: request, error: reqError } = await adminClient
      .from('apex_requests')
      .insert({
        event_name: validated.event_name.trim(),
        organizer_name: validated.organizer_name?.trim() || profile.full_name || 'Club Internal',
        department: validated.department?.trim() || profile.department || 'Photography Club',
        contact_email: validated.contact_email?.trim() || profile.email,
        contact_phone: validated.contact_phone?.trim() || profile.phone || null,
        venue: validated.venue?.trim() || null,
        event_date: validated.event_date,
        event_time: validated.event_time || null,
        end_time: validated.end_time || null,
        coverage_type: validated.coverage_type,
        notes: validated.notes?.trim() || null,
        status: initialStatus,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reqError) throw reqError

    // Normalize allocated gear items (support multiple allocated cameras/gear and legacy single equipment_id)
    const gearList: { equipment_id: string; custodian_id?: string | null }[] = []

    if (Array.isArray(validated.allocated_gear)) {
      for (const item of validated.allocated_gear) {
        if (item.equipment_id && item.equipment_id !== 'none' && item.equipment_id.trim() !== '') {
          gearList.push({
            equipment_id: item.equipment_id.trim(),
            custodian_id: item.custodian_id?.trim() || null,
          })
        }
      }
    }

    // Legacy fallback for single equipment_id
    if (
      validated.equipment_id &&
      validated.equipment_id !== 'none' &&
      validated.equipment_id.trim() !== '' &&
      !gearList.some((g) => g.equipment_id === validated.equipment_id?.trim())
    ) {
      gearList.push({
        equipment_id: validated.equipment_id.trim(),
        custodian_id: validated.camera_custodian_id?.trim() || null,
      })
    }

    // Validate gear items & verify camera access permissions
    for (const gear of gearList) {
      const { data: eq } = await adminClient
        .from('equipment')
        .select('type, name')
        .eq('id', gear.equipment_id)
        .single()

      if (!gear.custodian_id) {
        if (canAccessCamera(profile.role)) {
          gear.custodian_id = profile.id
        } else if (hasCrew) {
          const eligible = validated.crew.find((c) => c.user_id)
          if (eligible) gear.custodian_id = eligible.user_id
        }
      }

      if (eq?.type === 'camera' && gear.custodian_id) {
        const { data: custodian } = await adminClient
          .from('profiles')
          .select('role, full_name')
          .eq('id', gear.custodian_id)
          .single()

        if (!custodian || !canAccessCamera(custodian.role)) {
          throw new Error(
            `Camera equipment (${eq?.name || 'Camera'}) can only be assigned to a Camera Holder (Admin, Board, or Committee Member).`
          )
        }
      }
    }

    // Build map of custodian -> primary equipment_id for apex_assignments row
    const custodianToPrimaryEqMap = new Map<string, string>()
    for (const gear of gearList) {
      if (gear.custodian_id && !custodianToPrimaryEqMap.has(gear.custodian_id)) {
        custodianToPrimaryEqMap.set(gear.custodian_id, gear.equipment_id)
      }
    }

    // Handle crew assignments
    if (hasCrew) {
      const assignedUserIds = new Set<string>()

      for (const crewMember of validated.crew) {
        if (!crewMember.user_id || assignedUserIds.has(crewMember.user_id)) {
          continue
        }
        assignedUserIds.add(crewMember.user_id)

        // Equipment for this row: either explicitly provided or designated via gearList
        let cleanEquipmentId =
          crewMember.equipment_id && crewMember.equipment_id !== 'none' && crewMember.equipment_id.trim() !== ''
            ? crewMember.equipment_id.trim()
            : null

        if (!cleanEquipmentId && custodianToPrimaryEqMap.has(crewMember.user_id)) {
          cleanEquipmentId = custodianToPrimaryEqMap.get(crewMember.user_id) || null
        }

        // Verify camera access permissions if equipment is attached
        if (cleanEquipmentId) {
          const { data: eq } = await adminClient
            .from('equipment')
            .select('type, name')
            .eq('id', cleanEquipmentId)
            .single()

          if (eq?.type === 'camera') {
            const { data: assignee } = await adminClient
              .from('profiles')
              .select('role')
              .eq('id', crewMember.user_id)
              .single()

            if (!assignee || !canAccessCamera(assignee.role)) {
              throw new Error(
                `Camera equipment (${eq?.name || 'Camera'}) can only be assigned to Camera Holders (Admin, Board, Committee Member).`
              )
            }
          }
        }

        const assignStatus = crewMember.status || (crewMember.user_id === profile.id ? 'accepted' : 'pending')

        const { error: assignError } = await adminClient
          .from('apex_assignments')
          .insert({
            request_id: request.id,
            user_id: crewMember.user_id,
            role: crewMember.role,
            equipment_id: cleanEquipmentId,
            status: assignStatus,
          })

        if (assignError) throw assignError
      }
    }

    // Record checkouts/reservations in equipment_assignments for ALL allocated gear items
    const processedEqIds = new Set<string>()

    for (const gear of gearList) {
      if (processedEqIds.has(gear.equipment_id)) continue
      processedEqIds.add(gear.equipment_id)

      const assignedToId = gear.custodian_id || profile.id

      if (initialStatus === 'ongoing') {
        await adminClient
          .from('equipment')
          .update({ status: 'assigned' })
          .eq('id', gear.equipment_id)
      }

      await adminClient
        .from('equipment_assignments')
        .insert({
          equipment_id: gear.equipment_id,
          assigned_to: assignedToId,
          assigned_by: profile.id,
          apex_request_id: request.id,
          checked_out_at: new Date().toISOString(),
          notes: initialStatus === 'ongoing' ? 'In Use' : 'Reserved for Shoot',
        })
    }

    // Also catch any equipment explicitly attached on a crew member row that wasn't in gearList
    if (hasCrew) {
      for (const crewMember of validated.crew) {
        if (crewMember.equipment_id && !processedEqIds.has(crewMember.equipment_id)) {
          processedEqIds.add(crewMember.equipment_id)
          if (initialStatus === 'ongoing') {
            await adminClient
              .from('equipment')
              .update({ status: 'assigned' })
              .eq('id', crewMember.equipment_id)
          }

          await adminClient
            .from('equipment_assignments')
            .insert({
              equipment_id: crewMember.equipment_id,
              assigned_to: crewMember.user_id,
              assigned_by: profile.id,
              apex_request_id: request.id,
              checked_out_at: new Date().toISOString(),
              notes: initialStatus === 'ongoing' ? 'In Use' : 'Reserved for Shoot',
            })
        }
      }
    }

    revalidatePath('/admin/apex')
    revalidatePath(`/admin/apex/${request.id}`)
    revalidatePath('/my-assignments')
    revalidatePath('/dashboard')

    return { success: true, data: request }
  } catch (error: any) {
    console.error('Error in createInternalApex:', error)
    return { error: error.message || 'Failed to create internal APEX coverage' }
  }
}

// 15. ADMIN: Allocate additional equipment / camera to an existing shoot
export async function allocateEquipmentToApex(requestId: string, equipmentId: string, custodianId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || (!isAdminOrBoard(profile.role) && !canAccessCamera(profile.role))) {
      throw new Error('Unauthorized')
    }

    const adminClient = await createAdminClient()

    // 1. Verify equipment
    const { data: eq, error: eqErr } = await adminClient
      .from('equipment')
      .select('id, name, type, status')
      .eq('id', equipmentId)
      .single()

    if (eqErr || !eq) throw new Error('Equipment not found')

    // 2. Verify custodian role if camera
    const { data: custodian, error: custErr } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', custodianId)
      .single()

    if (custErr || !custodian) throw new Error('Custodian not found')

    if (eq.type === 'camera' && !canAccessCamera(custodian.role)) {
      throw new Error(`Camera equipment (${eq.name}) can only be assigned to a Camera Holder (Admin, Board, or Committee Member).`)
    }

    // 3. Get request status
    const { data: req } = await adminClient
      .from('apex_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    // 4. Update apex_assignments if custodian is in apex_assignments and has no equipment_id
    const { data: existingAssignment } = await adminClient
      .from('apex_assignments')
      .select('id, equipment_id')
      .eq('request_id', requestId)
      .eq('user_id', custodianId)
      .maybeSingle()

    if (existingAssignment && !existingAssignment.equipment_id) {
      await adminClient
        .from('apex_assignments')
        .update({ equipment_id: equipmentId })
        .eq('id', existingAssignment.id)
    }

    // 5. Insert checkout / reservation in equipment_assignments
    const { data: newEqAssign, error: insertErr } = await adminClient
      .from('equipment_assignments')
      .insert({
        equipment_id: equipmentId,
        assigned_to: custodianId,
        assigned_by: profile.id,
        apex_request_id: requestId,
        checked_out_at: new Date().toISOString(),
        notes: req?.status === 'ongoing' ? 'In Use' : 'Reserved for Shoot',
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // 6. If request is ongoing, mark equipment assigned
    if (req?.status === 'ongoing') {
      await adminClient
        .from('equipment')
        .update({ status: 'assigned' })
        .eq('id', equipmentId)
    }

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    revalidatePath('/my-assignments')
    return { success: true, data: newEqAssign }
  } catch (error: any) {
    console.error('Error in allocateEquipmentToApex:', error)
    return { error: error.message || 'Failed to allocate equipment' }
  }
}

// 16. ADMIN: Remove / return equipment from a shoot
export async function removeEquipmentFromApex(equipmentAssignmentId: string, equipmentId: string, requestId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || (!isAdminOrBoard(profile.role) && !canAccessCamera(profile.role))) {
      throw new Error('Unauthorized')
    }

    const adminClient = await createAdminClient()

    // 1. Mark equipment available
    await adminClient
      .from('equipment')
      .update({ status: 'available' })
      .eq('id', equipmentId)

    // 2. Mark returned in equipment_assignments
    if (equipmentAssignmentId) {
      await adminClient
        .from('equipment_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', equipmentAssignmentId)
    } else {
      await adminClient
        .from('equipment_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('apex_request_id', requestId)
        .eq('equipment_id', equipmentId)
        .is('returned_at', null)
    }

    // 3. Clear equipment_id in apex_assignments if it references this equipment
    await adminClient
      .from('apex_assignments')
      .update({ equipment_id: null })
      .eq('request_id', requestId)
      .eq('equipment_id', equipmentId)

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    revalidatePath('/my-assignments')
    return { success: true }
  } catch (error: any) {
    console.error('Error in removeEquipmentFromApex:', error)
    return { error: error.message || 'Failed to remove equipment' }
  }
}

// 17. ADMIN/LEADERSHIP: Update Shoot Details (Organizer, Contact, Schedule, Notes)
export interface UpdateApexDetailsInput {
  event_name?: string
  organizer_name?: string
  department?: string
  contact_email?: string
  contact_phone?: string
  venue?: string
  event_date?: string
  event_time?: string
  end_time?: string
  coverage_type?: 'photography' | 'videography' | 'both'
  notes?: string
}

export async function updateApexDetails(requestId: string, input: UpdateApexDetailsInput) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || (!isAdminOrBoard(profile.role) && !canAccessCamera(profile.role))) {
      throw new Error('Unauthorized. Admin or Camera Holder leadership access required.')
    }

    const adminClient = await createAdminClient()

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (input.event_name !== undefined) updatePayload.event_name = input.event_name.trim()
    if (input.organizer_name !== undefined) updatePayload.organizer_name = input.organizer_name.trim()
    if (input.department !== undefined) updatePayload.department = input.department.trim() || null
    if (input.contact_email !== undefined) updatePayload.contact_email = input.contact_email.trim()
    if (input.contact_phone !== undefined) updatePayload.contact_phone = input.contact_phone.trim() || null
    if (input.venue !== undefined) updatePayload.venue = input.venue.trim() || null
    if (input.event_date !== undefined) updatePayload.event_date = input.event_date
    if (input.event_time !== undefined) updatePayload.event_time = input.event_time || null
    if (input.end_time !== undefined) updatePayload.end_time = input.end_time || null
    if (input.coverage_type !== undefined) updatePayload.coverage_type = input.coverage_type
    if (input.notes !== undefined) updatePayload.notes = input.notes.trim() || null

    const { data, error } = await adminClient
      .from('apex_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/apex/${requestId}`)
    revalidatePath('/admin/apex')
    revalidatePath('/my-assignments')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateApexDetails:', error)
    return { error: error.message || 'Failed to update shoot details' }
  }
}

// 18. ADMIN/BOARD: Delete Shoot entirely from database
export async function deleteApexRequest(requestId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      throw new Error('Unauthorized. Only Admins and Board Members can permanently delete shoots.')
    }

    const adminClient = await createAdminClient()

    // 1. Return/Release all allocated equipment
    const { data: eqAssignments } = await adminClient
      .from('equipment_assignments')
      .select('equipment_id')
      .eq('apex_request_id', requestId)

    if (eqAssignments && eqAssignments.length > 0) {
      const eqIds = eqAssignments.map((ea: any) => ea.equipment_id).filter(Boolean)
      if (eqIds.length > 0) {
        await adminClient
          .from('equipment')
          .update({ status: 'available' })
          .in('id', eqIds)
      }
      await adminClient
        .from('equipment_assignments')
        .delete()
        .eq('apex_request_id', requestId)
    }

    // 2. Remove any points logs generated for this shoot
    await adminClient
      .from('points_log')
      .delete()
      .eq('source_type', 'apex_completed')
      .eq('source_id', requestId)

    // 3. Delete media items
    await adminClient
      .from('apex_media')
      .delete()
      .eq('request_id', requestId)

    // 4. Delete missed attendance records if any
    try {
      await adminClient
        .from('missed_attendance')
        .delete()
        .eq('source_type', 'shoot')
        .eq('source_id', requestId)
    } catch {
      // Ignore if table not present
    }

    // 5. Delete apex_assignments (which cascade-deletes apex_attendance)
    await adminClient
      .from('apex_assignments')
      .delete()
      .eq('request_id', requestId)

    // 6. Delete the shoot from apex_requests
    const { error: delErr } = await adminClient
      .from('apex_requests')
      .delete()
      .eq('id', requestId)

    if (delErr) throw delErr

    revalidatePath('/admin/apex')
    revalidatePath('/shoots')
    revalidatePath('/dashboard')
    revalidatePath('/my-assignments')

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteApexRequest:', error)
    return { error: error.message || 'Failed to delete shoot from database' }
  }
}


