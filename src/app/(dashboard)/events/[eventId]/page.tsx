import type { Metadata } from 'next'
import { getEventById } from '@/actions/events'
import { getMySubmission } from '@/actions/submissions'
import RegistrationButton from '@/components/events/registration-button'
import SubmissionForm from '@/components/events/submission-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin, Award, Users, ShieldAlert, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ eventId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params
  const { data: event } = await getEventById(eventId)
  return {
    title: event ? `${event.title} | PhotoHub` : 'Event Details | PhotoHub',
    description: event?.description || 'Event details and registrations.',
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params
  const result = await getEventById(eventId)

  if (result.error || !result.data) {
    notFound()
  }

  const event = result.data
  const isPast = new Date(event.end_date) < new Date()

  // Fetch the user's submission if registered
  let existingSubmission = null
  if (event.is_registered) {
    const subResult = await getMySubmission('event', event.id)
    existingSubmission = subResult.data
  }

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
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Events
      </Link>

      {/* Event Info Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("border-none capitalize font-bold text-[10px] px-2.5 py-0.5", typeStyles[event.event_type] || typeStyles.other)}>
            {event.event_type}
          </Badge>
          <Badge className={cn(
            "border-none font-bold text-[10px] px-2.5 py-0.5 capitalize",
            isPast ? 'bg-neutral-800 text-neutral-400' : 'bg-cyan-500 text-black'
          )}>
            {isPast ? 'Past Event' : 'Upcoming'}
          </Badge>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {event.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-neutral-450 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-cyan-400" />
            {format(new Date(event.start_date), 'dd MMM yyyy, hh:mm a')}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-cyan-400" />
              {event.venue}
            </span>
          )}
        </div>
      </div>

      {/* Main Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Poster & Tabs Content */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Event Poster (4:5 Aspect Ratio) */}
            {event.banner_url && (
              <div className="md:col-span-2">
                <Card className="border-neutral-200 dark:border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl h-fit">
                  <div className="relative aspect-[4/5] w-full bg-neutral-950 flex items-center justify-center">
                    <img src={event.banner_url} alt={event.title} className="h-full w-full object-contain" />
                  </div>
                </Card>
              </div>
            )}
            
            {/* Content Tabs (Overview / Submissions) */}
            <div className={cn("space-y-6", event.banner_url ? "md:col-span-3" : "md:col-span-5")}>
              <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white/[0.02] border border-white/5 h-11 p-1 rounded-xl w-full sm:w-auto">
              <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-1 sm:flex-initial">
                Overview
              </TabsTrigger>
              {event.submission_required && (
                <TabsTrigger value="submission" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-1 sm:flex-initial">
                  My Submission
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Overview */}
            <TabsContent value="overview" className="pt-4 space-y-6">
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white">Event Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {event.description || 'No description provided for this event.'}
                </CardContent>
              </Card>

              {event.external_link && (
                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 text-sm text-cyan-400/80">
                  <ExternalLink className="h-5 w-5 shrink-0 mt-0.5 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Attachment / External Link</span>
                    Access the resources, external forms, or join links here:{" "}
                    <a href={event.external_link} target={event.external_link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-semibold text-cyan-400 hover:underline break-all">
                      {event.external_link}
                    </a>
                  </div>
                </div>
              )}

              {event.submission_required && (
                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 text-sm text-cyan-400/80">
                  <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Submission Required</span>
                    This event requires a contribution to earn points. Submit your entry via the <span className="font-semibold text-cyan-400">My Submission</span> tab.
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: Submissions */}
            {event.submission_required && (
              <TabsContent value="submission" className="pt-4">
                {event.is_registered ? (
                  <SubmissionForm
                    submittableType="event"
                    submittableId={event.id}
                    submissionMode={event.submission_mode || 'image'}
                    existingSubmission={existingSubmission}
                  />
                ) : (
                  <Card className="border-yellow-500/10 bg-yellow-500/5 rounded-2xl p-6 text-center text-yellow-500">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm font-bold">Registration Required</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      You must register for this event before you can submit an entry.
                    </p>
                  </Card>
                )}
              </TabsContent>
            )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Right Side: Registration Widget */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white">Event Details</CardTitle>
              <CardDescription className="text-xs text-neutral-500">Operation details & registration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <RegistrationButton
                eventId={event.id}
                initialIsRegistered={event.is_registered || false}
                registrationCount={event.registration_count || 0}
                maxParticipants={event.max_participants}
                deadline={event.registration_deadline}
              />

              {event.external_link && (
                <Button asChild className="w-full bg-[#18181B] border border-white/10 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl h-10 gap-1.5 transition-all mt-2">
                  <a href={event.external_link} target={event.external_link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                    External Link / Form
                  </a>
                </Button>
              )}

              <div className="space-y-4 border-t border-white/5 pt-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Award Points</span>
                  <span className="text-cyan-400 font-bold text-sm">+{event.points} PTS</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Total Registered</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-neutral-500" />
                    {event.registration_count}
                    {event.max_participants ? ` / ${event.max_participants}` : ''}
                  </span>
                </div>

                {event.registration_deadline && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Registration Deadline</span>
                    <span className="text-neutral-300 font-medium">
                      {format(new Date(event.registration_deadline), 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Visibility</span>
                  <span className="text-neutral-300 font-semibold capitalize bg-white/5 px-2 py-0.5 rounded-md text-[10px]">
                    {event.visibility.replace('_', ' ')}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
