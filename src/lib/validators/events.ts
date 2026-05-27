import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(2000).optional().nullable().or(z.literal('')),
  banner_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  event_type: z.enum(['workshop', 'competition', 'meetup', 'photowalk', 'exhibition', 'webinar', 'other']).default('other'),
  venue: z.string().max(200).optional().nullable().or(z.literal('')),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  registration_deadline: z.string().optional().nullable().or(z.literal('')),
  max_participants: z.number().int().positive().nullable().optional().or(z.literal('')), // Handle possible conversion or blank
  points: z.number().int().min(0).default(10),
  visibility: z.enum(['public', 'members_only', 'invite_only']).default('public'),
  submission_required: z.boolean().default(false),
  submission_mode: z.enum(['image', 'text', 'link', 'drive_link']).nullable().optional().or(z.literal('')),
  external_link: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
})

export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateEventSchema = createEventSchema.partial()
export type UpdateEventInput = z.infer<typeof updateEventSchema>
