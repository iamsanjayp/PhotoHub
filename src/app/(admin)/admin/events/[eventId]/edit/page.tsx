import type { Metadata } from 'next'
import { getEventById } from '@/actions/events'
import EventForm from '@/components/events/event-form'
import { Calendar, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface EditEventPageProps {
  params: Promise<{
    eventId: string
  }>
}

export const metadata: Metadata = {
  title: 'Edit Event | PhotoHub Admin',
  description: 'Modify details for a photography club event.',
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params
  const { data: event, error } = await getEventById(eventId)

  if (error || !event) {
    return notFound()
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/admin/events/${eventId}`}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Event Dashboard
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <Calendar className="h-7 w-7 text-cyan-400" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Edit Event Details</h1>
        </div>
        <p className="text-neutral-400 text-sm">
          Modify description, schedule times, points, submission criteria, or visibility settings.
        </p>
      </div>

      {/* Form Component */}
      <EventForm initialData={event} isEdit={true} />
    </div>
  )
}
