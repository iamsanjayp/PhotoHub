'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

import { isAdminOrBoard } from '@/lib/constants/roles'

async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminOrBoard(profile.role)) {
    throw new Error('Unauthorized. Admin or Board Member privileges required.')
  }
  return profile
}

export async function createEquipment(input: {
  name: string
  type: 'camera' | 'lens' | 'tripod' | 'lighting' | 'drone' | 'other'
  model?: string | null
  serial_number: string
  status?: 'available' | 'assigned' | 'maintenance' | 'retired'
  condition?: string | null
  notes?: string | null
  image_url?: string | null
}) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('equipment')
      .insert({
        name: input.name,
        type: input.type,
        model: input.model || null,
        serial_number: input.serial_number,
        status: input.status || 'available',
        condition: input.condition || 'good',
        notes: input.notes || null,
        image_url: input.image_url || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Equipment with this serial number already exists.')
      }
      throw error
    }

    revalidatePath('/admin/equipment')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createEquipment:', error)
    return { error: error.message || 'Failed to add equipment' }
  }
}

export async function updateEquipment(id: string, input: {
  name?: string
  type?: 'camera' | 'lens' | 'tripod' | 'lighting' | 'drone' | 'other'
  model?: string | null
  serial_number?: string
  status?: 'available' | 'assigned' | 'maintenance' | 'retired'
  condition?: string | null
  notes?: string | null
  image_url?: string | null
}) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('equipment')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/equipment')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateEquipment:', error)
    return { error: error.message || 'Failed to update equipment' }
  }
}

export async function deleteEquipment(id: string) {
  try {
    await assertAdminOrLeader()
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/equipment')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteEquipment:', error)
    return { error: error.message || 'Failed to delete equipment' }
  }
}

export async function getEquipment() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_assignments (
          id,
          equipment_id,
          assigned_to,
          checked_out_at,
          returned_at,
          apex_request_id,
          apex_requests (
            id,
            event_name,
            event_date,
            status
          ),
          profiles:assigned_to (
            id,
            full_name,
            role
          )
        )
      `)
      .order('name', { ascending: true })

    if (error) throw error

    const todayStr = new Date().toISOString().split('T')[0]
    const itemsToHeal: string[] = []

    const enhanced = (data || []).map((item: any) => {
      const activeOrUpcoming = (item.equipment_assignments || []).filter((ea: any) => {
        if (ea.returned_at) return false
        const req = ea.apex_requests
        if (!req) return !ea.returned_at
        return !['completed', 'delivered', 'rejected'].includes(req.status)
      })

      const ongoingAssignment = activeOrUpcoming.find(
        (ea: any) => ea.apex_requests?.status === 'ongoing' || (!ea.apex_request_id && !ea.returned_at)
      )

      const upcomingAssignment = activeOrUpcoming.find(
        (ea: any) => ea.apex_requests && ea.apex_requests.event_date >= todayStr && ['approved', 'assigned'].includes(ea.apex_requests.status)
      )

      const isActuallyInUse = !!ongoingAssignment

      // Self-heal: If database says 'assigned', but no active ongoing shoot exists, mark for healing
      if (item.status === 'assigned' && !isActuallyInUse && item.status !== 'maintenance' && item.status !== 'retired') {
        itemsToHeal.push(item.id)
        item.status = 'available'
      }

      return {
        ...item,
        is_currently_in_use: isActuallyInUse,
        active_assignment: ongoingAssignment || null,
        upcoming_reservation: upcomingAssignment
          ? {
              event_name: upcomingAssignment.apex_requests?.event_name,
              event_date: upcomingAssignment.apex_requests?.event_date,
              holder_name: upcomingAssignment.profiles?.full_name,
            }
          : null,
      }
    })

    // Auto-heal stuck equipment records in background
    if (itemsToHeal.length > 0) {
      await supabase
        .from('equipment')
        .update({ status: 'available' })
        .in('id', itemsToHeal)
    }

    return { data: enhanced }
  } catch (error: any) {
    console.error('Error in getEquipment:', error)
    return { error: error.message || 'Failed to fetch equipment' }
  }
}
