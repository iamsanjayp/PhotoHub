import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventById, getEventRegistrations, getEventAnalytics } from '@/actions/events'
import { getSubmissions } from '@/actions/submissions'
import AdminEventDashboard from '@/components/events/admin-event-dashboard'

interface AdminEventDetailPageProps {
  params: Promise<{
    eventId: string
  }>
}

export async function generateMetadata({ params }: AdminEventDetailPageProps): Promise<Metadata> {
  const { eventId } = await params
  const { data: event } = await getEventById(eventId)
  return {
    title: event ? `Manage: ${event.title} | PhotoHub` : 'Event Admin | PhotoHub',
    description: 'Manage event participants, submissions, and score calculations.',
  }
}

export default async function AdminEventDetailPage({ params }: AdminEventDetailPageProps) {
  const { eventId } = await params

  // Fetch all administrative event details in parallel
  const [
    eventRes,
    registrationsRes,
    submissionsRes,
    analyticsRes
  ] = await Promise.all([
    getEventById(eventId),
    getEventRegistrations(eventId),
    getSubmissions('event', eventId),
    getEventAnalytics(eventId)
  ])

  if (eventRes.error || !eventRes.data) {
    return notFound()
  }

  return (
    <AdminEventDashboard
      event={eventRes.data}
      registrations={registrationsRes.data || []}
      submissions={submissionsRes.data || []}
      analytics={analyticsRes.data || { registered: 0, attended: 0, submitted: 0, attendance_rate: 0, submission_rate: 0 }}
    />
  )
}
