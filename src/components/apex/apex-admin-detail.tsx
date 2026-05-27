'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { 
  assignTeamMember, 
  removeAssignment, 
  updateApexStatus, 
  deleteApexMedia 
} from '@/actions/apex'
import { 
  Send, 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  FileText, 
  Check, 
  X, 
  Trash2, 
  UserPlus, 
  FolderHeart,
  Loader2,
  HardDrive,
  UserCheck,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ApexAdminDetailProps {
  request: any
  members: any[]
  equipmentList: any[]
}

export default function ApexAdminDetail({
  request,
  members,
  equipmentList
}: ApexAdminDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isPending, startTransition] = useTransition()

  // Form states for assignment
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('photographer')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('')

  // Filter available equipment
  const availableEquipment = equipmentList.filter(e => e.status === 'available')

  // Status handlers
  const handleStatusTransition = async (status: 'ongoing' | 'completed' | 'delivered') => {
    if (!confirm(`Transition request status to "${status}"?`)) return
    startTransition(async () => {
      const res = await updateApexStatus(request.id, status)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Request status updated to ${status}`)
        router.refresh()
      }
    })
  }

  // Teammate assignment handler
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId) {
      toast.error('Please select a member')
      return
    }

    startTransition(async () => {
      const res = await assignTeamMember(
        request.id,
        selectedMemberId,
        selectedRole,
        selectedEquipmentId || null
      )
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Team member assigned successfully!')
        setSelectedMemberId('')
        setSelectedEquipmentId('')
        router.refresh()
      }
    })
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this teammate assignment?')) return
    startTransition(async () => {
      const res = await removeAssignment(assignmentId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Assignment removed')
        router.refresh()
      }
    })
  }

  const handleDeleteDeliverable = async (mediaId: string) => {
    if (!confirm('Delete this deliverable?')) return
    startTransition(async () => {
      const res = await deleteApexMedia(mediaId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Deliverable deleted')
        router.refresh()
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-none',
      approved: 'bg-cyan-500/10 text-cyan-400 border-none',
      assigned: 'bg-blue-500/10 text-blue-400 border-none',
      ongoing: 'bg-purple-500/10 text-purple-400 border-none',
      completed: 'bg-green-500/10 text-green-500 border-none',
      delivered: 'bg-emerald-500/10 text-emerald-400 border-none',
      rejected: 'bg-red-500/10 text-red-500 border-none',
    }

    return (
      <Badge className={cn("text-[10px] font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider", styles[status] || styles.pending)}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/apex"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Request Pipeline
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-2">
          <div className="flex items-center gap-3">
            <Send className="h-7 w-7 text-cyan-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{request.event_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(request.status)}
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                  {request.coverage_type} Coverage
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {request.status === 'assigned' && (
              <Button
                onClick={() => handleStatusTransition('ongoing')}
                disabled={isPending}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Ongoing
              </Button>
            )}
            {['assigned', 'ongoing'].includes(request.status) && (
              <Button
                onClick={() => handleStatusTransition('completed')}
                disabled={isPending}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Completed
              </Button>
            )}
            {request.status === 'completed' && (
              <Button
                onClick={() => handleStatusTransition('delivered')}
                disabled={isPending}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Delivered
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-black/40 border border-white/5 rounded-xl p-1 max-w-2xl h-11 text-xs">
          <TabsTrigger value="overview" className="rounded-lg py-2 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70">Overview</TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg py-2 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70">Crew & Gear</TabsTrigger>
          <TabsTrigger value="deliverables" className="rounded-lg py-2 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70">Deliverables</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg py-2 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70">Check-in Logs</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl md:col-span-2 space-y-6 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Event Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-300">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Organizer</span>
                    <span className="text-white font-medium">{request.organizer_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Department</span>
                    <span className="text-white font-medium">{request.department || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Contact Email</span>
                    <span className="text-white font-medium">{request.contact_email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Contact Phone</span>
                    <span className="text-white font-medium">{request.contact_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {request.notes && (
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Client Notes</h4>
                  <p className="text-sm text-neutral-300 bg-white/[0.01] border border-white/5 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {request.notes}
                  </p>
                </div>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl space-y-1">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Rejection Reason</h4>
                  <p className="text-sm text-red-200 italic">"{request.rejection_reason}"</p>
                </div>
              )}
            </Card>

            {/* Schedule Info */}
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Event Schedule</h3>
              
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-cyan-400 mt-0.5" />
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Date</span>
                  <span className="text-neutral-200 font-medium">
                    {new Date(request.event_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {request.event_time && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Start Time</span>
                    <span className="text-neutral-200 font-medium">{request.event_time}</span>
                  </div>
                </div>
              )}

              {request.end_time && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">End Time</span>
                    <span className="text-neutral-200 font-medium">{request.end_time}</span>
                  </div>
                </div>
              )}

              {request.venue && (
                <div className="flex items-start gap-2.5 border-t border-white/5 pt-4">
                  <MapPin className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Venue</span>
                    <span className="text-neutral-200 font-medium">{request.venue}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Crew & Gear Assignments */}
        <TabsContent value="assignments" className="mt-6">
          {['pending', 'rejected'].includes(request.status) ? (
            <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center text-sm text-neutral-500">
               te requests must be APPROVED before assigning crews and checking out equipment.
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Assignments List */}
              <div className="xl:col-span-2 space-y-4">
                <h3 className="text-md font-bold text-white px-1">Crews Assigned ({request.assignments?.length || 0})</h3>
                {request.assignments?.length === 0 ? (
                  <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-8 text-center text-sm text-neutral-500">
                    No team members assigned yet. Use the assignment panel to assign photographers, videographers, or editors.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {request.assignments.map((assignment: any) => (
                      <Card key={assignment.id} className="border-white/5 bg-black/30 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                            {assignment.profiles?.avatar_url ? (
                              <img src={assignment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase">
                                {(assignment.profiles?.full_name || 'U').slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block leading-none mb-1">
                              {assignment.profiles?.full_name || 'Crew Member'}
                            </span>
                            <span className="text-[10px] text-neutral-500 block leading-none capitalize">
                              {assignment.role}
                            </span>
                          </div>
                        </div>

                        {/* Equipment Assigned */}
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-neutral-500 shrink-0" />
                          <div className="text-xs">
                            <span className="text-neutral-500 block uppercase text-[8px] font-semibold">Equipment Checkout</span>
                            <span className="text-neutral-200">
                              {assignment.equipment?.name ? `${assignment.equipment.name} (${assignment.equipment.model})` : 'None checkout'}
                            </span>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider border",
                            assignment.status === 'accepted' && "border-green-500/20 bg-green-500/5 text-green-500",
                            assignment.status === 'rejected' && "border-red-500/20 bg-red-500/5 text-red-500",
                            assignment.status === 'pending' && "border-yellow-500/20 bg-yellow-500/5 text-yellow-500"
                          )}>
                            {assignment.status}
                          </span>
                          <Button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            disabled={isPending}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Form */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-white px-1">Assign Teammate</h3>
                <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-5">
                  <form onSubmit={handleAssignMember} className="space-y-4">
                    {/* Select Member */}
                    <div className="space-y-1.5">
                      <Label htmlFor="member" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Select Member</Label>
                      <select
                        id="member"
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                      >
                        <option value="">Select teammate...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Coverage Role</Label>
                      <select
                        id="role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                      >
                        <option value="photographer">Photographer</option>
                        <option value="videographer">Videographer</option>
                        <option value="editor">Editor</option>
                      </select>
                    </div>

                    {/* Equipment Checkout (Optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="equipment" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Assign Equipment (Optional)</Label>
                      <select
                        id="equipment"
                        value={selectedEquipmentId}
                        onChange={(e) => setSelectedEquipmentId(e.target.value)}
                        className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                      >
                        <option value="">Check out gear...</option>
                        {availableEquipment.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name} ({eq.model || eq.type})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-neutral-500 px-1 mt-1">Only available gear listed.</p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Assign Teammate
                        </>
                      )}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Deliverables */}
        <TabsContent value="deliverables" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <FolderHeart className="h-5 w-5 text-cyan-400" />
                Coverage Deliverables ({request.media?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400">
                Media files uploaded by the coverage crew for client delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {request.media?.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 border border-dashed border-white/5 rounded-2xl bg-white/[0.001]">
                  No deliverables uploaded yet. Crew members upload files in the "My Assignments" portal.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {request.media.map((media: any) => (
                    <div key={media.id} className="border border-white/5 bg-black/20 rounded-2xl overflow-hidden group relative">
                      <div className="aspect-video w-full bg-neutral-900 overflow-hidden relative">
                        {media.media_type === 'image' ? (
                          <img src={media.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <video src={media.url} className="h-full w-full object-cover" controls />
                        )}
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-black/50 text-white hover:text-cyan-400">
                            <a href={media.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            onClick={() => handleDeleteDeliverable(media.id)}
                            disabled={isPending}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full bg-black/50 text-white hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 text-[10px] text-neutral-500 flex justify-between items-center bg-white/[0.01]">
                        <span>Uploaded by {media.profiles?.full_name}</span>
                        <span className="capitalize">{media.media_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Check-in Logs */}
        <TabsContent value="attendance" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-cyan-400" />
                Crew Logged Hours & Check-ins
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400">
                Tracked timings and session hours for coverage assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {/* Gather assignments check-in info */}
              {!request.assignments || request.assignments.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500">
                  No assignments checked in yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-white/5 rounded-2xl overflow-hidden">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6">Crew Member</th>
                        <th className="py-4 px-6">Check-In</th>
                        <th className="py-4 px-6">Check-Out</th>
                        <th className="py-4 px-6 text-center">Hours Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {request.assignments.map((assignment: any) => {
                        const attendance = assignment.apex_attendance?.[0]
                        return (
                          <tr key={assignment.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
                                  {assignment.profiles?.avatar_url ? (
                                    <img src={assignment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-neutral-500 uppercase">
                                      {(assignment.profiles?.full_name || 'U').slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-white">{assignment.profiles?.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-neutral-300 text-xs">
                              {attendance?.checked_in_at 
                                ? new Date(attendance.checked_in_at).toLocaleString() 
                                : <span className="italic text-neutral-600">Not checked in</span>}
                            </td>
                            <td className="py-4 px-6 text-neutral-300 text-xs">
                              {attendance?.checked_out_at 
                                ? new Date(attendance.checked_out_at).toLocaleString() 
                                : <span className="italic text-neutral-600">Not checked out</span>}
                            </td>
                            <td className="py-4 px-6 text-center text-cyan-400 font-extrabold">
                              {attendance?.hours_logged !== null && attendance?.hours_logged !== undefined
                                ? `${attendance.hours_logged} hrs` 
                                : <span className="text-neutral-600 font-normal italic">-</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
