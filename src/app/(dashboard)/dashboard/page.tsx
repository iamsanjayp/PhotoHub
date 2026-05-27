import { getCurrentProfile } from '@/actions/auth'
import { getEvents } from '@/actions/events'
import { getAnnouncements } from '@/actions/announcements'
import { getUserPoints } from '@/actions/leaderboard'
import { getMyAssignments } from '@/actions/apex'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Calendar,
  Megaphone,
  ClipboardList,
  ArrowRight,
  User,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Award,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // Fetch dashboard data in parallel
  const [
    eventsResult,
    announcementsResult,
    pointsResult,
    assignmentsResult
  ] = await Promise.all([
    getEvents({ status: 'upcoming' }),
    getAnnouncements(false),
    getUserPoints(profile.id),
    ['admin', 'leader', 'camera_holder'].includes(profile.role) ? getMyAssignments() : Promise.resolve({ data: [] })
  ])

  const upcomingEvents = (eventsResult.data || []).slice(0, 3)
  const announcements = (announcementsResult.data || []).slice(0, 3)
  const pointsData = pointsResult.data || { total_points: 0, monthly_points: 0, rank: 999 }
  const activeAssignments = (assignmentsResult.data || [])
    .filter((a: any) => a.status === 'pending' || a.status === 'accepted')
    .slice(0, 3)

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-white/5 p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Hello, {profile.full_name?.split(' ')[0] || 'Member'}!
            </h1>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-none capitalize font-semibold">
              {profile.role.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {profile.department ? `${profile.department} Dept` : 'Club Member'} • Batch {profile.batch || 'N/A'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl px-5 py-5 h-auto text-xs md:text-sm">
            <Link href="/events">
              <Calendar className="mr-2 h-4 w-4" />
              Browse Events
            </Link>
          </Button>
          {['admin', 'leader'].includes(profile.role) && (
            <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white rounded-xl px-5 py-5 h-auto text-xs md:text-sm">
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4 text-cyan-400" />
                Admin Panel
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Points & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-cyan-500/10 bg-gradient-to-tr from-black to-[#0E1719] shadow-md shadow-cyan-950/5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy className="h-24 w-24 text-cyan-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Leaderboard Rank
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">Current Club Standing</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-5xl font-extrabold text-white tracking-tight">
              #{pointsData.rank || 'N/A'}
            </div>
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Top positions update in real-time
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
              Total Contributions
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">Accumulated Points</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-5xl font-extrabold text-white tracking-tight">
              {pointsData.total_points || 0} <span className="text-sm font-semibold text-neutral-500">PTS</span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Monthly points: <span className="text-cyan-400 font-bold">{pointsData.monthly_points || 0}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
              Club Participation
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">Submissions & Registrations</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex gap-8">
              <div>
                <div className="text-4xl font-extrabold text-white">
                  {pointsData.event_count || 0}
                </div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Events</span>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-white">
                  {pointsData.submission_count || 0}
                </div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Submissions</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">
              Maintain high activity for bonuses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left column (Announcements & Events), Right column (Active Assignments) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Announcements */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-cyan-400" />
                Latest Announcements
              </h2>
              <Link href="/announcements" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 group">
                View All
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center text-sm text-neutral-500">
                No recent announcements.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <Card key={ann.id} className="border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-xl transition-all duration-200">
                    <CardHeader className="p-4 pb-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                          {ann.is_pinned && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />}
                          {ann.title}
                        </CardTitle>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {format(new Date(ann.created_at), 'dd MMM')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>
                      {ann.external_link && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/[0.03]">
                          <a
                            href={ann.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            <span>Attachment / Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Events */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                Upcoming Events
              </h2>
              <Link href="/events" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 group">
                View All
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center text-sm text-neutral-500">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-xl flex flex-col justify-between transition-all duration-200 group">
                    <CardHeader className="p-4 pb-2">
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-none capitalize font-bold text-[10px] mb-2 w-fit">
                        {event.event_type}
                      </Badge>
                      <CardTitle className="text-sm font-bold text-white truncate">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 pb-3 space-y-2 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{format(new Date(event.start_date), 'dd MMM yyyy, hh:mm a')}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      )}
                    </CardContent>
                    <div className="p-4 pt-0 border-t border-white/5 mt-2 flex justify-between items-center">
                      <span className="text-[10px] text-neutral-500">
                        {event.registration_count} registered
                      </span>
                      <Button asChild variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 p-0 h-auto gap-0.5 font-bold text-xs">
                        <Link href={`/events/${event.id}`}>
                          View Details
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Active Assignments / Bookings */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-cyan-400" />
              Active Assignments
            </h2>

            {activeAssignments.length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center text-sm text-neutral-500 bg-white/[0.005]">
                No pending or active coverage assignments.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAssignments.map((assignment: any) => {
                  const req = assignment.apex_requests
                  if (!req) return null
                  return (
                    <Card key={assignment.id} className="border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-xl transition-all duration-200">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider capitalize">
                            {assignment.role}
                          </span>
                          <Badge className={cn(
                            "border-none text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize",
                            assignment.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                          )}>
                            {assignment.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-bold text-white truncate mt-1">
                          {req.event_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 pb-3 text-xs text-neutral-400 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-neutral-500" />
                          <span>{format(new Date(req.event_date), 'dd MMM yyyy')}</span>
                        </div>
                        {req.venue && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="truncate">{req.venue}</span>
                          </div>
                        )}
                      </CardContent>
                      <div className="p-3 border-t border-white/5 bg-white/[0.005] flex justify-end">
                        <Button asChild variant="ghost" size="sm" className="text-neutral-300 hover:text-white p-0 h-auto font-bold text-xs">
                          <Link href="/my-assignments">
                            Manage Assignment
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}

// Simple placeholder components for Shield to prevent build error
function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
    </svg>
  )
}
