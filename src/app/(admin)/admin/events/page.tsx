'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getEvents, deleteEvent } from '@/actions/events'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Users, 
  Award,
  Lock,
  Globe,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isPending, startTransition] = useTransition()

  // Load events
  const loadEvents = async () => {
    setLoading(true)
    const res = await getEvents({ status: 'all' })
    if (res.error) {
      toast.error(res.error)
    } else {
      setEvents(res.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will soft delete the event.`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteEvent(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Event deleted successfully')
        setEvents((prev) => prev.filter((event) => event.id !== id))
      }
    })
  }

  // Filter events client-side
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.venue && event.venue.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = typeFilter === 'all' || event.event_type === typeFilter
    return matchesSearch && matchesType
  })

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3 mr-1 text-cyan-400" />
      case 'members_only':
        return <Lock className="h-3 w-3 mr-1 text-neutral-400" />
      case 'invite_only':
        return <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Title / Action bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-cyan-400" />
            Manage Events
          </h1>
          <p className="text-neutral-400 text-sm">
            Create, moderate, view registrations, check attendance, and select winners for club events.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 px-5 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <Link href="/admin/events/new">
            <Plus className="h-5 w-5" />
            Add New Event
          </Link>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search events by title or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-white/5 bg-black/20 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none w-full md:w-48"
        >
          <option value="all">All Event Types</option>
          <option value="workshop">Workshop</option>
          <option value="competition">Competition</option>
          <option value="meetup">Meetup</option>
          <option value="photowalk">Photowalk</option>
          <option value="exhibition">Exhibition</option>
          <option value="webinar">Webinar</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-neutral-500">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Events Found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6">
            There are no events matching your filters or no events have been created yet.
          </p>
          <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-5">
            <Link href="/admin/events/new">Create Your First Event</Link>
          </Button>
        </Card>
      ) : (
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                    <th className="py-4 px-6">Event Details</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Date & Venue</th>
                    <th className="py-4 px-6">Points</th>
                    <th className="py-4 px-6 text-center">Registered</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredEvents.map((event) => {
                    const isUpcoming = new Date(event.end_date) >= new Date()
                    return (
                      <tr key={event.id} className="hover:bg-white/[0.01] transition-colors group">
                        {/* Title & Banner */}
                        <td className="py-4 px-6 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-16 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-neutral-900">
                              {event.banner_url ? (
                                <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-600">
                                  EVENT
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white truncate">{event.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold uppercase py-0.5 px-2 rounded-full border border-white/5 bg-white/[0.02]">
                                  {event.visibility}
                                </span>
                                {event.submission_required && (
                                  <Badge className="bg-cyan-500/10 text-cyan-400 border-none text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                    Sub Req
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Event Type */}
                        <td className="py-4 px-6">
                          <span className="capitalize font-medium text-neutral-300">
                            {event.event_type}
                          </span>
                        </td>

                        {/* Date & Venue */}
                        <td className="py-4 px-6">
                          <div className="text-xs text-neutral-300">
                            {new Date(event.start_date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          {event.venue && (
                            <div className="flex items-center text-[11px] text-neutral-500 mt-1">
                              <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                              <span className="truncate max-w-[150px]">{event.venue}</span>
                            </div>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs">
                            <Award className="h-4 w-4" />
                            {event.points} pts
                          </div>
                        </td>

                        {/* Registrations */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-300 font-bold">
                            <Users className="h-4 w-4 text-neutral-500" />
                            {event.registration_count}
                            {event.max_participants && (
                              <span className="text-neutral-500 font-medium">/{event.max_participants}</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg text-neutral-400">
                              <Link href={`/admin/events/${event.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-neutral-500/10 hover:text-white rounded-lg text-neutral-400">
                              <Link href={`/admin/events/${event.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              onClick={() => handleDelete(event.id, event.title)}
                              disabled={isPending}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-neutral-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block lg:hidden divide-y divide-white/5">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-5 space-y-4">
                  <div className="flex gap-4">
                    <div className="h-14 w-20 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-neutral-900">
                      {event.banner_url ? (
                        <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-600">
                          EVENT
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm leading-snug">{event.title}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400">
                          {event.event_type}
                        </span>
                        <span className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border border-white/5 bg-white/[0.02] text-cyan-400">
                          {event.points} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3 text-neutral-400">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Date</span>
                      <span className="text-white font-medium">
                        {new Date(event.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Registrations</span>
                      <span className="text-white font-medium">
                        {event.registration_count} {event.max_participants ? `/ ${event.max_participants}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                    <Button asChild size="sm" variant="ghost" className="h-8 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg text-neutral-400 gap-1">
                      <Link href={`/admin/events/${event.id}`}>
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-8 hover:bg-neutral-500/10 hover:text-white rounded-lg text-neutral-400 gap-1">
                      <Link href={`/admin/events/${event.id}/edit`}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      onClick={() => handleDelete(event.id, event.title)}
                      disabled={isPending}
                      size="sm"
                      variant="ghost"
                      className="h-8 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-neutral-400 gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
