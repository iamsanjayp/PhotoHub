'use client'

import { useState, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyAssignments,
  respondToAssignment,
  uploadApexMedia,
  deleteApexMedia,
  updateApexStatus,
  assignTeamMember,
} from '@/actions/apex'
import { getMembers } from '@/actions/members'
import { addMissedAttendanceRecord } from '@/actions/missed-attendance'
import { useAuth } from '@/providers/auth-provider'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { MediaUpload } from '@/components/ui/media-upload'
import { format } from 'date-fns'
import {
  ClipboardList,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Upload,
  Trash2,
  Loader2,
  Camera,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  Video,
  GraduationCap,
  Plus,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { canAccessCamera } from '@/lib/constants/roles'
import { ScheduleShootDialog } from '@/components/apex/schedule-shoot-dialog'

export default function MyAssignmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  // Add crew member state
  const [addCrewShoot, setAddCrewShoot] = useState<any | null>(null)
  const [newCrewUserId, setNewCrewUserId] = useState('')
  const [newCrewRole, setNewCrewRole] = useState('photographer')
  const [newCrewSearch, setNewCrewSearch] = useState('')

  // Claim missed attendance state
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [claimShoot, setClaimShoot] = useState<any>(null)
  const [claimRollNumber, setClaimRollNumber] = useState('')
  const [claimSelectedHours, setClaimSelectedHours] = useState<number[]>([1])
  const [claimRemarks, setClaimRemarks] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimShoot) return
    if (!claimRollNumber.trim()) {
      toast.error('Please enter your college roll number')
      return
    }
    if (claimSelectedHours.length === 0) {
      toast.error('Please select at least one hour')
      return
    }

    setIsClaiming(true)
    const res = await addMissedAttendanceRecord({
      sourceType: 'shoot',
      sourceId: claimShoot.id,
      userId: profile?.id,
      name: profile?.full_name || 'Member',
      email: profile?.email || '',
      rollNumber: claimRollNumber.trim(),
      hours: claimSelectedHours,
      notes: claimRemarks.trim() || undefined,
    })
    setIsClaiming(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Missed attendance claimed successfully! Logged for college export.')
      setClaimDialogOpen(false)
      setClaimShoot(null)
      setClaimRemarks('')
      setClaimSelectedHours([1])
    }
  }

  const isCameraHolder = profile && canAccessCamera(profile.role)

  const { data: result, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await getMyAssignments()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile,
    refetchOnWindowFocus: false,
  })

  const assignments = result || []

  // Query club members for assignment
  const { data: allMembers = [] } = useQuery({
    queryKey: ['club-members-directory-short'],
    queryFn: async () => {
      const res = await getMembers()
      return res.data || []
    },
    enabled: !!profile,
  })

  // Assign crew member mutation
  const assignCrewMutation = useMutation({
    mutationFn: async () => {
      if (!addCrewShoot || !newCrewUserId) return
      const res = await assignTeamMember(addCrewShoot.id, newCrewUserId, newCrewRole, null)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      toast.success('Crew member added to shoot!')
      setAddCrewShoot(null)
      setNewCrewUserId('')
      setNewCrewSearch('')
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign crew member')
    },
  })

  const filteredNewCrewMembers = allMembers.filter((m: any) => {
    if (!newCrewSearch.trim()) return true
    const q = newCrewSearch.toLowerCase()
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.roll_number || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    )
  })

  // Split into active/upcoming vs completed assignments
  const activeAssignments = assignments.filter((a: any) => {
    const isDone = ['completed', 'delivered'].includes(a.apex_requests?.status)
    return !isDone && a.status !== 'rejected'
  })

  const completedAssignments = assignments.filter((a: any) => {
    const isDone = ['completed', 'delivered'].includes(a.apex_requests?.status)
    return isDone || a.status === 'rejected'
  })

  // Response mutation
  const respondMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: 'accepted' | 'rejected' }) => {
      const res = await respondToAssignment(assignmentId, status)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      toast.success('Response submitted successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit response')
    },
  })

  // Complete shoot mutation
  const completeApexMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await updateApexStatus(requestId, 'completed')
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      toast.success('Shoot marked as completed and points awarded to crew!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to complete shoot')
    },
  })

  // Media upload handler
  const handleMediaUpload = async (requestId: string, url: string, mediaType: 'image' | 'video', publicId?: string) => {
    const result = await uploadApexMedia(requestId, url, mediaType, publicId)
    if (result.error) {
      toast.error(result.error)
    } else {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      toast.success('Deliverable uploaded successfully!')
    }
  }

  // Delete media handler
  const handleMediaDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return

    const result = await deleteApexMedia(mediaId)
    if (result.error) {
      toast.error(result.error)
    } else {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      toast.success('Deliverable deleted.')
    }
  }

  if (!profile) return null

  const currentDisplayList = activeTab === 'active' ? activeAssignments : completedAssignments

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-cyan-400" />
              My Shoot Assignments
            </h1>
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2.5 py-0.5 rounded-full">
              {activeAssignments.length} Active
            </Badge>
          </div>
          <p className="text-neutral-400 text-sm">
            Manage your campus event coverage assignments, view shoot camera gear, claim missed college attendance, and upload deliverables.
          </p>
        </div>

        {isCameraHolder && (
          <ScheduleShootDialog
            currentUser={profile}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
            }}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'active'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Active & Upcoming Shoots</span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
            {activeAssignments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'completed'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
          )}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Completed Shoots History</span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
            {completedAssignments.length}
          </span>
        </button>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <Card key={idx} className="border-white/5 bg-black/40 p-6">
              <Skeleton className="h-6 w-1/4 bg-neutral-800 mb-4" />
              <Skeleton className="h-20 w-full bg-neutral-800" />
            </Card>
          ))}
        </div>
      ) : currentDisplayList.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          {activeTab === 'active'
            ? 'You have no active or upcoming shoot assignments scheduled.'
            : 'No completed shoot history recorded yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {currentDisplayList.map((assignment: any) => {
            const req = assignment.apex_requests
            if (!req) return null

            const isPendingResponse = assignment.status === 'pending'
            const isAccepted = assignment.status === 'accepted'
            const isRejected = assignment.status === 'rejected'

            const isShootConcluded = req.status === 'completed' || req.status === 'delivered'

            // Shoot-level gear allocation: collect all allocated equipment items for this shoot
            const shootGearList = (() => {
              const map = new Map<string, { equipment: any; custodian: any }>()

              // 1. From equipment_assignments on req
              for (const ea of (req.equipment_assignments || [])) {
                if (ea.equipment && !ea.returned_at) {
                  map.set(ea.equipment.id, {
                    equipment: ea.equipment,
                    custodian: ea.profiles,
                  })
                }
              }

              // 2. From apex_assignments on req
              for (const a of (req.apex_assignments || [])) {
                if (a.equipment && !map.has(a.equipment.id)) {
                  map.set(a.equipment.id, {
                    equipment: a.equipment,
                    custodian: a.profiles,
                  })
                }
              }

              // 3. Fallback to current assignment equipment
              if (assignment.equipment && !map.has(assignment.equipment.id)) {
                map.set(assignment.equipment.id, {
                  equipment: assignment.equipment,
                  custodian: profile,
                })
              }

              return Array.from(map.values())
            })()

            return (
              <Card
                key={assignment.id}
                className={cn(
                  'border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300',
                  isPendingResponse && 'border-yellow-500/20 shadow-lg shadow-yellow-950/5'
                )}
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.005]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider capitalize px-2.5 py-0.5 rounded-full">
                        Shoot Crew
                      </Badge>

                      <Badge
                        className={cn(
                          'border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize',
                          assignment.status === 'pending' && 'bg-yellow-500/15 text-yellow-400',
                          assignment.status === 'accepted' && 'bg-green-500/15 text-green-400',
                          assignment.status === 'rejected' && 'bg-red-500/15 text-red-400'
                        )}
                      >
                        {assignment.status}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] uppercase tracking-wider border font-bold',
                          req.status === 'ongoing' && 'border-purple-500/30 bg-purple-500/10 text-purple-400',
                          req.status === 'assigned' && 'border-blue-500/30 bg-blue-500/10 text-blue-400',
                          ['completed', 'delivered'].includes(req.status) && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        )}
                      >
                        Shoot: {req.status}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-extrabold text-white mt-1.5">{req.event_name}</h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {['completed', 'delivered'].includes(req.status) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-3 py-1 rounded-full gap-1.5 flex items-center">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Shoot Completed (+25 pts)
                      </Badge>
                    ) : isAccepted && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completeApexMutation.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Mark entire shoot "${req.event_name}" as complete? This returns equipment and awards points to all crew members.`
                            )
                          ) {
                            completeApexMutation.mutate(req.id)
                          }
                        }}
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {completeApexMutation.isPending ? 'Completing...' : 'Mark Shoot Complete'}
                      </Button>
                    )}

                    {isPendingResponse && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respondMutation.mutate({ assignmentId: assignment.id, status: 'accepted' })
                          }
                          className="bg-green-500 text-black hover:bg-green-400 font-bold rounded-xl h-9 px-4 text-xs gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            respondMutation.mutate({ assignmentId: assignment.id, status: 'rejected' })
                          }
                          className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold rounded-xl h-9 px-4 text-xs gap-1.5"
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Metadata & Shared Gear */}
                    <div className="space-y-3.5 text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span className="font-semibold text-neutral-200">
                          {format(new Date(req.event_date), 'EEEE, dd MMMM yyyy')}
                        </span>
                      </div>

                      {req.event_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-neutral-500 shrink-0" />
                          <span>
                            Time: {req.event_time} {req.end_time ? ` - ${req.end_time}` : ''}
                          </span>
                        </div>
                      )}

                      {req.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-500 shrink-0" />
                          <span>Venue: {req.venue}</span>
                        </div>
                      )}

                      {req.department && (
                        <div className="text-[11px] text-neutral-400">
                          Host Department: <span className="text-neutral-200 font-medium">{req.department}</span>
                        </div>
                      )}

                      {/* Shoot Gear Allocation (Visible to ALL crew members) */}
                      {shootGearList.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          <div className="flex items-center gap-1.5 text-neutral-300 font-bold text-xs">
                            <Camera className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Allocated Shoot Equipment & Cameras ({shootGearList.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {shootGearList.map((gearItem) => {
                              const eq = gearItem.equipment
                              const custodian = gearItem.custodian
                              const isMeCustodian = custodian ? custodian.id === profile.id : false

                              return (
                                <div
                                  key={eq.id}
                                  className="flex items-start gap-3 border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-xl"
                                >
                                  <Camera className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5 text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-white text-xs">{eq.name}</span>
                                      <Badge className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1.5 py-0 rounded-full border-none capitalize">
                                        {eq.type}
                                      </Badge>
                                      {isMeCustodian && (
                                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0 rounded-full font-bold">
                                          You are Custodian
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-neutral-400">
                                      Model: {eq.model || eq.type} • S/N: {eq.serial_number || 'N/A'}
                                    </p>
                                    {custodian && !isMeCustodian && (
                                      <p className="text-[10px] text-cyan-300 pt-0.5">
                                        Custodian: <strong>{custodian.full_name || 'Teammate'}</strong>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-500 italic p-3 border border-dashed border-white/5 rounded-xl mt-3">
                          No club camera allocated for this shoot (crew using personal equipment).
                        </div>
                      )}

                      {/* Fellow Crew Team */}
                      <div className="border border-white/5 bg-white/[0.015] p-3 rounded-xl space-y-2 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-neutral-300 font-bold text-xs">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Assigned Crew ({(req.apex_assignments || []).length})</span>
                          </div>
                          {!isShootConcluded && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddCrewShoot(req)
                                setNewCrewUserId('')
                                setNewCrewRole('photographer')
                                setNewCrewSearch('')
                              }}
                              className="h-6 text-[11px] rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-semibold px-2 gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Crew Member
                            </Button>
                          )}
                        </div>
                        {req.apex_assignments && req.apex_assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {req.apex_assignments.map((other: any) => {
                              const isMe = other.user_id === profile.id
                              return (
                                <span
                                  key={other.id}
                                  className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1',
                                    isMe
                                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-bold'
                                      : 'bg-white/[0.03] border-white/10 text-neutral-300'
                                  )}
                                >
                                  <span>{other.profiles?.full_name || 'Teammate'}</span>
                                  <span className="text-neutral-500">•</span>
                                  <span className="capitalize text-neutral-400">{other.role}</span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500 italic">No additional crew assigned yet.</p>
                        )}
                      </div>

                      {req.notes && (
                        <div className="pt-2 text-xs text-neutral-400 bg-white/[0.01] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                          <span className="font-semibold text-neutral-300 block mb-1">Shoot Notes / APEX:</span>
                          {req.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Operational controls (Coverage Status / Deliverables) */}
                    {isAccepted && (
                      <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                        {/* Shoot Schedule Proof & Status */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              Scheduled Coverage Proof
                            </h4>
                            <Badge
                              className={cn(
                                "text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider",
                                isShootConcluded
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              )}
                            >
                              {isShootConcluded ? 'Concluded' : 'Scheduled'}
                            </Badge>
                          </div>

                          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 text-xs text-neutral-300">
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              <Clock className="h-3.5 w-3.5 text-cyan-400" />
                              <span>{req.event_date ? format(new Date(req.event_date), 'EEE, MMM d, yyyy') : 'Date scheduled'}</span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              {req.event_time ? `${req.event_time}${req.end_time ? ` to ${req.end_time}` : ''}` : 'Timing as per schedule'}
                              {req.venue ? ` • ${req.venue}` : ''}
                            </p>
                            <p className="text-[10px] text-neutral-500 pt-1 border-t border-white/5">
                              Attendance is validated via scheduled shoot timing. Points are awarded automatically upon shoot completion.
                            </p>
                          </div>

                          {isShootConcluded ? (
                            <div className="text-xs text-emerald-400 flex items-center gap-1.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Shoot concluded. Attendance confirmed (+25 pts awarded)!</span>
                            </div>
                          ) : null}

                          {/* Missed PCDP college attendance claim button */}
                          <div className="pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setClaimShoot(req)
                                setClaimRollNumber(profile.roll_number || '')
                                setClaimSelectedHours([1])
                                setClaimRemarks('')
                                setClaimDialogOpen(true)
                              }}
                              className="w-full border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-300 font-bold rounded-xl h-8.5 text-xs gap-1.5 shadow-sm"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                              Claim Missed College Attendance
                            </Button>
                          </div>
                        </div>

                        {/* Deliverables upload */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5" />
                            Deliverables (Upload Photos/Videos)
                          </h4>

                          <MediaUpload
                            onSuccess={(res) => {
                              const info = res.info as any
                              handleMediaUpload(
                                req.id,
                                info.secure_url,
                                info.resource_type === 'video' ? 'video' : 'image',
                                info.public_id
                              )
                            }}
                          >
                            {({ open, isUploading }) => (
                              <Button
                                type="button"
                                onClick={() => open()}
                                disabled={isUploading}
                                variant="outline"
                                className="h-9 border-white/10 hover:bg-white/5 text-xs font-bold rounded-xl gap-2 text-white"
                              >
                                <Upload className="h-3.5 w-3.5 text-neutral-400" />
                                {isUploading ? 'Uploading...' : 'Upload Deliverable'}
                              </Button>
                            )}
                          </MediaUpload>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uploaded deliverables media list */}
                  {isAccepted && req.apex_media && req.apex_media.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Uploaded Deliverables ({req.apex_media.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {req.apex_media.map((media: any) => (
                          <div
                            key={media.id}
                            className="group relative aspect-square border border-white/5 bg-neutral-900 rounded-xl overflow-hidden"
                          >
                            {media.media_type === 'image' ? (
                              <img src={media.url} alt="Deliverable" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                                Video File
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleMediaDelete(media.id)}
                                className="h-7 w-7 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog for crew members to self-claim missed college attendance */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Claim Missed College Attendance
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Did you miss college classes/labs while covering <span className="text-white font-bold">{claimShoot?.event_name}</span>? Log your missed hours for institute attendance normalization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleClaimSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                Roll Number / Register Number *
              </Label>
              <Input
                value={claimRollNumber}
                onChange={(e) => setClaimRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 7376221EC101"
                className="bg-black/40 border-white/10 text-xs font-mono uppercase h-10 rounded-xl text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Select Missed Hours (1 - 7) *
                </Label>
                <span className="text-[10px] text-amber-400 font-bold">
                  {claimSelectedHours.length} hour(s) selected
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                  const isSelected = claimSelectedHours.includes(hour)
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() =>
                        setClaimSelectedHours((prev) =>
                          prev.includes(hour)
                            ? prev.filter((h) => h !== hour)
                            : [...prev, hour].sort((a, b) => a - b)
                        )
                      }
                      className={cn(
                        'py-2 rounded-lg text-xs font-bold border transition-all text-center',
                        isSelected
                          ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm shadow-amber-500/20'
                          : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                      )}
                    >
                      H{hour}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-neutral-500">
                Rule: Each hour will be exported as a distinct row in the college Excel report.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">
                Reason / Missed Lecture Details (Optional)
              </Label>
              <Input
                value={claimRemarks}
                onChange={(e) => setClaimRemarks(e.target.value)}
                placeholder="e.g. EC302 Lab, Analog Electronics"
                className="bg-black/40 border-white/10 text-xs h-10 rounded-xl text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setClaimDialogOpen(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 rounded-xl h-10 text-xs font-semibold text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isClaiming}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black font-bold rounded-xl h-10 text-xs"
              >
                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Claim'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Crew Member Dialog */}
      <Dialog open={!!addCrewShoot} onOpenChange={(open) => !open && setAddCrewShoot(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-neutral-950 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-400" />
              Add Crew Member to Shoot
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Assign a teammate to cover "{addCrewShoot?.event_name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">Coverage Role *</Label>
              <select
                value={newCrewRole}
                onChange={(e) => setNewCrewRole(e.target.value)}
                className="w-full border border-white/10 bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500/50 h-10 focus:outline-none"
              >
                <option value="photographer">Photographer</option>
                <option value="videographer">Videographer</option>
                <option value="editor">Editor</option>
                <option value="production_assistant">Production Crew</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">Select Member *</Label>
              <Input
                placeholder="Search member name, dept, or roll number..."
                value={newCrewSearch}
                onChange={(e) => setNewCrewSearch(e.target.value)}
                className="rounded-xl text-xs mb-2"
              />

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/5 rounded-xl p-2 bg-neutral-900/50">
                {filteredNewCrewMembers.map((member: any) => {
                  const isSelected = newCrewUserId === member.id
                  const isAlreadyAssigned = (addCrewShoot?.apex_assignments || []).some(
                    (a: any) => a.user_id === member.id
                  )

                  return (
                    <div
                      key={member.id}
                      onClick={() => !isAlreadyAssigned && setNewCrewUserId(member.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer',
                        isAlreadyAssigned
                          ? 'opacity-40 cursor-not-allowed bg-neutral-900'
                          : isSelected
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                          : 'hover:bg-white/5 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{member.full_name}</p>
                          <p className="text-[10px] text-neutral-400">
                            {member.department ? `${member.department} • ` : ''}{member.roll_number || member.email}
                          </p>
                        </div>
                      </div>

                      {isAlreadyAssigned ? (
                        <span className="text-[10px] text-neutral-500">Already on crew</span>
                      ) : isSelected ? (
                        <CheckCircle className="h-4 w-4 text-cyan-400" />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setAddCrewShoot(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => assignCrewMutation.mutate()}
              disabled={assignCrewMutation.isPending || !newCrewUserId}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs"
            >
              {assignCrewMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
