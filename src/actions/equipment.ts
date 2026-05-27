'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

async function assertAdminOrLeader() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'leader'].includes(profile.role)) {
    throw new Error('Unauthorized')
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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    const supabase = await createClient()

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

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getEquipment:', error)
    return { error: error.message || 'Failed to fetch equipment' }
  }
}
