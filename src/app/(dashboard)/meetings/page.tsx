'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMeetings,
  getMeetingDetails,
  createMeeting,
  updateMeeting,
  updateMeetingMoM,
  saveMeetingAttendance,
  deleteMeeting,
} from '@/actions/meetings'
import { getMembers } from '@/actions/members'
import { isClubCoreMember, isAdminOrBoard, ROLE_LABELS } from '@/lib/constants/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarDays,
  Clock,
  MapPin,
  Lock,
  Plus,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Check,
  ShieldAlert,
  Trash2,
  Save,
  Pencil,
  Eye,
  Info,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function MeetingsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [filterTab, setFilterTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming')
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [viewMoreMeeting, setViewMoreMeeting] = useState<any | null>(null)
  const [detailsTab, setDetailsTab] = useState<'mom' | 'attendance'>('mom')

  // Create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [venue, setVenue] = useState('')
  const [isInviteOnly, setIsInviteOnly] = useState(false)
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Edit form state
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editIsInviteOnly, setEditIsInviteOnly] = useState(false)
  const [editInvitedUserIds, setEditInvitedUserIds] = useState<string[]>([])
  const [editMemberSearchQuery, setEditMemberSearchQuery] = useState('')

  // MoM edit state
  const [momText, setMomText] = useState('')
  const [summaryText, setSummaryText] = useState('')
  const [meetingStatus, setMeetingStatus] = useState<'scheduled' | 'ongoing' | 'completed' | 'cancelled'>('scheduled')

  // Attendance state: map user_id -> { attended: boolean, notes: string }
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { attended: boolean; notes: string }>>({})

  const isCore = profile ? isClubCoreMember(profile.role) : false
  const isLeader = profile ? isAdminOrBoard(profile.role) : false

  // Fetch all visible meetings
  const { data: meetingsData, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const res = await getMeetings()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile && isCore,
  })

  // Fetch all members for invite picker and attendance
  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      const res = await getMembers()
      return res.data || []
    },
    enabled: !!profile && isCore,
  })

  // Fetch selected meeting details
  const { data: activeMeeting, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['meeting-details', selectedMeetingId],
    queryFn: async () => {
      if (!selectedMeetingId) return null
      const res = await getMeetingDetails(selectedMeetingId)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    enabled: !!selectedMeetingId,
  })

  // Sync active meeting data to edit state
  const handleOpenDetails = (meeting: any) => {
    setSelectedMeetingId(meeting.id)
    setMomText(meeting.minutes_of_meeting || '')
    setSummaryText(meeting.summary || '')
    setMeetingStatus(meeting.status || 'scheduled')

    // Initialize attendance map
    const initialAtt: Record<string, { attended: boolean; notes: string }> = {}
    const attList = meeting.meeting_attendance || meeting.attendance || []
    if (attList.length > 0) {
      attList.forEach((att: any) => {
        initialAtt[att.user_id] = {
          attended: att.attended,
          notes: att.notes || '',
        }
      })
    }
    setAttendanceMap(initialAtt)
  }

  // Open edit dialog
  const handleOpenEdit = (m: any) => {
    setEditMeetingId(m.id)
    setEditTitle(m.title || '')
    setEditDescription(m.description || '')
    if (m.scheduled_at) {
      const d = new Date(m.scheduled_at)
      const pad = (n: number) => n.toString().padStart(2, '0')
      const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setEditScheduledAt(localIso)
    } else {
      setEditScheduledAt('')
    }
    setEditVenue(m.venue || '')
    setEditIsInviteOnly(!!m.is_invite_only)
    const invIds = (m.meeting_invites || m.invites || []).map((inv: any) => inv.user_id).filter(Boolean)
    setEditInvitedUserIds(invIds)
    setEditMemberSearchQuery('')
    setIsEditOpen(true)
  }

  // Also sync when activeMeeting query completes
  useEffect(() => {
    if (activeMeeting) {
      setMomText(activeMeeting.minutes_of_meeting || '')
      setSummaryText(activeMeeting.summary || '')
      setMeetingStatus(activeMeeting.status || 'scheduled')

      const initialAtt: Record<string, { attended: boolean; notes: string }> = {}
      const attList = activeMeeting.meeting_attendance || activeMeeting.attendance || []
      if (attList.length > 0) {
        attList.forEach((att: any) => {
          initialAtt[att.user_id] = {
            attended: att.attended,
            notes: att.notes || '',
          }
        })
      }
      setAttendanceMap(initialAtt)
    }
  }, [activeMeeting])

  // Filter meetings
  const meetings = meetingsData || []
  const now = new Date()

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m: any) => {
      const isPast = new Date(m.scheduled_at) < now || m.status === 'completed'
      if (filterTab === 'upcoming') return !isPast
      if (filterTab === 'completed') return isPast
      return true
    })
  }, [meetings, filterTab, now])

  // Filter members in invite picker (Create)
  const filteredInviteMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return allMembers
    const q = memberSearchQuery.toLowerCase()
    return allMembers.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.roll_number?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    )
  }, [allMembers, memberSearchQuery])

  // Filter members in invite picker (Edit)
  const filteredEditInviteMembers = useMemo(() => {
    if (!editMemberSearchQuery.trim()) return allMembers
    const q = editMemberSearchQuery.toLowerCase()
    return allMembers.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.roll_number?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    )
  }, [allMembers, editMemberSearchQuery])

  // Create Meeting Mutation
  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await createMeeting({
        title,
        description,
        scheduled_at: scheduledAt,
        venue,
        is_invite_only: isInviteOnly,
        invited_user_ids: isInviteOnly ? invitedUserIds : undefined,
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success('Meeting scheduled successfully! Invitations dispatched.')
      setIsScheduleOpen(false)
      setTitle('')
      setDescription('')
      setScheduledAt('')
      setVenue('')
      setIsInviteOnly(false)
      setInvitedUserIds([])
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to schedule meeting')
    },
  })

  // Update Meeting Mutation
  const updateMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!editMeetingId) return
      const res = await updateMeeting(editMeetingId, {
        title: editTitle,
        description: editDescription,
        scheduled_at: editScheduledAt,
        venue: editVenue,
        is_invite_only: editIsInviteOnly,
        invited_user_ids: editIsInviteOnly ? editInvitedUserIds : [],
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: (updated) => {
      toast.success('Meeting updated successfully!')
      setIsEditOpen(false)
      setEditMeetingId(null)
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      if (selectedMeetingId) {
        queryClient.invalidateQueries({ queryKey: ['meeting-details', selectedMeetingId] })
      }
      if (viewMoreMeeting && viewMoreMeeting.id === editMeetingId) {
        setViewMoreMeeting({ ...viewMoreMeeting, ...updated })
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update meeting')
    },
  })

  // Update MoM Mutation
  const updateMoMMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeetingId) return
      const res = await updateMeetingMoM(selectedMeetingId, {
        minutes_of_meeting: momText,
        summary: summaryText,
        status: meetingStatus,
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success('Minutes of Meeting and Summary saved!')
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting-details', selectedMeetingId] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save MoM')
    },
  })

  // Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeetingId) return
      const records = Object.entries(attendanceMap).map(([userId, data]) => ({
        user_id: userId,
        attended: data.attended,
        notes: data.notes,
      }))
      const res = await saveMeetingAttendance(selectedMeetingId, records)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Attendance updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting-details', selectedMeetingId] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save attendance')
    },
  })

  // Delete Meeting Mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteMeeting(id)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Meeting deleted')
      setSelectedMeetingId(null)
      setViewMoreMeeting(null)
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete meeting')
    },
  })

  // Non-core member access guard
  if (!isCore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Meetings Access Restricted</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mt-2">
          The meetings workspace is exclusive to PhotoHub Board Members, Committee Members, and Admins.
        </p>
      </div>
    )
  }

  // Attendance targets: if invite only, list only invited members; otherwise list all core members
  const attendanceTargetMembers = useMemo(() => {
    if (!activeMeeting) return []
    if (activeMeeting.is_invite_only) {
      const invites = activeMeeting.meeting_invites || activeMeeting.invites || []
      const invitedUserIds = new Set(invites.map((inv: any) => inv.user_id || inv.profiles?.id).filter(Boolean))
      return allMembers.filter((m: any) => invitedUserIds.has(m.id))
    }
    // All club core members for non-invite-only sessions
    return allMembers.filter((m: any) => isClubCoreMember(m.role))
  }, [activeMeeting, allMembers])

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Team Meetings
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Schedule sessions, manage invites, record MoM, and track attendance.
              </p>
            </div>
          </div>
        </div>

        {isLeader && (
          <Button
            onClick={() => setIsScheduleOpen(true)}
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold gap-2 shadow-lg shadow-cyan-500/20 rounded-xl h-10 px-4 text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-3 overflow-x-auto scrollbar-none">
        <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="w-full">
          <TabsList className="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="font-semibold text-xs sm:text-sm flex-1 sm:flex-initial">
              Upcoming ({meetings.filter((m: any) => new Date(m.scheduled_at) >= now && m.status !== 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-semibold text-xs sm:text-sm flex-1 sm:flex-initial">
              Completed ({meetings.filter((m: any) => new Date(m.scheduled_at) < now || m.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="all" className="font-semibold text-xs sm:text-sm flex-1 sm:flex-initial">
              All ({meetings.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Meeting Cards Grid */}
      {isLoadingMeetings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-neutral-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-neutral-200 dark:border-white/10 rounded-3xl">
          <CalendarDays className="h-12 w-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No meetings found</h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            {filterTab === 'upcoming'
              ? 'No upcoming meetings scheduled right now.'
              : 'No past meetings recorded.'}
          </p>
          {isLeader && filterTab === 'upcoming' && (
            <Button
              onClick={() => setIsScheduleOpen(true)}
              variant="outline"
              className="mt-4 rounded-xl border-neutral-200 dark:border-white/10 text-xs"
            >
              <Plus className="h-4 w-4 mr-2" /> Schedule First Meeting
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMeetings.map((m: any) => {
            const dateObj = new Date(m.scheduled_at)
            const isCompleted = m.status === 'completed'
            const isCancelled = m.status === 'cancelled'
            const attendeesCount = m.meeting_attendance?.filter((a: any) => a.attended)?.length || 0

            return (
              <Card
                key={m.id}
                className="bg-card/40 backdrop-blur-md border-neutral-200 dark:border-white/10 hover:border-cyan-500/30 transition-all rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-cyan-500/5 group"
              >
                <CardHeader className="pb-3 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]'
                            : isCancelled
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px]'
                        }
                      >
                        {m.status ? m.status.toUpperCase() : 'SCHEDULED'}
                      </Badge>
                      {m.is_invite_only && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 text-[10px]"
                        >
                          <Lock className="h-3 w-3" /> Invite Only
                        </Badge>
                      )}
                    </div>

                    {isLeader && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(m)}
                        className="h-7 w-7 text-neutral-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
                        title="Edit Meeting"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <CardTitle className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {m.title}
                  </CardTitle>

                  {m.description && (
                    <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                      {m.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0 p-4 sm:p-5">
                  <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{format(dateObj, 'EEE, MMM d, yyyy • h:mm a')}</span>
                    </div>
                    {m.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{m.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                      <span>{attendeesCount} Present</span>
                    </div>
                  </div>

                  {/* MoM Preview snippet if present */}
                  {m.summary && (
                    <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-xs text-neutral-500 line-clamp-2">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">Summary: </span>
                      {m.summary}
                    </div>
                  )}

                  <div className="pt-3 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between gap-2">
                    <Button
                      onClick={() => setViewMoreMeeting(m)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-semibold gap-1.5 h-8 border-neutral-200 dark:border-white/10 hover:bg-white/5 flex-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-cyan-400" />
                      View More
                    </Button>

                    <Button
                      onClick={() => handleOpenDetails(m)}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-semibold hover:bg-cyan-500 hover:text-neutral-950 transition-colors h-8 flex-1"
                    >
                      Workspace & MoM
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* View More Meeting Modal */}
      <Dialog open={!!viewMoreMeeting} onOpenChange={(open) => !open && setViewMoreMeeting(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10 p-5 sm:p-7">
          {viewMoreMeeting && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={
                      viewMoreMeeting.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold'
                        : viewMoreMeeting.status === 'cancelled'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold'
                    }
                  >
                    {viewMoreMeeting.status ? viewMoreMeeting.status.toUpperCase() : 'SCHEDULED'}
                  </Badge>
                  {viewMoreMeeting.is_invite_only && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs gap-1 font-semibold">
                      <Lock className="h-3 w-3" /> Private / Invite Only
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white leading-snug">
                  {viewMoreMeeting.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 flex items-center gap-2 pt-1">
                  <span>Organized by</span>
                  <span className="font-semibold text-neutral-200">{viewMoreMeeting.profiles?.full_name || 'Core Board'}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Quick Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-xs text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Date & Time</span>
                    <span className="font-medium text-neutral-100">
                      {format(new Date(viewMoreMeeting.scheduled_at), 'PPPP • p')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Location / Venue</span>
                    <span className="font-medium text-neutral-100">{viewMoreMeeting.venue || 'To Be Announced'}</span>
                  </div>
                </div>
              </div>

              {/* Full Description / Agenda */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Meeting Agenda & Description</h4>
                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-200 dark:border-white/10 text-xs sm:text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {viewMoreMeeting.description || 'No detailed agenda provided for this meeting.'}
                </div>
              </div>

              {/* Invited Members (if invite only) */}
              {viewMoreMeeting.is_invite_only && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    Invited Members ({viewMoreMeeting.meeting_invites?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {(!viewMoreMeeting.meeting_invites || viewMoreMeeting.meeting_invites.length === 0) ? (
                      <p className="text-xs text-neutral-500 italic">No specific members invited yet.</p>
                    ) : (
                      viewMoreMeeting.meeting_invites.map((inv: any) => (
                        <div
                          key={inv.user_id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-300"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={inv.profiles?.avatar_url || ''} />
                            <AvatarFallback className="text-[9px]">
                              {inv.profiles?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{inv.profiles?.full_name || 'Member'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Executive Summary if recorded */}
              {viewMoreMeeting.summary && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    Summary & Key Takeaways
                  </h4>
                  <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-neutral-300 leading-relaxed">
                    {viewMoreMeeting.summary}
                  </div>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                {isLeader && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const m = viewMoreMeeting
                      setViewMoreMeeting(null)
                      handleOpenEdit(m)
                    }}
                    className="rounded-xl text-xs font-bold border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Meeting
                  </Button>
                )}
                <Button
                  onClick={() => {
                    const m = viewMoreMeeting
                    setViewMoreMeeting(null)
                    handleOpenDetails(m)
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open MoM & Attendance Workspace
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10 p-5 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
              Schedule New Meeting
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Set up a session for board discussions, production briefings, or committee reviews.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-title" className="text-xs font-semibold">
                Meeting Title *
              </Label>
              <Input
                id="m-title"
                placeholder="e.g. Weekly Production Review & Gear Allocation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl text-xs sm:text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-desc" className="text-xs font-semibold">
                Agenda / Description
              </Label>
              <Textarea
                id="m-desc"
                placeholder="Key agenda points to discuss..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-time" className="text-xs font-semibold">
                  Date & Time *
                </Label>
                <Input
                  id="m-time"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-venue" className="text-xs font-semibold">
                  Venue / Location
                </Label>
                <Input
                  id="m-venue"
                  placeholder="e.g. Media Lab 102 or Google Meet"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm h-10"
                />
              </div>
            </div>

            {/* Invite Only Toggle */}
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-amber-500 shrink-0" /> Invite Only Meeting
                  </div>
                  <p className="text-xs text-neutral-500">
                    When enabled, automated invitation emails will be sent from <strong>photohub@bitsathy.ac.in</strong> to invited members.
                  </p>
                </div>
                <Switch checked={isInviteOnly} onCheckedChange={setIsInviteOnly} />
              </div>

              {/* Member Picker */}
              {isInviteOnly && (
                <div className="pt-3 border-t border-neutral-200 dark:border-white/5 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search members by name, roll no..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredInviteMembers.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-4">No matching members found</p>
                    ) : (
                      filteredInviteMembers.map((member: any) => {
                        const isSelected = invitedUserIds.includes(member.id)
                        return (
                          <div
                            key={member.id}
                            onClick={() => {
                              if (isSelected) {
                                setInvitedUserIds(invitedUserIds.filter((id) => id !== member.id))
                              } else {
                                setInvitedUserIds([...invitedUserIds, member.id])
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                : 'bg-neutral-50 dark:bg-white/[0.02] border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.avatar_url || ''} />
                                <AvatarFallback className="text-[10px]">
                                  {member.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                  {member.full_name || 'Unnamed Member'}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  {member.roll_number ? `${member.roll_number} • ` : ''}
                                  {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                                </p>
                              </div>
                            </div>
                            <Checkbox checked={isSelected} className="rounded-md" />
                          </div>
                        )
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {invitedUserIds.length} member{invitedUserIds.length === 1 ? '' : 's'} selected to receive automated email invites
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setIsScheduleOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMeetingMutation.mutate()}
              disabled={createMeetingMutation.isPending || !title || !scheduledAt}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {createMeetingMutation.isPending ? 'Scheduling & Dispatching...' : 'Confirm Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10 p-5 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-cyan-400" />
              Edit Meeting Details
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Update the schedule, venue, agenda, or invite list for this meeting session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-semibold">
                Meeting Title *
              </Label>
              <Input
                id="edit-title"
                placeholder="Meeting Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl text-xs sm:text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs font-semibold">
                Agenda / Description
              </Label>
              <Textarea
                id="edit-desc"
                placeholder="Key agenda points to discuss..."
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-xl resize-none text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-time" className="text-xs font-semibold">
                  Date & Time *
                </Label>
                <Input
                  id="edit-time"
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-venue" className="text-xs font-semibold">
                  Venue / Location
                </Label>
                <Input
                  id="edit-venue"
                  placeholder="e.g. Media Lab 102 or Google Meet"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm h-10"
                />
              </div>
            </div>

            {/* Invite Only Toggle */}
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-amber-500 shrink-0" /> Invite Only Meeting
                  </div>
                  <p className="text-xs text-neutral-500">
                    Automated invitation emails are sent to newly invited members from <strong>photohub@bitsathy.ac.in</strong>.
                  </p>
                </div>
                <Switch checked={editIsInviteOnly} onCheckedChange={setEditIsInviteOnly} />
              </div>

              {/* Member Picker */}
              {editIsInviteOnly && (
                <div className="pt-3 border-t border-neutral-200 dark:border-white/5 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search members by name, roll no..."
                      value={editMemberSearchQuery}
                      onChange={(e) => setEditMemberSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredEditInviteMembers.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-4">No matching members found</p>
                    ) : (
                      filteredEditInviteMembers.map((member: any) => {
                        const isSelected = editInvitedUserIds.includes(member.id)
                        return (
                          <div
                            key={member.id}
                            onClick={() => {
                              if (isSelected) {
                                setEditInvitedUserIds(editInvitedUserIds.filter((id) => id !== member.id))
                              } else {
                                setEditInvitedUserIds([...editInvitedUserIds, member.id])
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                : 'bg-neutral-50 dark:bg-white/[0.02] border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.avatar_url || ''} />
                                <AvatarFallback className="text-[10px]">
                                  {member.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                  {member.full_name || 'Unnamed Member'}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  {member.roll_number ? `${member.roll_number} • ` : ''}
                                  {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                                </p>
                              </div>
                            </div>
                            <Checkbox checked={isSelected} className="rounded-md" />
                          </div>
                        )
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {editInvitedUserIds.length} member{editInvitedUserIds.length === 1 ? '' : 's'} invited
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMeetingMutation.mutate()}
              disabled={updateMeetingMutation.isPending || !editTitle || !editScheduledAt}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {updateMeetingMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Details & MoM Workspace Dialog */}
      <Dialog open={!!selectedMeetingId} onOpenChange={(open) => !open && setSelectedMeetingId(null)}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl h-[92vh] max-h-[860px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl bg-card border border-neutral-200 dark:border-white/10 shadow-2xl">
          {isLoadingDetails ? (
            <div className="py-24 text-center">
              <div className="animate-spin h-10 w-10 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm font-semibold text-neutral-300">Loading meeting workspace...</p>
            </div>
          ) : detailsError || !activeMeeting ? (
            <div className="py-24 text-center space-y-4 px-6">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
              <p className="text-base font-bold text-red-400">Unable to load meeting workspace</p>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">{detailsError ? (detailsError as any).message : 'Meeting details not available'}</p>
              <Button variant="outline" size="sm" onClick={() => setSelectedMeetingId(null)} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Header (Fixed Top) */}
              <div className="p-4 sm:p-6 md:p-7 pb-4 sm:pb-5 border-b border-neutral-200 dark:border-white/10 shrink-0 bg-neutral-900/40">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 pr-6">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={
                          activeMeeting.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[11px] font-bold'
                            : activeMeeting.status === 'cancelled'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 uppercase text-[11px] font-bold'
                            : activeMeeting.status === 'ongoing'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase text-[11px] font-bold'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase text-[11px] font-bold'
                        }
                      >
                        {activeMeeting.status || 'SCHEDULED'}
                      </Badge>
                      {activeMeeting.is_invite_only && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs gap-1">
                          <Lock className="h-3 w-3" /> Invite Only
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight truncate">
                      {activeMeeting.title}
                    </h2>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-neutral-400 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        {format(new Date(activeMeeting.scheduled_at), 'PPP • p')}
                      </span>
                      {activeMeeting.venue && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {activeMeeting.venue}
                        </span>
                      )}
                    </div>
                  </div>

                  {isLeader && (
                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(activeMeeting)}
                        className="rounded-xl text-xs gap-1 border-white/10 hover:bg-white/5"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this meeting?')) {
                            deleteMeetingMutation.mutate(activeMeeting.id)
                          }
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
                <Tabs value={detailsTab} onValueChange={(v: any) => setDetailsTab(v)} className="space-y-6">
                  <TabsList className="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 p-1 rounded-2xl w-full sm:w-auto h-11">
                    <TabsTrigger value="mom" className="gap-2 font-bold text-xs sm:text-sm px-4 sm:px-5 rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-neutral-950 flex-1 sm:flex-initial">
                      <FileText className="h-4 w-4" /> Minutes of Meeting (MoM)
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="gap-2 font-bold text-xs sm:text-sm px-4 sm:px-5 rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-neutral-950 flex-1 sm:flex-initial">
                      <Users className="h-4 w-4" /> Attendance Tracker
                    </TabsTrigger>
                  </TabsList>

                  {/* MoM Tab */}
                  <TabsContent value="mom" className="space-y-6 mt-0">
                    {/* Status selector */}
                    {isLeader && (
                      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Meeting Status</Label>
                          <p className="text-xs text-neutral-500">Update current state of this session</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(['scheduled', 'ongoing', 'completed', 'cancelled'] as const).map((st) => (
                            <Button
                              key={st}
                              type="button"
                              size="sm"
                              variant={meetingStatus === st ? 'default' : 'outline'}
                              onClick={() => setMeetingStatus(st)}
                              className={`rounded-xl text-xs font-bold capitalize transition-all ${
                                meetingStatus === st
                                  ? st === 'completed'
                                    ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                                    : st === 'cancelled'
                                    ? 'bg-red-500 text-white hover:bg-red-400'
                                    : 'bg-cyan-500 text-neutral-950 hover:bg-cyan-400'
                                  : 'border-neutral-200 dark:border-white/10 hover:bg-white/5'
                              }`}
                            >
                              {st}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="m-summary" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Executive Summary & Key Takeaways</span>
                        <span className="text-xs text-neutral-500 font-normal">High-level conclusions</span>
                      </Label>
                      <Textarea
                        id="m-summary"
                        placeholder="Write a concise overview of the core decisions made, strategic milestones, and immediate deliverables..."
                        rows={3}
                        disabled={!isLeader}
                        value={summaryText}
                        onChange={(e) => setSummaryText(e.target.value)}
                        className="rounded-2xl text-xs sm:text-sm bg-neutral-900/50 border-neutral-200 dark:border-white/10 focus-visible:ring-cyan-500/50 resize-none p-4 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="m-mom" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Minutes of the Meeting (MoM)</span>
                        <span className="text-xs text-neutral-500 font-normal font-mono">Detailed Minutes & Discussion</span>
                      </Label>
                      <Textarea
                        id="m-mom"
                        placeholder="1. Agenda Items Discussed:&#10;   - Production schedule for upcoming short film&#10;   - Gear maintenance & battery inventory checklist&#10;&#10;2. Discussion Points & Member Inputs:&#10;   - ...&#10;&#10;3. Action Items & Deadlines:&#10;   - [Member Name]: [Task assigned] by [Date]"
                        rows={12}
                        disabled={!isLeader}
                        value={momText}
                        onChange={(e) => setMomText(e.target.value)}
                        className="rounded-2xl text-xs sm:text-sm font-mono bg-neutral-900/50 border-neutral-200 dark:border-white/10 focus-visible:ring-cyan-500/50 resize-none p-4 leading-relaxed"
                      />
                    </div>
                  </TabsContent>

                  {/* Attendance Tab */}
                  <TabsContent value="attendance" className="space-y-4 mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-200 dark:border-white/10">
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <Users className="h-4 w-4 text-cyan-400" />
                          Attendance Roster ({attendanceTargetMembers.length} Members)
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                          <span className="text-emerald-400 font-semibold">
                            {Object.values(attendanceMap).filter((a) => a.attended).length} Present
                          </span>
                          <span>•</span>
                          <span className="text-neutral-400">
                            {attendanceTargetMembers.length - Object.values(attendanceMap).filter((a) => a.attended).length} Absent
                          </span>
                        </div>
                      </div>

                      {isLeader && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated: Record<string, { attended: boolean; notes: string }> = {}
                              attendanceTargetMembers.forEach((m: any) => {
                                updated[m.id] = { attended: true, notes: attendanceMap[m.id]?.notes || '' }
                              })
                              setAttendanceMap(updated)
                            }}
                            className="rounded-xl text-xs font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8"
                          >
                            Mark All Present
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated: Record<string, { attended: boolean; notes: string }> = {}
                              attendanceTargetMembers.forEach((m: any) => {
                                updated[m.id] = { attended: false, notes: attendanceMap[m.id]?.notes || '' }
                              })
                              setAttendanceMap(updated)
                            }}
                            className="rounded-xl text-xs font-semibold border-white/10 hover:bg-white/5 h-8"
                          >
                            Reset
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-neutral-200 dark:border-white/5 bg-neutral-900/30">
                      {attendanceTargetMembers.length === 0 ? (
                        <p className="p-8 text-xs text-center text-neutral-400">No member roster available for this meeting</p>
                      ) : (
                        attendanceTargetMembers.map((member: any) => {
                          const cur = attendanceMap[member.id] || { attended: false, notes: '' }
                          return (
                            <div
                              key={member.id}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  disabled={!isLeader}
                                  checked={cur.attended}
                                  onCheckedChange={(chk) => {
                                    setAttendanceMap({
                                      ...attendanceMap,
                                      [member.id]: {
                                        attended: !!chk,
                                        notes: cur.notes,
                                      },
                                    })
                                  }}
                                  className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-black shrink-0"
                                />

                                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-white/10 shrink-0">
                                  <AvatarImage src={member.avatar_url || ''} />
                                  <AvatarFallback className="text-xs font-bold">
                                    {member.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                                    {member.full_name || 'Member'}
                                  </p>
                                  <p className="text-[11px] text-neutral-400 truncate">
                                    {member.roll_number ? `${member.roll_number} • ` : ''}
                                    {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:max-w-sm w-full pl-8 sm:pl-0">
                                <Input
                                  placeholder="Attendance remarks / notes..."
                                  disabled={!isLeader}
                                  value={cur.notes}
                                  onChange={(e) => {
                                    setAttendanceMap({
                                      ...attendanceMap,
                                      [member.id]: {
                                        attended: cur.attended,
                                        notes: e.target.value,
                                      },
                                    })
                                  }}
                                  className="h-8 text-xs rounded-xl bg-neutral-900/40 border-neutral-200 dark:border-white/10 flex-1"
                                />
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] px-2.5 py-1 shrink-0 font-bold ${
                                    cur.attended
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                                  }`}
                                >
                                  {cur.attended ? 'Present' : 'Absent'}
                                </Badge>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky Footer Action Bar */}
              {isLeader && (
                <div className="p-3 sm:p-4 px-4 sm:px-6 md:px-8 border-t border-neutral-200 dark:border-white/10 bg-neutral-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
                  <div className="text-xs text-neutral-400 hidden sm:block">
                    {detailsTab === 'mom' ? 'Press Save to store Minutes of Meeting and Summary' : 'Press Save to commit attendance checklist'}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-auto w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedMeetingId(null)}
                      className="rounded-xl text-xs font-semibold h-9"
                    >
                      Close
                    </Button>
                    {detailsTab === 'mom' ? (
                      <Button
                        onClick={() => updateMoMMutation.mutate()}
                        disabled={updateMoMMutation.isPending}
                        className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm px-4 sm:px-5 gap-2 shadow-lg shadow-cyan-500/20 h-9"
                      >
                        <Save className="h-4 w-4" />
                        {updateMoMMutation.isPending ? 'Saving...' : 'Save MoM'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => saveAttendanceMutation.mutate()}
                        disabled={saveAttendanceMutation.isPending}
                        className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm px-4 sm:px-5 gap-2 shadow-lg shadow-cyan-500/20 h-9"
                      >
                        <Save className="h-4 w-4" />
                        {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
