'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  markAttendance, 
  bulkMarkAttendance, 
  selectWinners 
} from '@/actions/events'
import { 
  scoreSubmission, 
  updateSubmissionStatus 
} from '@/actions/submissions'
import { 
  Calendar, 
  Users, 
  Image as ImageIcon, 
  Award, 
  TrendingUp, 
  Edit, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  ExternalLink,
  ChevronLeft,
  CheckSquare,
  Square,
  Trophy,
  Loader2,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

interface AdminEventDashboardProps {
  event: any
  registrations: any[]
  submissions: any[]
  analytics: any
}

export default function AdminEventDashboard({
  event,
  registrations: initialRegistrations,
  submissions: initialSubmissions,
  analytics: initialAnalytics
}: AdminEventDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  
  // Scoring state
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null)
  const [scoreVal, setScoreVal] = useState<number>(0)
  const [feedbackVal, setFeedbackVal] = useState<string>('')

  // Winners selection state
  const [selectedWinnerSubmissionIds, setSelectedWinnerSubmissionIds] = useState<string[]>(
    initialSubmissions.filter(s => s.status === 'winner').map(s => s.id)
  )

  const [isPending, startTransition] = useTransition()

  // Attendance Handlers
  const handleToggleAttendance = async (userId: string, currentAttended: boolean) => {
    startTransition(async () => {
      const newAttended = !currentAttended
      const res = await markAttendance(event.id, userId, newAttended)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Attendance updated successfully`)
        setRegistrations((prev: any[]) =>
          prev.map(r => r.user_id === userId ? { ...r, attended: newAttended } : r)
        )
        // Recalculate local stats
        const totalAttended = registrations.filter(r => r.user_id === userId ? newAttended : r.attended).length
        setAnalytics((prev: any) => ({
          ...prev,
          attended: totalAttended,
          attendance_rate: registrations.length ? Math.round(totalAttended / registrations.length * 100) : 0
        }))
        router.refresh()
      }
    })
  }

  const handleBulkAttendance = async (attended: boolean) => {
    if (selectedUserIds.length === 0) {
      toast.error('No participants selected')
      return
    }

    startTransition(async () => {
      const res = await bulkMarkAttendance(event.id, selectedUserIds, attended)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Attendance marked for ${selectedUserIds.length} users`)
        setRegistrations((prev: any[]) =>
          prev.map(r => selectedUserIds.includes(r.user_id) ? { ...r, attended } : r)
        )
        // Recalculate
        const totalAttended = registrations.filter(r => 
          selectedUserIds.includes(r.user_id) ? attended : r.attended
        ).length
        setAnalytics((prev: any) => ({
          ...prev,
          attended: totalAttended,
          attendance_rate: registrations.length ? Math.round(totalAttended / registrations.length * 100) : 0
        }))
        setSelectedUserIds([])
        router.refresh()
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedUserIds.length === registrations.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(registrations.map(r => r.user_id))
    }
  }

  const handleToggleSelectUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(prev => prev.filter(id => id !== userId))
    } else {
      setSelectedUserIds(prev => [...prev, userId])
    }
  }

  // Submission scoring
  const handleStartScoring = (sub: any) => {
    setEditingSubmissionId(sub.id)
    setScoreVal(sub.score || 0)
    setFeedbackVal(sub.feedback || '')
  }

  const handleSaveScore = async (submissionId: string) => {
    if (scoreVal < 0 || scoreVal > 100) {
      toast.error('Score must be between 0 and 100')
      return
    }

    startTransition(async () => {
      const res = await scoreSubmission(submissionId, scoreVal, feedbackVal)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Submission scored successfully')
        setSubmissions(prev =>
          prev.map(s => s.id === submissionId ? { ...s, score: scoreVal, feedback: feedbackVal, status: s.status === 'pending' ? 'approved' : s.status } : s)
        )
        setEditingSubmissionId(null)
        router.refresh()
      }
    })
  }

  const handleUpdateStatus = async (submissionId: string, newStatus: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await updateSubmissionStatus(submissionId, newStatus)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Submission status set to ${newStatus}`)
        setSubmissions(prev =>
          prev.map(s => s.id === submissionId ? { ...s, status: newStatus } : s)
        )
        router.refresh()
      }
    })
  }

  // Winner selection
  const handleToggleWinnerSubmission = (submissionId: string) => {
    if (selectedWinnerSubmissionIds.includes(submissionId)) {
      setSelectedWinnerSubmissionIds(prev => prev.filter(id => id !== submissionId))
    } else {
      setSelectedWinnerSubmissionIds(prev => [...prev, submissionId])
    }
  }

  const handleSaveWinners = async () => {
    startTransition(async () => {
      const res = await selectWinners(event.id, selectedWinnerSubmissionIds)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Winners declared successfully!')
        setSubmissions(prev =>
          prev.map(s => selectedWinnerSubmissionIds.includes(s.id) 
            ? { ...s, status: 'winner' } 
            : { ...s, status: s.status === 'winner' ? 'approved' : s.status }
          )
        )
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/events"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Events List
        </Link>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mt-2">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-cyan-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-neutral-400 font-medium">
                <span className="capitalize text-cyan-400 font-bold">{event.event_type}</span>
                <span className="h-1 w-1 bg-neutral-600 rounded-full"></span>
                <span className="uppercase">{event.visibility}</span>
                {event.venue && (
                  <>
                    <span className="h-1 w-1 bg-neutral-600 rounded-full"></span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.venue}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-4 flex items-center gap-2 shrink-0">
            <Link href={`/admin/events/${event.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black/40 border border-white/5 rounded-xl p-1 max-w-2xl h-11 text-xs flex overflow-x-auto whitespace-nowrap scrollbar-none w-full">
          <TabsTrigger value="overview" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">Overview</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">Attendance</TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">Submissions</TabsTrigger>
          <TabsTrigger value="winners" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">Winners</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">Analytics</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {event.banner_url && (
            <div className="relative aspect-[21/9] w-full bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
              <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {event.description || <p className="italic text-neutral-500">No description provided for this event.</p>}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Schedule & Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Start Time</span>
                    <span className="text-neutral-200">
                      {new Date(event.start_date).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">End Time</span>
                    <span className="text-neutral-200">
                      {new Date(event.end_date).toLocaleString()}
                    </span>
                  </div>
                </div>

                {event.registration_deadline && (
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-cyan-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Registration Deadline</span>
                      <span className="text-neutral-200">
                        {new Date(event.registration_deadline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Award Points:</span>
                    <span className="text-cyan-400 font-extrabold">{event.points} points</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Registration Cap:</span>
                    <span className="text-neutral-200 font-bold">
                      {event.max_participants || 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Submission Required:</span>
                    <span className={cn("font-bold capitalize", event.submission_required ? "text-cyan-400" : "text-neutral-500")}>
                      {event.submission_required ? `Yes (${event.submission_mode})` : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Attendance */}
        <TabsContent value="attendance" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Mark Attendance ({registrations.filter(r => r.attended).length} / {registrations.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Manage check-in lists. Award club points automatically to attendees on save.
                </CardDescription>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAttendance(true)}
                  disabled={selectedUserIds.length === 0 || isPending}
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold rounded-lg px-3 py-1.5 h-8 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Mark Attended
                </Button>
                <Button
                  onClick={() => handleBulkAttendance(false)}
                  disabled={selectedUserIds.length === 0 || isPending}
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-lg px-3 py-1.5 h-8 flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Mark Absent
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {registrations.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500">
                  No participants registered for this event yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6 w-12 text-center">
                          <button
                            onClick={handleSelectAll}
                            className="text-neutral-500 hover:text-white"
                          >
                            {selectedUserIds.length === registrations.length ? (
                              <CheckSquare className="h-4 w-4 text-cyan-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-4 px-6">Member</th>
                        <th className="py-4 px-6">Registered Date</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Attendance Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {registrations.map((reg) => (
                        <tr key={reg.user_id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleToggleSelectUser(reg.user_id)}
                              className="text-neutral-500 hover:text-white"
                            >
                              {selectedUserIds.includes(reg.user_id) ? (
                                <CheckSquare className="h-4 w-4 text-cyan-400" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                                {reg.profiles?.avatar_url ? (
                                  <img src={reg.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase">
                                    {(reg.profiles?.full_name || 'U').slice(0, 2)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-white block leading-none mb-1">
                                  {reg.profiles?.full_name || 'Unknown Member'}
                                </span>
                                <span className="text-[10px] text-neutral-500 block leading-none">
                                  {reg.profiles?.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-neutral-400">
                            {new Date(reg.registered_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                              reg.attended 
                                ? "border-green-500/20 bg-green-500/5 text-green-500" 
                                : "border-red-500/20 bg-red-500/5 text-red-500"
                            )}>
                              {reg.attended ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              onClick={() => handleToggleAttendance(reg.user_id, reg.attended)}
                              disabled={isPending}
                              variant="outline"
                              size="sm"
                              className={cn(
                                "border-white/10 rounded-lg text-xs h-8",
                                reg.attended 
                                  ? "hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" 
                                  : "hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20"
                              )}
                            >
                              {reg.attended ? 'Mark Absent' : 'Mark Attended'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Submissions */}
        <TabsContent value="submissions" className="mt-6 space-y-6">
          {!event.submission_required ? (
            <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center">
              <ImageIcon className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Submissions Disabled</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                This event has submission requirements disabled. Enable it in settings to accept submissions.
              </p>
            </Card>
          ) : submissions.length === 0 ? (
            <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center">
              <ImageIcon className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Submissions Yet</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                Participants registered have not uploaded any entries yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left List */}
              <div className="xl:col-span-2 space-y-4">
                <h3 className="text-md font-bold text-white px-1">Participant Entries ({submissions.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {submissions.map((sub) => (
                    <Card 
                      key={sub.id} 
                      className={cn(
                        "border-white/5 bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col justify-between group relative transition-all duration-300 hover:border-cyan-500/20 hover:bg-black/50",
                        editingSubmissionId === sub.id && "border-cyan-500/30 ring-1 ring-cyan-500/20"
                      )}
                    >
                      {/* Media Body */}
                      <div className="p-4 space-y-4">
                        {/* Member Header */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                              {sub.profiles?.avatar_url ? (
                                <img src={sub.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-neutral-500 uppercase">
                                  {(sub.profiles?.full_name || 'U').slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-white text-xs block truncate max-w-[120px] leading-tight">
                                {sub.profiles?.full_name || 'Member'}
                              </span>
                              <span className="text-[9px] text-neutral-500 block leading-tight">
                                {new Date(sub.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={cn(
                              "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider",
                              sub.status === 'winner' && "bg-cyan-500/10 text-cyan-400",
                              sub.status === 'approved' && "bg-green-500/10 text-green-500",
                              sub.status === 'rejected' && "bg-red-500/10 text-red-500",
                              sub.status === 'pending' && "bg-yellow-500/10 text-yellow-500"
                            )}>
                              {sub.status}
                            </span>
                            {sub.score !== null && (
                              <span className="text-[10px] text-cyan-400 font-extrabold">{sub.score} / 100</span>
                            )}
                          </div>
                        </div>

                        {/* Submission Content */}
                        {sub.content_type === 'image' && sub.content_url && (
                          <div className="relative aspect-video w-full bg-neutral-900 border border-white/5 rounded-xl overflow-hidden">
                            <img src={sub.content_url} alt="Submission" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}

                        {sub.content_type === 'text' && (
                          <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-neutral-300 line-clamp-4 leading-relaxed italic whitespace-pre-wrap">
                            "{sub.caption}"
                          </div>
                        )}

                        {['link', 'drive_link'].includes(sub.content_type) && sub.external_link && (
                          <div className="flex items-center gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-neutral-300">
                            <ExternalLink className="h-4 w-4 text-cyan-400 shrink-0" />
                            <a href={sub.external_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate">
                              {sub.external_link}
                            </a>
                          </div>
                        )}

                        {/* Caption (if not text mode) */}
                        {sub.content_type !== 'text' && sub.caption && (
                          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed italic">
                            "{sub.caption}"
                          </p>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="border-t border-white/5 p-3 bg-white/[0.01] flex justify-between gap-2 mt-auto">
                        <div className="flex gap-1.5">
                          <Button
                            onClick={() => handleUpdateStatus(sub.id, 'approved')}
                            disabled={isPending}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-green-500/10 text-neutral-400 hover:text-green-500 rounded-lg"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                            disabled={isPending}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          onClick={() => handleStartScoring(sub)}
                          variant="ghost"
                          size="sm"
                          className="h-8 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-lg px-2.5"
                        >
                          Grade Entry
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Right Panel: Grading Panel */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-white px-1">Grading & Feedback</h3>
                {editingSubmissionId ? (
                  (() => {
                    const activeSub = submissions.find(s => s.id === editingSubmissionId)
                    return (
                      <Card className="border-cyan-500/20 bg-black/40 backdrop-blur-xl rounded-2xl p-5 space-y-4 sticky top-6">
                        <div>
                          <h4 className="text-sm font-bold text-white">Grading Entry</h4>
                          <p className="text-[11px] text-neutral-500">By {activeSub?.profiles?.full_name}</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="score" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Score (0 - 100)</Label>
                          <Input
                            id="score"
                            type="number"
                            min="0"
                            max="100"
                            value={scoreVal}
                            onChange={(e) => setScoreVal(Number(e.target.value))}
                            className="border-white/5 bg-black/20 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="feedback" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Feedback</Label>
                          <Textarea
                            id="feedback"
                            placeholder="Write constructive comments for the participant..."
                            value={feedbackVal}
                            onChange={(e) => setFeedbackVal(e.target.value)}
                            rows={4}
                            className="border-white/5 bg-black/20 text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-xs"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => setEditingSubmissionId(null)}
                            variant="ghost"
                            size="sm"
                            className="flex-1 border border-white/5 hover:bg-white/5 rounded-xl h-10 text-xs font-semibold text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSaveScore(editingSubmissionId)}
                            disabled={isPending}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-black rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Grade'}
                          </Button>
                        </div>
                      </Card>
                    )
                  })()
                ) : (
                  <Card className="border-white/5 bg-black/20 rounded-2xl p-6 text-center text-xs text-neutral-500 border-dashed">
                    Select a submission and click "Grade Entry" to review, score, and provide comments.
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Winners */}
        <TabsContent value="winners" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-cyan-400" />
                  Select Winners
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Choose winners from approved/graded submissions. Winning awards substantial bonus points (50 pts).
                </CardDescription>
              </div>

              <Button
                onClick={handleSaveWinners}
                disabled={isPending}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-10 px-5 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Save Winners List
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {submissions.filter(s => s.status !== 'rejected').length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 border-t border-white/5">
                  No submissions have been approved/graded yet. Approve entries first.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-t border-white/5">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6 w-16 text-center">Winner?</th>
                        <th className="py-4 px-6">Participant</th>
                        <th className="py-4 px-6">Entry Preview</th>
                        <th className="py-4 px-6">Score</th>
                        <th className="py-4 px-6">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {submissions.filter(s => s.status !== 'rejected').map((sub) => {
                        const isSelected = selectedWinnerSubmissionIds.includes(sub.id)
                        return (
                          <tr key={sub.id} className={cn(
                            "hover:bg-white/[0.01] transition-colors",
                            isSelected && "bg-cyan-500/[0.01]"
                          )}>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleToggleWinnerSubmission(sub.id)}
                                className="text-neutral-500 hover:text-white"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-cyan-400" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                                  {sub.profiles?.avatar_url ? (
                                    <img src={sub.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase">
                                      {(sub.profiles?.full_name || 'U').slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-white block">
                                  {sub.profiles?.full_name || 'Member'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {sub.content_type === 'image' && sub.content_url ? (
                                <div className="h-10 w-16 rounded-lg overflow-hidden border border-white/5 bg-neutral-900">
                                  <img src={sub.content_url} alt="" className="h-full w-full object-cover" />
                                </div>
                              ) : sub.content_type === 'text' ? (
                                <span className="italic text-neutral-400 text-xs line-clamp-1 max-w-[180px]">"{sub.caption}"</span>
                              ) : (
                                <span className="text-xs text-cyan-400 font-medium">Link submission</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={cn(
                                "font-extrabold text-xs",
                                sub.score !== null ? "text-cyan-400" : "text-neutral-500"
                              )}>
                                {sub.score !== null ? `${sub.score}/100` : 'Not graded'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <Badge className={cn(
                                "border-none text-[9px] font-bold py-0.5 rounded-full uppercase tracking-wider",
                                sub.status === 'winner' ? "bg-cyan-500/10 text-cyan-400" : "bg-neutral-500/10 text-neutral-400"
                              )}>
                                {sub.status}
                              </Badge>
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

        {/* Tab 5: Analytics */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Registrations */}
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
                  Registrations
                  <Users className="h-4 w-4 text-cyan-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight">{analytics.registered}</div>
                <p className="text-[10px] text-neutral-500 mt-1">Users registered to participate</p>
              </CardContent>
            </Card>

            {/* Total Attendance */}
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
                  Attended Count
                  <Check className="h-4 w-4 text-green-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight">{analytics.attended}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400 font-bold">{analytics.attendance_rate}% conversion rate</span>
                </div>
              </CardContent>
            </Card>

            {/* Submissions */}
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold tracking-wider text-neutral-400 uppercase flex items-center justify-between">
                  Submissions Uploaded
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-extrabold text-white tracking-tight">{analytics.submitted}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400 font-bold">{analytics.submission_rate}% submission rate</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
