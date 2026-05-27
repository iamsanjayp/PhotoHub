'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema, type CreateEventInput } from '@/lib/validators/events'
import { createEvent, updateEvent } from '@/actions/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { CldUploadWidget } from 'next-cloudinary'
import { Loader2, Image as ImageIcon, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EventFormProps {
  initialData?: any // DB event row for edit mode
  isEdit?: boolean
}

export default function EventForm({ initialData, isEdit = false }: EventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [bannerUrl, setBannerUrl] = useState<string>(initialData?.banner_url || '')

  // Set up react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      banner_url: initialData?.banner_url || '',
      event_type: initialData?.event_type || 'other',
      venue: initialData?.venue || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '',
      end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '',
      registration_deadline: initialData?.registration_deadline ? new Date(initialData.registration_deadline).toISOString().slice(0, 16) : '',
      max_participants: initialData?.max_participants || '',
      points: initialData?.points ?? 10,
      visibility: initialData?.visibility || 'public',
      submission_required: initialData?.submission_required || false,
      submission_mode: initialData?.submission_mode || '',
      external_link: initialData?.external_link || '',
    },
  })

  const watchSubmissionRequired = watch('submission_required')

  const handleUploadSuccess = (result: any) => {
    const info = result.info
    if (info && typeof info === 'object' && 'secure_url' in info) {
      setBannerUrl(info.secure_url)
      setValue('banner_url', info.secure_url)
      toast.success('Banner uploaded successfully!')
    }
  }

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      // Process date formatting
      const formattedData = {
        ...data,
        banner_url: bannerUrl || null,
        // Convert empty string/zero values appropriately
        max_participants: data.max_participants === '' || data.max_participants === undefined ? null : Number(data.max_participants),
        points: Number(data.points),
        registration_deadline: data.registration_deadline ? new Date(data.registration_deadline).toISOString() : null,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        submission_mode: data.submission_required ? (data.submission_mode || null) : null,
      }

      const res = isEdit
        ? await updateEvent(initialData.id, formattedData)
        : await createEvent(formattedData)

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(isEdit ? 'Event updated successfully!' : 'Event created successfully!')
        router.push(isEdit ? `/admin/events/${initialData.id}` : '/admin/events')
        router.refresh()
      }
    })
  }

  return (
    <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden max-w-4xl mx-auto shadow-2xl">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Banner Upload */}
          <div className="space-y-2">
            <Label className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Event Banner Image</Label>
            {bannerUrl ? (
              <div className="relative aspect-[21/9] w-full bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden group">
                <img src={bannerUrl} alt="Banner Preview" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    onClick={() => {
                      setBannerUrl('')
                      setValue('banner_url', '')
                    }}
                    variant="destructive"
                    size="icon"
                    className="rounded-full shadow-lg"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <CldUploadWidget
                uploadPreset="photohub_unsigned"
                onSuccess={handleUploadSuccess}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="w-full aspect-[21/9] border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-all select-none group"
                  >
                    <ImageIcon className="h-8 w-8 text-neutral-600 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-semibold">Click to upload event banner</span>
                    <span className="text-[10px] text-neutral-500">Suggested ratio: 21:9 (Max 10MB)</span>
                  </button>
                )}
              </CldUploadWidget>
            )}
            {errors.banner_url && (
              <p className="text-xs text-red-500 mt-1">{String(errors.banner_url.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="title" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Event Title</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                {...register('title')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{String(errors.title.message)}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="description" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the event details..."
                {...register('description')}
                rows={5}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-sm"
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{String(errors.description.message)}</p>
              )}
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="event_type" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Event Type</Label>
              <select
                id="event_type"
                {...register('event_type')}
                className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
              >
                <option value="workshop">Workshop</option>
                <option value="competition">Competition</option>
                <option value="meetup">Meetup</option>
                <option value="photowalk">Photowalk</option>
                <option value="exhibition">Exhibition</option>
                <option value="webinar">Webinar</option>
                <option value="other">Other</option>
              </select>
              {errors.event_type && (
                <p className="text-xs text-red-500 mt-1">{String(errors.event_type.message)}</p>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Visibility</Label>
              <select
                id="visibility"
                {...register('visibility')}
                className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
              >
                <option value="public">Public (Everyone)</option>
                <option value="members_only">Members Only</option>
                <option value="invite_only">Invite Only</option>
              </select>
              {errors.visibility && (
                <p className="text-xs text-red-500 mt-1">{String(errors.visibility.message)}</p>
              )}
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Venue</Label>
              <Input
                id="venue"
                placeholder="e.g. Seminar Hall, Online"
                {...register('venue')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.venue && (
                <p className="text-xs text-red-500 mt-1">{String(errors.venue.message)}</p>
              )}
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <Label htmlFor="max_participants" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Max Participants (Optional)</Label>
              <Input
                id="max_participants"
                type="number"
                placeholder="No limit"
                {...register('max_participants', { valueAsNumber: true })}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.max_participants && (
                <p className="text-xs text-red-500 mt-1">{String(errors.max_participants.message)}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Start Date & Time</Label>
              <Input
                id="start_date"
                type="datetime-local"
                {...register('start_date')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.start_date && (
                <p className="text-xs text-red-500 mt-1">{String(errors.start_date.message)}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                {...register('end_date')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.end_date && (
                <p className="text-xs text-red-500 mt-1">{String(errors.end_date.message)}</p>
              )}
            </div>

            {/* Registration Deadline */}
            <div className="space-y-2">
              <Label htmlFor="registration_deadline" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Registration Deadline (Optional)</Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                {...register('registration_deadline')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.registration_deadline && (
                <p className="text-xs text-red-500 mt-1">{String(errors.registration_deadline.message)}</p>
              )}
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label htmlFor="points" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Attendance Points</Label>
              <Input
                id="points"
                type="number"
                {...register('points', { valueAsNumber: true })}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
              />
              {errors.points && (
                <p className="text-xs text-red-500 mt-1">{String(errors.points.message)}</p>
              )}
            </div>

            {/* External Link */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="external_link" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">External Link (Optional)</Label>
              <Input
                id="external_link"
                type="url"
                placeholder="e.g. Google Forms link, submission portal URL..."
                {...register('external_link')}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
              />
              <p className="text-[10px] text-neutral-500">Attach a Google Forms link or any external URL for participants.</p>
              {errors.external_link && (
                <p className="text-xs text-red-500 mt-1">{String(errors.external_link.message)}</p>
              )}
            </div>

            {/* Submission Requirements Switch */}
            <div className="space-y-2 col-span-1 md:col-span-2 flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl mt-2">
              <div>
                <Label htmlFor="submission_required" className="text-white font-bold text-sm">Submission Required</Label>
                <p className="text-xs text-neutral-400 mt-0.5">Require participants to submit photos/work after the event.</p>
              </div>
              <input
                id="submission_required"
                type="checkbox"
                {...register('submission_required')}
                className="w-5 h-5 accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Submission Mode Selection (Conditional) */}
            {watchSubmissionRequired && (
              <div className="space-y-2 col-span-1 md:col-span-2 p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl">
                <Label htmlFor="submission_mode" className="text-cyan-400 font-semibold text-xs uppercase tracking-wider">Submission Mode</Label>
                <select
                  id="submission_mode"
                  {...register('submission_mode')}
                  className="w-full mt-1.5 border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                >
                  <option value="">Select mode...</option>
                  <option value="image">Image Upload</option>
                  <option value="text">Text Entry</option>
                  <option value="link">External Link</option>
                  <option value="drive_link">Google Drive Link</option>
                </select>
                {errors.submission_mode && (
                  <p className="text-xs text-red-500 mt-1">{String(errors.submission_mode.message)}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => router.back()}
              className="border-white/10 text-white hover:bg-white/5 rounded-xl h-11 px-6 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 px-8 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {isEdit ? 'Save Changes' : 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
