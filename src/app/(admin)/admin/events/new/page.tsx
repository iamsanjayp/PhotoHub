import type { Metadata } from 'next'
import EventForm from '@/components/events/event-form'
import { Calendar, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Create Event | PhotoHub Admin',
  description: 'Create a new photography club event.',
}

export default function NewEventPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/events"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Events List
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <Calendar className="h-7 w-7 text-cyan-400" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Create New Event</h1>
        </div>
        <p className="text-neutral-400 text-sm">
          Publish a new event, workshop, or competition with submission criteria and attendance point tracking.
        </p>
      </div>

      {/* Form Component */}
      <EventForm />
    </div>
  )
}
