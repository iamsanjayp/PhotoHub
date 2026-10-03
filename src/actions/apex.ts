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

    const supabase = await createClient()

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
    if (!profile || !isAdminOrBoard(profile.role)) {
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

    // If completed/delivered, also release any equipment assigned to this request and award points
    if (['completed', 'delivered'].includes(status)) {
      const { data: assignments } = await adminClient
        .from('apex_assignments')
        .select('equipment_id')
        .eq('request_id', requestId)

      if (assignments) {
        const eqIds = assignments.map(a => a.equipment_id).filter(Boolean)
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
          apex_assignments (
            id,
            user_id,
            role,
            status,
            equipment (id, name, model, serial_number),
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

    // Handle crew assignments and equipment checkouts
    if (hasCrew) {
      const assignedUserIds = new Set<string>()

      for (const crewMember of validated.crew) {
        if (!crewMember.user_id || assignedUserIds.has(crewMember.user_id)) {
          continue
        }
        assignedUserIds.add(crewMember.user_id)

        const cleanEquipmentId = (crewMember.equipment_id && crewMember.equipment_id !== 'none' && crewMember.equipment_id.trim() !== '') ? crewMember.equipment_id : null

        // If equipment is selected, verify camera access permissions
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
              throw new Error(`Camera equipment (${eq.name}) can only be assigned to Camera Holders (Admin, Board, Committee Member).`)
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

        // If equipment is selected, checkout
        if (cleanEquipmentId) {
          await adminClient
            .from('equipment')
            .update({ status: 'assigned' })
            .eq('id', cleanEquipmentId)

          await adminClient
            .from('equipment_assignments')
            .insert({
              equipment_id: cleanEquipmentId,
              assigned_to: crewMember.user_id,
              assigned_by: profile.id,
              apex_request_id: request.id,
              checked_out_at: new Date().toISOString(),
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

