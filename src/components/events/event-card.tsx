'use client'

import Link from 'next/link'
import type { Event } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export default function EventCard({ event }: { event: Event }) {
  const isPast = new Date(event.end_date) < new Date()
  const isOngoing = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date()

  // Custom styling for different event types
  const typeStyles: Record<string, string> = {
    workshop: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    competition: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    meetup: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    photowalk: 'bg-green-500/10 text-green-400 border-green-500/20',
    exhibition: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    webinar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    other: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full flex"
    >
      <Card className="flex flex-col h-full w-full overflow-hidden border-white/5 bg-black/40 backdrop-blur-xl hover:border-white/10 hover:bg-black/60 transition-all duration-300 group">
        
        {/* Banner Section */}
        <div className="relative h-44 w-full bg-gradient-to-br from-neutral-800 to-neutral-900 overflow-hidden shrink-0">
          {event.banner_url ? (
            <img 
              src={event.banner_url} 
              alt={event.title} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 to-neutral-900 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-neutral-700 group-hover:text-cyan-500/30 transition-colors" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <Badge className={cn(
              "border-none font-bold text-[10px] px-2.5 py-0.5 shadow-md capitalize",
              isPast 
                ? 'bg-neutral-800 text-neutral-400' 
                : isOngoing 
                  ? 'bg-emerald-500 text-black animate-pulse' 
                  : 'bg-cyan-500 text-black'
            )}>
              {isPast ? 'Past Event' : isOngoing ? 'Ongoing' : 'Upcoming'}
            </Badge>
          </div>
        </div>

        {/* Content Section */}
        <CardHeader className="p-4 pb-2">
          <Badge className={cn("border-none capitalize font-bold text-[10px] mb-2 w-fit", typeStyles[event.event_type] || typeStyles.other)}>
            {event.event_type}
          </Badge>
          <CardTitle className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            {event.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 pb-4 flex-1 space-y-3">
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {event.description || 'No description provided.'}
          </p>

          <div className="space-y-2 pt-1 border-t border-white/5 text-[11px] text-neutral-400">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{format(new Date(event.start_date), 'dd MMM yyyy, hh:mm a')}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
              <span>
                {event.registration_count || 0} Registered
                {event.max_participants ? ` / ${event.max_participants} Max` : ''}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 border-t border-white/5 bg-black/10 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-bold text-cyan-400">
            +{event.points} PTS
          </span>
          <Button asChild variant="ghost" size="sm" className="h-8 text-neutral-300 hover:text-white p-0 gap-1 font-bold text-xs hover:bg-transparent">
            <Link href={`/events/${event.id}`}>
              Details
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>

      </Card>
    </motion.div>
  )
}
