'use client'

import { useState, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyAssignments,
  respondToAssignment,
  logApexAttendance,
  uploadApexMedia,
  deleteApexMedia,
  updateApexStatus,
} from '@/actions/apex'
import { useAuth } from '@/providers/auth-provider'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  CheckSquare,
  Loader2,
  Play,
  Camera,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  Layers,
  Video
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { canAccessCamera } from '@/lib/constants/roles'
import { ScheduleShootDialog } from '@/components/apex/schedule-shoot-dialog'

export default function MyAssignmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  // Guard role: camera holders (board & committee members), admins, leaders
  const isAuthorized =
    profile &&
    (canAccessCamera(profile.role) || ['admin', 'leader', 'camera_holder'].includes(profile.role))
  const isCameraHolder = profile && canAccessCamera(profile.role)

  const { data: result, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await getMyAssignments()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!isAuthorized,
    refetchOnWindowFocus: false,
  })

  const assignments = result || []

  // Split into active/upcoming vs completed assignments
  const activeAssignments = assignments.filter((a: any) => {
    const isDone = ['completed', 'delivered'].includes(a.apex_requests?.status)
    const isUserDone = a.apex_attendance?.some((att: any) => !!att.checked_out_at)
    return !isDone && !isUserDone && a.status !== 'rejected'
  })

  const completedAssignments = assignments.filter((a: any) => {
    const isDone = ['completed', 'delivered'].includes(a.apex_requests?.status)
    const isUserDone = a.apex_attendance?.some((att: any) => !!att.checked_out_at)
    return isDone || isUserDone || a.status === 'rejected'
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

  // Attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      checkIn,
      checkOut,
    }: {
      assignmentId: string
      checkIn: string
      checkOut?: string
    }) => {
      const res = await logApexAttendance(assignmentId, checkIn, checkOut)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
      toast.success('Attendance logged successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log attendance')
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

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-neutral-400 max-w-sm">
          Only camera holders, club leaders, and administrators can access the shoot assignments panel.
        </p>
      </div>
    )
  }

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
            Manage your campus event coverage assignments, view shoot camera gear, log individual attendance, and upload deliverables.
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

            // Individual Attendance: only for this user
            const attendanceRecord =
              (assignment.apex_attendance || []).find((att: any) => att.assignment_id === assignment.id) ||
              assignment.apex_attendance?.[0]

            const isShootConcluded = req.status === 'completed' || req.status === 'delivered'
            const hasCheckedIn = !!attendanceRecord?.checked_in_at
            const hasCompleted = !!attendanceRecord?.checked_out_at

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
                        Your Role: {assignment.role}
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
                      {req.apex_assignments && req.apex_assignments.length > 0 && (
                        <div className="border border-white/5 bg-white/[0.015] p-3 rounded-xl space-y-2 mt-3">
                          <div className="flex items-center gap-1.5 text-neutral-300 font-bold text-xs">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Assigned Crew ({req.apex_assignments.length})</span>
                          </div>
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
                        </div>
                      )}

                      {req.notes && (
                        <div className="pt-2 text-xs text-neutral-400 bg-white/[0.01] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                          <span className="font-semibold text-neutral-300 block mb-1">Shoot Notes / APEX:</span>
                          {req.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Operational controls (Attendance / Deliverables) */}
                    {isAccepted && (
                      <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                        {/* Attendance Tracker */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Your Attendance Log
                          </h4>

                          {isShootConcluded ? (
                            <div className="text-xs text-emerald-400 flex items-center gap-1.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Shoot has concluded. Attendance recorded (+25 points awarded).</span>
                            </div>
                          ) : !hasCheckedIn ? (
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  attendanceMutation.mutate({
                                    assignmentId: assignment.id,
                                    checkIn: new Date().toISOString(),
                                  })
                                }
                                disabled={attendanceMutation.isPending}
                                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-xl h-10 text-xs gap-2 px-4 shadow-md shadow-cyan-950/20"
                              >
                                {attendanceMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                Check In (Shoot Started)
                              </Button>
                              <p className="text-[10px] text-neutral-500">
                                Click when you arrive at the venue to start covering the event.
                              </p>
                            </div>
                          ) : !hasCompleted ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  Checked In
                                </Badge>
                                <span className="text-[10px] text-neutral-400">
                                  Since {format(new Date(attendanceRecord.checked_in_at), 'hh:mm a')}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  attendanceMutation.mutate({
                                    assignmentId: assignment.id,
                                    checkIn: attendanceRecord.checked_in_at,
                                    checkOut: new Date().toISOString(),
                                  })
                                }
                                disabled={attendanceMutation.isPending}
                                className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold rounded-xl h-10 text-xs gap-2 px-4"
                              >
                                {attendanceMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckSquare className="h-4 w-4" />
                                )}
                                Check Out (Shoot Finished)
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-400 flex items-center gap-1.5 p-3 rounded-xl border border-green-500/20 bg-green-500/5 text-green-400">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Your attendance is logged. Points awarded (+25 pts)!</span>
                            </div>
                          )}
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
    </div>
  )
}
