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
  selectWinners,
  setEventAttendanceOtp
} from '@/actions/events'
import {
  addMissedAttendanceRecord,
  deleteMissedAttendanceRecord
} from '@/actions/missed-attendance'
import { exportMissedAttendanceToXlsx } from '@/lib/export-xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  Sparkles,
  KeyRound,
  Tv,
  FileSpreadsheet,
  Star,
  Trash2,
  Plus,
  GraduationCap,
  Copy,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { ExportResultsButton } from '@/components/common/export-results-button'

interface AdminEventDashboardProps {
  event: any
  registrations: any[]
  submissions: any[]
  analytics: any
  initialFeedbacks?: any[]
  initialMissedAttendance?: any[]
  initialOtpConfig?: { active: boolean; otp?: string }
}

export default function AdminEventDashboard({
  event,
  registrations: initialRegistrations,
  submissions: initialSubmissions,
  analytics: initialAnalytics,
  initialFeedbacks,
  initialMissedAttendance,
  initialOtpConfig,
}: AdminEventDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  // Feedback & Missed Attendance State
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks || [])
  const [missedAttendance, setMissedAttendance] = useState(initialMissedAttendance || [])
  const [otpCode, setOtpCode] = useState(initialOtpConfig?.otp || '')
  const [otpActive, setOtpActive] = useState(initialOtpConfig?.active || false)
  const [projectorOpen, setProjectorOpen] = useState(false)
  const [addMissedModalOpen, setAddMissedModalOpen] = useState(false)

  // Manual Missed Attendance Form State
  const [missedName, setMissedName] = useState('')
  const [missedEmail, setMissedEmail] = useState('')
  const [missedRollNumber, setMissedRollNumber] = useState('')
  const [missedSelectedHours, setMissedSelectedHours] = useState<number[]>([1])
  const [missedNotes, setMissedNotes] = useState('')
  
  // Scoring state
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null)
  const [scoreVal, setScoreVal] = useState<number>(0)
  const [feedbackVal, setFeedbackVal] = useState<string>('')

  // Winners selection state
  const [selectedWinnerSubmissionIds, setSelectedWinnerSubmissionIds] = useState<string[]>(
    initialSubmissions.filter(s => s.status === 'winner').map(s => s.id)
  )

  const [isPending, startTransition] = useTransition()

  // OTP Handlers
  const handleSaveOtp = async (codeToSave: string, activeToSave: boolean) => {
    if (!codeToSave.trim()) {
      toast.error('Please enter an OTP code')
      return
    }
    startTransition(async () => {
      const res = await setEventAttendanceOtp(event.id, codeToSave.trim(), activeToSave)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          activeToSave
            ? `OTP check-in is now ACTIVE (${codeToSave.trim().toUpperCase()})`
            : 'OTP check-in is now CLOSED'
        )
        setOtpCode(codeToSave.trim().toUpperCase())
        setOtpActive(activeToSave)
        router.refresh()
      }
    })
  }

  const handleGenerateRandomOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setOtpCode(code)
    handleSaveOtp(code, true)
  }

  const handleToggleOtpActive = () => {
    const code = otpCode.trim() || Math.floor(100000 + Math.random() * 900000).toString()
    if (!otpCode.trim()) setOtpCode(code)
    handleSaveOtp(code, !otpActive)
  }

  const toggleMissedHour = (h: number) => {
    setMissedSelectedHours((prev) =>
      prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h].sort((a, b) => a - b)
    )
  }

  const handleAddMissedAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!missedName.trim() || !missedRollNumber.trim()) {
      toast.error('Please provide student name and roll number')
      return
    }
    if (missedSelectedHours.length === 0) {
      toast.error('Please select at least one hour')
      return
    }

    startTransition(async () => {
      const res = await addMissedAttendanceRecord({
        sourceType: 'event',
        sourceId: event.id,
        name: missedName.trim(),
        email: missedEmail.trim(),
        rollNumber: missedRollNumber.trim(),
        hours: missedSelectedHours,
        notes: missedNotes.trim() || undefined,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Missed attendance record logged successfully')
        setMissedAttendance((prev) => [res.data, ...prev])
        setAddMissedModalOpen(false)
        setMissedName('')
        setMissedEmail('')
        setMissedRollNumber('')
        setMissedSelectedHours([1])
        setMissedNotes('')
        router.refresh()
      }
    })
  }

  const handleDeleteMissedAttendance = async (id: string) => {
    startTransition(async () => {
      const res = await deleteMissedAttendanceRecord(id, 'event', event.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Record removed')
        setMissedAttendance((prev) => prev.filter((r) => r.id !== id))
        router.refresh()
      }
    })
  }

  const handleExportMissedAttendance = () => {
    if (missedAttendance.length === 0) {
      toast.error('No missed attendance records found to export')
      return
    }
    exportMissedAttendanceToXlsx({
      title: event.title,
      date: event.start_date ? event.start_date.split('T')[0] : undefined,
      sourceType: 'event',
      items: missedAttendance,
    })
    toast.success('XLSX exported successfully (1 distinct row per missed hour)')
  }

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
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
            <ExportResultsButton
              type="event"
              id={event.id}
              title={event.title}
              event={event}
              registrations={registrations}
              submissions={submissions}
              exportMode="all"
              label="Overall Export"
              className="border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-4"
            />
            <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-4 flex items-center gap-2">
              <Link href={`/admin/events/${event.id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit Event
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black/40 border border-white/5 rounded-xl p-1 h-11 text-xs flex overflow-x-auto whitespace-nowrap scrollbar-none w-full">
          <TabsTrigger value="overview" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Attendance & OTP
          </TabsTrigger>
          <TabsTrigger value="missed-attendance" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Missed Attendance {missedAttendance.length > 0 && `(${missedAttendance.length})`}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Feedback {feedbacks.length > 0 && `(${feedbacks.length})`}
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Submissions
          </TabsTrigger>
          <TabsTrigger value="winners" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Winners
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg py-2 px-4 font-bold data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-white/70 flex-none">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event.banner_url && (
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg md:col-span-1">
                <div className="relative aspect-[4/5] w-full bg-neutral-950 flex items-center justify-center">
                  <img src={event.banner_url} alt={event.title} className="h-full w-full object-contain" />
                </div>
              </Card>
            )}

            <Card className={cn(
              "border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl",
              event.banner_url ? "md:col-span-1" : "md:col-span-2"
            )}>
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
        <TabsContent value="attendance" className="mt-6 space-y-6">
          {/* Live OTP Attendance Controller Card */}
          <Card className="border border-cyan-500/20 bg-gradient-to-r from-neutral-900/90 via-black to-neutral-900/90 backdrop-blur-xl rounded-2xl p-5 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Event OTP Check-In System
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase",
                        otpActive 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" 
                          : "bg-neutral-800 text-neutral-400 border-white/5"
                      )}>
                        {otpActive ? '● Active & Accepting' : '○ Closed'}
                      </Badge>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Eliminate manual check-in for 100+ attendees. Announce or project this OTP code for instant self check-in.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Display & Quick Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 h-11">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">OTP:</span>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 849201"
                    maxLength={10}
                    className="bg-transparent font-mono font-extrabold text-cyan-400 text-lg w-28 text-center focus:outline-none uppercase"
                  />
                  {otpCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(otpCode)
                        toast.success('OTP copied to clipboard')
                      }}
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Copy OTP"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleGenerateRandomOtp}
                  disabled={isPending}
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl h-11 px-3.5 flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Generate Random
                </Button>

                <Button
                  onClick={handleToggleOtpActive}
                  disabled={isPending}
                  size="sm"
                  className={cn(
                    "text-xs font-bold rounded-xl h-11 px-4 flex items-center gap-1.5 transition-all",
                    otpActive
                      ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                      : "bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 shadow-lg shadow-cyan-500/10"
                  )}
                >
                  {otpActive ? 'Close Check-In' : 'Activate Check-In'}
                </Button>

                <Button
                  onClick={() => setProjectorOpen(true)}
                  disabled={!otpCode}
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl h-11 px-3.5 flex items-center gap-1.5 border border-white/10"
                  title="Open Projector View for Auditorium Screen"
                >
                  <Tv className="h-4 w-4 text-cyan-400" />
                  Projector View
                </Button>
              </div>
            </div>
          </Card>

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
                <ExportResultsButton
                  type="event"
                  id={event.id}
                  title={event.title}
                  event={event}
                  registrations={registrations}
                  submissions={submissions}
                  exportMode="attendance"
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-lg px-3 py-1.5 h-8 flex items-center gap-1.5"
                  label="Export Attendance Report"
                />
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
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-md font-bold text-white">Participant Entries ({submissions.length})</h3>
                  <ExportResultsButton
                    type="event"
                    id={event.id}
                    title={event.title}
                    event={event}
                    registrations={registrations}
                    submissions={submissions}
                    exportMode="submissions"
                    size="sm"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-lg px-3 py-1.5 h-8 flex items-center gap-1.5"
                    label="Export Submissions"
                  />
                </div>
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

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
                <ExportResultsButton
                  type="event"
                  id={event.id}
                  title={event.title}
                  event={event}
                  registrations={registrations}
                  submissions={submissions}
                  exportMode="winners"
                  label="Export Winners"
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl h-10 px-4"
                />
                <Button
                  onClick={handleSaveWinners}
                  disabled={isPending}
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-10 px-5 flex items-center gap-1.5"
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
              </div>
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

        {/* Tab 5: Missed Attendance (PCDP App) */}
        <TabsContent value="missed-attendance" className="mt-6 space-y-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  Missed Attendance Tracking ({missedAttendance.length} records)
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Students who missed institute attendance in PCDP during this event. Exported with 1 distinct row per missed hour.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <Button
                  onClick={handleExportMissedAttendance}
                  disabled={missedAttendance.length === 0}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl h-10 px-4 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Missed Attendance (XLSX)
                </Button>
                <Button
                  onClick={() => setAddMissedModalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl h-10 px-4 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4 text-cyan-400" />
                  Record Student
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {missedAttendance.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 border-t border-white/5">
                  No missed attendance records logged for this event.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-t border-white/5">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6 w-12 text-center">S.No</th>
                        <th className="py-4 px-6">Student</th>
                        <th className="py-4 px-6">Roll Number</th>
                        <th className="py-4 px-6">Missed Hours</th>
                        <th className="py-4 px-6">Remarks</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {missedAttendance.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 px-6 text-center text-neutral-500 text-xs font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-white block text-xs">{item.name}</span>
                            <span className="text-[10px] text-neutral-500 block">{item.email}</span>
                          </td>
                          <td className="py-4 px-6">
                            <Badge className="bg-white/5 text-neutral-300 font-mono text-[10px] border-white/10 uppercase">
                              {item.roll_number || 'N/A'}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(item.hours) ? item.hours : [item.hours]).map((h: any) => (
                                <Badge key={h} className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-bold py-0 px-1.5">
                                  H{typeof h === 'string' ? h.replace(/[^0-9]/g, '') || h : h}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-neutral-400">
                            {item.notes || '—'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              onClick={() => handleDeleteMissedAttendance(item.id)}
                              disabled={isPending}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

        {/* Tab 6: Attendee Feedback */}
        <TabsContent value="feedback" className="mt-6 space-y-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  Attendee Feedback ({feedbacks.length} Reviews)
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Post-event feedback submitted by participants through the OTP attendance flow.
                </CardDescription>
              </div>
              {feedbacks.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-extrabold text-amber-400">
                    {(feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / feedbacks.length).toFixed(1)} / 5.0 Average
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {feedbacks.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 border-t border-white/5">
                  No feedback reviews submitted yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5 border-t border-white/5">
                  {feedbacks.map((fb, idx) => (
                    <div key={fb.id || idx} className="p-5 flex flex-col sm:flex-row justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{fb.user_name}</span>
                          {fb.user_roll && (
                            <Badge className="bg-white/5 text-neutral-400 text-[10px] font-mono border-white/10">
                              {fb.user_roll}
                            </Badge>
                          )}
                          <span className="text-[10px] text-neutral-500">
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {fb.feedback ? (
                          <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                            "{fb.feedback}"
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-600 italic">No written comment provided.</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "h-3.5 w-3.5",
                              s <= (fb.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-transparent text-neutral-700"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Projector View Dialog for Big Screen */}
      <Dialog open={projectorOpen} onOpenChange={setProjectorOpen}>
        <DialogContent className="border-cyan-500/30 bg-black text-white sm:max-w-2xl rounded-3xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs font-bold uppercase tracking-wider px-3 py-1">
              Live Attendance Check-In
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{event.title}</h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
              Scan or go to PhotoHub &gt; Events &gt; this event and enter the OTP below to mark your attendance and claim institute hours.
            </p>
          </div>

          <div className="py-8 px-6 bg-gradient-to-b from-white/[0.04] to-transparent border border-cyan-500/20 rounded-3xl space-y-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Attendance Code</span>
            <div className="text-6xl sm:text-7xl font-black font-mono tracking-[0.3em] text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]">
              {otpCode || '------'}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Instant Points Awarded
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-cyan-400" />
              PCDP Hours Normalization
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Add Missed Attendance Dialog */}
      <Dialog open={addMissedModalOpen} onOpenChange={setAddMissedModalOpen}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Record Missed Attendance
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Record a student who missed college PCDP attendance during this event.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMissedAttendance} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">Student Name *</Label>
              <Input
                value={missedName}
                onChange={(e) => setMissedName(e.target.value)}
                placeholder="Full Name"
                className="bg-black/40 border-white/10 text-xs h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">Roll Number *</Label>
              <Input
                value={missedRollNumber}
                onChange={(e) => setMissedRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 7376221EC101"
                className="bg-black/40 border-white/10 text-xs font-mono uppercase h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">Email Address (Optional)</Label>
              <Input
                value={missedEmail}
                onChange={(e) => setMissedEmail(e.target.value)}
                placeholder="student@bitsathy.ac.in"
                className="bg-black/40 border-white/10 text-xs h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-neutral-300">Missed Hours (1 - 7) *</Label>
                <span className="text-[10px] text-cyan-400 font-bold">{missedSelectedHours.length} selected</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                  const isSelected = missedSelectedHours.includes(hour)
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => toggleMissedHour(hour)}
                      className={cn(
                        'py-2 rounded-lg text-xs font-bold border transition-all text-center',
                        isSelected
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                      )}
                    >
                      H{hour}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">Remarks / Reason (Optional)</Label>
              <Input
                value={missedNotes}
                onChange={(e) => setMissedNotes(e.target.value)}
                placeholder="e.g. EC302 Lecture missed"
                className="bg-black/40 border-white/10 text-xs h-10 rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddMissedModalOpen(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 rounded-xl h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-black font-bold rounded-xl h-10 text-xs"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Record'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
