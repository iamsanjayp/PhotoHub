import type { Metadata } from 'next'
import { getEvents } from '@/actions/events'
import EventList from '@/components/events/event-list'

export const metadata: Metadata = {
  title: 'Club Events | PhotoHub',
  description: 'Browse and register for workshops, photowalks, and competitions hosted by the photography club.',
}

export default async function EventsPage() {
  const result = await getEvents({ status: 'upcoming' })
  const initialEvents = result.data || []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Club Events</h1>
        <p className="text-neutral-400 text-sm">
          Browse and register for photowalks, competitions, workshops, and club meetups.
        </p>
      </div>

      <EventList initialEvents={initialEvents} />
    </div>
  )
}
