import { z } from 'zod'

export const createApexRequestSchema = z.object({
  event_name: z.string().min(3, 'Event name must be at least 3 characters').max(200),
  organizer_name: z.string().min(2, 'Organizer name is required').max(100),
  department: z.string().max(100).optional().nullable().or(z.literal('')),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().max(15).optional().nullable().or(z.literal('')),
  venue: z.string().max(200).optional().nullable().or(z.literal('')),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().optional().nullable().or(z.literal('')),
  end_time: z.string().optional().nullable().or(z.literal('')),
  coverage_type: z.enum(['photography', 'videography', 'both']).default('both'),
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
})

export type CreateApexRequestInput = z.infer<typeof createApexRequestSchema>

export const crewAssignmentSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  role: z.enum(['photographer', 'videographer', 'editor']).default('photographer'),
  equipment_id: z.string().optional().nullable().or(z.literal('')),
  status: z.enum(['pending', 'accepted']).optional().default('pending'),
})

export const allocatedGearItemSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment is required'),
  custodian_id: z.string().optional().nullable().or(z.literal('')),
})

export const createInternalApexSchema = z.object({
  event_name: z.string().min(3, 'Event name must be at least 3 characters').max(200),
  organizer_name: z.string().max(100).optional().nullable().or(z.literal('')),
  department: z.string().max(100).optional().nullable().or(z.literal('')),
  contact_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  contact_phone: z.string().max(15).optional().nullable().or(z.literal('')),
  venue: z.string().max(200).optional().nullable().or(z.literal('')),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().optional().nullable().or(z.literal('')),
  end_time: z.string().optional().nullable().or(z.literal('')),
  coverage_type: z.enum(['photography', 'videography', 'both']).default('both'),
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
  initial_status: z.enum(['approved', 'assigned', 'ongoing']).optional(),
  equipment_id: z.string().optional().nullable().or(z.literal('')),
  camera_custodian_id: z.string().optional().nullable().or(z.literal('')),
  allocated_gear: z.array(allocatedGearItemSchema).optional().default([]),
  crew: z.array(crewAssignmentSchema).optional().default([]),
})

export type CrewAssignmentInput = z.infer<typeof crewAssignmentSchema>
export type AllocatedGearItemInput = z.infer<typeof allocatedGearItemSchema>
export type CreateInternalApexInput = z.infer<typeof createInternalApexSchema>

