'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEvents } from '@/actions/events'
import type { Event } from '@/types/database'
import EventCard from './event-card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function EventList({ initialEvents }: { initialEvents: Event[] }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  // Use TanStack Query with initial server data
  const { data: result, isLoading } = useQuery({
    queryKey: ['events', { search, type, status }],
    queryFn: async () => {
      const res = await getEvents({ search, type: type === 'all' ? undefined : type, status })
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    initialData: search === '' && type === 'all' && status === 'upcoming' ? initialEvents : undefined,
    refetchOnWindowFocus: false,
  })

  const events = result || []

  const eventTypes = [
    { value: 'all', label: 'All Categories' },
    { value: 'workshop', label: 'Workshops' },
    { value: 'competition', label: 'Competitions' },
    { value: 'photowalk', label: 'Photowalks' },
    { value: 'meetup', label: 'Meetups' },
    { value: 'exhibition', label: 'Exhibitions' },
    { value: 'webinar', label: 'Webinars' },
    { value: 'other', label: 'Others' },
  ]

  return (
    <div className="space-y-6">
      {/* Controls: Search, Type Select, Status Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-black/20 p-4 border border-white/5 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-xl">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
            />
          </div>
          {/* Event type filter */}
          <Select value={type} onValueChange={(val) => setType(val || 'all')}>
            <SelectTrigger className="h-10 border-white/5 bg-white/[0.02] text-neutral-300 w-full sm:w-[180px] rounded-xl focus:ring-cyan-500/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/5 text-neutral-200">
              {eventTypes.map((t) => (
                <SelectItem key={t.value} value={t.value} className="focus:bg-white/5 focus:text-white">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Tabs (Upcoming / Past / All) */}
        <Tabs 
          value={status} 
          onValueChange={(val) => setStatus(val as any)}
          className="w-full md:w-auto"
        >
          <TabsList className="bg-white/[0.02] border border-white/5 h-10 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-semibold rounded-lg px-4 h-full">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-semibold rounded-lg px-4 h-full">
              Past Events
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-semibold rounded-lg px-4 h-full">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid of Events */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="border border-white/5 bg-black/40 rounded-2xl h-[380px] p-4 flex flex-col justify-between">
              <Skeleton className="h-44 w-full bg-neutral-800 rounded-xl" />
              <div className="space-y-2 mt-4 flex-1">
                <Skeleton className="h-4 w-1/4 bg-neutral-800" />
                <Skeleton className="h-6 w-3/4 bg-neutral-800" />
                <Skeleton className="h-4 w-full bg-neutral-800" />
              </div>
              <Skeleton className="h-8 w-full bg-neutral-800 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          No events found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
