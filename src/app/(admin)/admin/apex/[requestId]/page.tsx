import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getApexRequestById } from '@/actions/apex'
import { getMembers } from '@/actions/members'
import { getEquipment } from '@/actions/equipment'
import ApexAdminDetail from '@/components/apex/apex-admin-detail'

interface AdminApexDetailPageProps {
  params: Promise<{
    requestId: string
  }>
}

export async function generateMetadata({ params }: AdminApexDetailPageProps): Promise<Metadata> {
  const { requestId } = await params
  const { data: request } = await getApexRequestById(requestId)
  return {
    title: request ? `Manage Request: ${request.event_name} | PhotoHub` : 'APEX Request Detail | PhotoHub',
    description: 'Manage coverage crew assignments, checkouts, and deliverable moderation.',
  }
}

export default async function AdminApexDetailPage({ params }: AdminApexDetailPageProps) {
  const { requestId } = await params

  // Fetch all necessary details for team assignment
  const [
    requestRes,
    membersRes,
    equipmentRes
  ] = await Promise.all([
    getApexRequestById(requestId),
    getMembers(),
    getEquipment()
  ])

  if (requestRes.error || !requestRes.data) {
    return notFound()
  }

  return (
    <ApexAdminDetail
      request={requestRes.data}
      members={membersRes.data || []}
      equipmentList={equipmentRes.data || []}
    />
  )
}
