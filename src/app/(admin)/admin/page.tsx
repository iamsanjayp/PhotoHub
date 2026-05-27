import type { Metadata } from 'next'
import { getMembers } from '@/actions/members'
import { getEvents } from '@/actions/events'
import { getPendingPosts } from '@/actions/posts'
import { getApexRequests } from '@/actions/apex'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users,
  Calendar,
  Inbox,
  Send,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  ClipboardList
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Admin Overview | PhotoHub',
  description: 'Photography club administrative operations dashboard.',
}

export default async function AdminPage() {
  // Fetch admin stats in parallel
  const [
    membersRes,
    eventsRes,
    postsRes,
    apexRes
  ] = await Promise.all([
    getMembers(),
    getEvents({ status: 'upcoming' }),
    getPendingPosts(),
    getApexRequests('pending')
  ])

  const totalMembers = (membersRes.data || []).length
  const activeEventsCount = (eventsRes.data || []).length
  const pendingModerationCount = (postsRes.data || []).length
  const pendingApexCount = (apexRes.data || []).length

  const recentApexRequests = (apexRes.data || []).slice(0, 3)
  const recentPendingPosts = (postsRes.data || []).slice(0, 3)

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-cyan-400" />
          Club Administration
        </h1>
        <p className="text-neutral-400 text-sm">
          Overview of club operations, media moderation, member listings, and coverage pipeline.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Members Stat */}
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
              Total Members
              <Users className="h-4 w-4 text-cyan-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">{totalMembers}</div>
            <Link href="/admin/members" className="text-[10px] text-cyan-400 hover:underline font-bold mt-2 flex items-center gap-0.5 w-fit">
              Manage members <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Events Stat */}
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
              Upcoming Events
              <Calendar className="h-4 w-4 text-cyan-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">{activeEventsCount}</div>
            <Link href="/admin/events" className="text-[10px] text-cyan-400 hover:underline font-bold mt-2 flex items-center gap-0.5 w-fit">
              Manage events <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Moderation Stat */}
        <Card className={cn(
          "border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group transition-colors",
          pendingModerationCount > 0 && "border-yellow-500/20 bg-yellow-500/[0.01]"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
              Pending Feed Posts
              <Inbox className={cn("h-4 w-4 text-neutral-400", pendingModerationCount > 0 && "text-yellow-500 animate-pulse")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">{pendingModerationCount}</div>
            <Link href="/admin/feed-moderation" className="text-[10px] text-cyan-400 hover:underline font-bold mt-2 flex items-center gap-0.5 w-fit">
              Open queue <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* APEX Pipeline Stat */}
        <Card className={cn(
          "border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group transition-colors",
          pendingApexCount > 0 && "border-cyan-500/20 bg-cyan-500/[0.01]"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
              Pending APEX Requests
              <Send className={cn("h-4 w-4 text-neutral-400", pendingApexCount > 0 && "text-cyan-400 animate-pulse")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">{pendingApexCount}</div>
            <Link href="/admin/apex" className="text-[10px] text-cyan-400 hover:underline font-bold mt-2 flex items-center gap-0.5 w-fit">
              Review pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left side (APEX requests), Right side (Recent Feed Pending) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* APEX Requests Column */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-cyan-400" />
              Pending APEX Requests
            </h2>
            <Link href="/admin/apex" className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-0.5">
              Pipeline board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentApexRequests.length === 0 ? (
            <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center text-sm text-neutral-500 bg-white/[0.002]">
              No pending APEX coverage requests.
            </div>
          ) : (
            <div className="space-y-3">
              {recentApexRequests.map((req) => (
                <Card key={req.id} className="border-white/5 bg-black/20 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">{req.event_name}</h4>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Submitted by {req.organizer_name} ({req.department || 'No Dept'})
                      </p>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-none text-[8px] font-bold py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-3 text-[10px] text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Date: {format(new Date(req.event_date), 'dd MMM yyyy')}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 p-0 h-auto font-bold text-[10px]">
                      <Link href={`/admin/apex/${req.id}`}>
                        Review Request
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Pending Feed Posts Column */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Inbox className="h-5 w-5 text-cyan-400" />
              Pending Feed Submissions
            </h2>
            <Link href="/admin/feed-moderation" className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-0.5">
              Moderation queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentPendingPosts.length === 0 ? (
            <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center text-sm text-neutral-500 bg-white/[0.002]">
              No posts awaiting moderation approval.
            </div>
          ) : (
            <div className="space-y-3">
              {recentPendingPosts.map((post) => (
                <Card key={post.id} className="border-white/5 bg-black/20 rounded-xl p-4">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-neutral-900">
                        {post.post_media?.[0]?.url && post.post_media[0].url.trim() !== '' ? (
                          <img src={post.post_media[0].url} alt="thumbnail" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-600 font-bold">PH</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block leading-none mb-1">
                          By {post.profiles?.full_name || 'Member'}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate block leading-none italic max-w-xs">
                          "{post.caption || 'No caption'}"
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 rounded-lg text-[10px] font-bold h-7 px-3 text-white">
                      <Link href="/admin/feed-moderation">
                        Evaluate
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

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
