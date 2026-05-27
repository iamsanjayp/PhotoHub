'use client'

import { useState, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyAssignments, respondToAssignment, logApexAttendance, uploadApexMedia, deleteApexMedia } from '@/actions/apex'
import { useAuth } from '@/providers/auth-provider'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CldUploadWidget } from 'next-cloudinary'
import { format } from 'date-fns'
import { ClipboardList, Clock, MapPin, CheckCircle, XCircle, ShieldAlert, Upload, Trash2, CheckSquare, Loader2, Play, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function MyAssignmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Guard role
  const isAuthorized = profile && ['admin', 'leader', 'camera_holder'].includes(profile.role)

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
    }
  })

  // Attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ assignmentId, checkIn, checkOut }: { assignmentId: string; checkIn: string; checkOut?: string }) => {
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
    }
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
          Only camera holders, club leaders, and administrators can access the assignments panel.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-cyan-400" />
          My Assignments
        </h1>
        <p className="text-neutral-400 text-sm">
          Accept bookings, log event attendance, and upload deliverables for your assigned event coverages.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <Card key={idx} className="border-white/5 bg-black/40 p-6">
              <Skeleton className="h-6 w-1/4 bg-neutral-800 mb-4" />
              <Skeleton className="h-20 w-full bg-neutral-800" />
            </Card>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          You have no photography/videography coverage assignments.
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map((assignment: any) => {
            const req = assignment.apex_requests
            if (!req) return null

            const isPendingResponse = assignment.status === 'pending'
            const isAccepted = assignment.status === 'accepted'
            
            // Attendance helpers
            const hasCheckedIn = req.status === 'ongoing' || req.status === 'completed' || req.status === 'delivered'
            const hasCompleted = req.status === 'completed' || req.status === 'delivered'

            return (
              <Card 
                key={assignment.id} 
                className={cn(
                  "border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300",
                  isPendingResponse && "border-yellow-500/10 shadow-lg shadow-yellow-950/2"
                )}
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.005]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider capitalize">
                        Role: {assignment.role}
                      </span>
                      <Badge className={cn(
                        "border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                        assignment.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                        assignment.status === 'accepted' && 'bg-green-500/10 text-green-500',
                        assignment.status === 'rejected' && 'bg-red-500/10 text-red-500'
                      )}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{req.event_name}</h3>
                  </div>
                  
                  {isPendingResponse && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ assignmentId: assignment.id, status: 'accepted' })}
                        className="bg-green-500 text-black hover:bg-green-400 font-bold rounded-lg h-9 px-4 text-xs gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondMutation.mutate({ assignmentId: assignment.id, status: 'rejected' })}
                        className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold rounded-lg h-9 px-4 text-xs gap-1.5"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Metadata */}
                    <div className="space-y-3 text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span>Date: {format(new Date(req.event_date), 'dd MMM yyyy')}</span>
                      </div>
                      {req.event_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-neutral-500 shrink-0" />
                          <span>Time: {req.event_time} {req.end_time ? ` - ${req.end_time}` : ''}</span>
                        </div>
                      )}
                      {req.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-500 shrink-0" />
                          <span>Venue: {req.venue}</span>
                        </div>
                      )}
                      {assignment.equipment && (
                        <div className="flex items-start gap-2 border border-white/5 bg-white/[0.01] p-3 rounded-xl mt-3">
                          <Camera className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block mb-0.5">Assigned Gear</span>
                            {assignment.equipment.name} ({assignment.equipment.model})
                            <span className="text-[10px] text-neutral-500 block mt-0.5">Serial: {assignment.equipment.serial_number}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Operational controls (Attendance / DELIVERABLES) */}
                    {isAccepted && (
                      <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                        
                        {/* Attendance Tracker */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Attendance Log
                          </h4>
                          
                          {!hasCheckedIn ? (
                            <Button
                              size="sm"
                              onClick={() => attendanceMutation.mutate({ assignmentId: assignment.id, checkIn: new Date().toISOString() })}
                              className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-lg h-9 text-xs gap-1.5"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Check In (Event Start)
                            </Button>
                          ) : !hasCompleted ? (
                            <Button
                              size="sm"
                              onClick={() => attendanceMutation.mutate({ assignmentId: assignment.id, checkIn: req.created_at, checkOut: new Date().toISOString() })} // wait, use stored check_in or request
                              className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold rounded-lg h-9 text-xs gap-1.5"
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                              Check Out (Event End)
                            </Button>
                          ) : (
                            <div className="text-xs text-neutral-400 flex items-center gap-1.5 p-2.5 rounded-xl border border-green-500/10 bg-green-500/5 text-green-400">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Attendance fully logged. Event coverage completed!</span>
                            </div>
                          )}
                        </div>

                        {/* Deliverables upload */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5" />
                            Deliverables (Upload Photos/Videos)
                          </h4>

                          <CldUploadWidget
                            uploadPreset="photohub_unsigned"
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
                            {({ open }) => (
                              <Button
                                type="button"
                                onClick={() => open()}
                                variant="outline"
                                className="h-9 border-white/10 hover:bg-white/5 text-xs font-bold rounded-lg gap-2 text-white"
                              >
                                <Upload className="h-3.5 w-3.5 text-neutral-400" />
                                Upload Deliverable
                              </Button>
                            )}
                          </CldUploadWidget>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Uploaded deliverables media list */}
                  {isAccepted && req.apex_media && req.apex_media.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Uploaded Deliverables ({req.apex_media.length})</h4>
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
