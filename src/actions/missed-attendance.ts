'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { isAdminOrBoard } from '@/lib/constants/roles'

export interface MissedAttendanceRecord {
  id: string
  source_type: 'shoot' | 'event'
  source_id: string
  user_id?: string | null
  name: string
  email: string
  roll_number: string
  hours: number[]
  notes?: string | null
  created_at: string
}

export interface AddMissedAttendanceInput {
  sourceType: 'shoot' | 'event'
  sourceId: string
  userId?: string | null
  name: string
  email: string
  rollNumber: string
  hours: number[]
  notes?: string | null
}

const METADATA_TAG = '<!-- MISSED_ATTENDANCE_STORE:'
const METADATA_END = '-->'

function extractMetadataRecords(rawText: string | null | undefined): MissedAttendanceRecord[] {
  if (!rawText || !rawText.includes(METADATA_TAG)) return []
  try {
    const startIndex = rawText.indexOf(METADATA_TAG) + METADATA_TAG.length
    const endIndex = rawText.indexOf(METADATA_END, startIndex)
    if (endIndex === -1) return []
    const jsonStr = rawText.substring(startIndex, endIndex).trim()
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error parsing missed attendance metadata:', err)
    return []
  }
}

function updateMetadataText(rawText: string | null | undefined, records: MissedAttendanceRecord[]): string {
  const base = (rawText || '').replace(new RegExp(`${METADATA_TAG}[\\s\\S]*?${METADATA_END}`, 'g'), '').trim()
  if (records.length === 0) return base
  const block = `\n\n${METADATA_TAG} ${JSON.stringify(records)} ${METADATA_END}`
  return base ? `${base}${block}` : block.trim()
}

// 1. Get Missed Attendance Records
export async function getMissedAttendanceRecords(
  sourceType: 'shoot' | 'event',
  sourceId: string
): Promise<{ data: MissedAttendanceRecord[]; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    // 1. Try querying native missed_attendance table
    try {
      const { data, error } = await adminClient
        .from('missed_attendance')
        .select('*')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return { data: data as MissedAttendanceRecord[] }
      }
    } catch {
      // Table may not exist yet, fallback to document metadata
    }

    // 2. Fallback store from apex_requests.notes or events.description
    if (sourceType === 'shoot') {
      const { data: shoot } = await adminClient
        .from('apex_requests')
        .select('notes')
        .eq('id', sourceId)
        .maybeSingle()
      return { data: extractMetadataRecords(shoot?.notes) }
    } else {
      const { data: ev } = await adminClient
        .from('events')
        .select('description')
        .eq('id', sourceId)
        .maybeSingle()
      return { data: extractMetadataRecords(ev?.description) }
    }
  } catch (error: any) {
    console.error('Error in getMissedAttendanceRecords:', error)
    return { data: [], error: error.message || 'Failed to fetch missed attendance' }
  }
}

// 2. Add Missed Attendance Record
export async function addMissedAttendanceRecord(
  input: AddMissedAttendanceInput
): Promise<{ success: boolean; data?: MissedAttendanceRecord; error?: string }> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    if (!input.name?.trim() || !input.email?.trim() || !input.rollNumber?.trim()) {
      throw new Error('Name, Email, and Roll Number are required.')
    }

    const cleanHours = (input.hours || [])
      .map(Number)
      .filter((h) => !isNaN(h) && h >= 1 && h <= 7)
      .sort((a, b) => a - b)

    if (cleanHours.length === 0) {
      throw new Error('Please select at least one missed hour (1 to 7).')
    }

    const adminClient = await createAdminClient()
    const newRecord: MissedAttendanceRecord = {
      id: crypto.randomUUID(),
      source_type: input.sourceType,
      source_id: input.sourceId,
      user_id: input.userId || profile.id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      roll_number: input.rollNumber.trim().toUpperCase(),
      hours: cleanHours,
      notes: input.notes?.trim() || null,
      created_at: new Date().toISOString(),
    }

    // Try inserting into native table
    let insertedViaTable = false
    try {
      const { data, error } = await adminClient
        .from('missed_attendance')
        .insert({
          id: newRecord.id,
          source_type: newRecord.source_type,
          source_id: newRecord.source_id,
          user_id: newRecord.user_id,
          name: newRecord.name,
          email: newRecord.email,
          roll_number: newRecord.roll_number,
          hours: newRecord.hours,
          notes: newRecord.notes,
        })
        .select()
        .single()

      if (!error && data) {
        insertedViaTable = true
      }
    } catch {
      insertedViaTable = false
    }

    // Fallback sync into parent notes/description
    if (!insertedViaTable) {
      if (input.sourceType === 'shoot') {
        const { data: shoot } = await adminClient
          .from('apex_requests')
          .select('notes')
          .eq('id', input.sourceId)
          .single()
        const currentRecords = extractMetadataRecords(shoot?.notes)
        currentRecords.unshift(newRecord)
        await adminClient
          .from('apex_requests')
          .update({ notes: updateMetadataText(shoot?.notes, currentRecords) })
          .eq('id', input.sourceId)
      } else {
        const { data: ev } = await adminClient
          .from('events')
          .select('description')
          .eq('id', input.sourceId)
          .single()
        const currentRecords = extractMetadataRecords(ev?.description)
        currentRecords.unshift(newRecord)
        await adminClient
          .from('events')
          .update({ description: updateMetadataText(ev?.description, currentRecords) })
          .eq('id', input.sourceId)
      }
    }

    if (input.sourceType === 'shoot') {
      revalidatePath(`/admin/apex/${input.sourceId}`)
    } else {
      revalidatePath(`/admin/events/${input.sourceId}`)
      revalidatePath(`/events/${input.sourceId}`)
    }

    return { success: true, data: newRecord }
  } catch (error: any) {
    console.error('Error in addMissedAttendanceRecord:', error)
    return { success: false, error: error.message || 'Failed to record missed attendance' }
  }
}

// 3. Delete Missed Attendance Record
export async function deleteMissedAttendanceRecord(
  recordId: string,
  sourceType: 'shoot' | 'event',
  sourceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      throw new Error('Unauthorized. Only Admins or Board Members can remove records.')
    }

    const adminClient = await createAdminClient()

    // Try deleting from table
    try {
      await adminClient
        .from('missed_attendance')
        .delete()
        .eq('id', recordId)
    } catch {
      // Table delete ignored if missing
    }

    // Also update parent metadata fallback
    if (sourceType === 'shoot') {
      const { data: shoot } = await adminClient
        .from('apex_requests')
        .select('notes')
        .eq('id', sourceId)
        .single()
      const filtered = extractMetadataRecords(shoot?.notes).filter((r) => r.id !== recordId)
      await adminClient
        .from('apex_requests')
        .update({ notes: updateMetadataText(shoot?.notes, filtered) })
        .eq('id', sourceId)
      revalidatePath(`/admin/apex/${sourceId}`)
    } else {
      const { data: ev } = await adminClient
        .from('events')
        .select('description')
        .eq('id', sourceId)
        .single()
      const filtered = extractMetadataRecords(ev?.description).filter((r) => r.id !== recordId)
      await adminClient
        .from('events')
        .update({ description: updateMetadataText(ev?.description, filtered) })
        .eq('id', sourceId)
      revalidatePath(`/admin/events/${sourceId}`)
      revalidatePath(`/events/${sourceId}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteMissedAttendanceRecord:', error)
    return { success: false, error: error.message || 'Failed to delete record' }
  }
}
