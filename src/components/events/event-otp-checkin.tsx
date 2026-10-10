'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  AlertCircle,
  Loader2,
  CalendarCheck,
  SendHorizontal,
  GraduationCap
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { verifyAndCheckInWithOtp, submitEventFeedbackAndMissedAttendance } from '@/actions/events'

interface EventOtpCheckinProps {
  eventId: string
  eventTitle: string
  isRegistered: boolean
  initialIsCheckedIn: boolean
  initialHasSubmittedFeedback: boolean
  isOtpActive: boolean
  userProfile?: {
    id: string
    full_name: string | null
    email: string | null
    roll_number?: string | null
  } | null
}

const HOURS = [1, 2, 3, 4, 5, 6, 7]

export default function EventOtpCheckin({
  eventId,
  eventTitle,
  isRegistered,
  initialIsCheckedIn,
  initialHasSubmittedFeedback,
  isOtpActive,
  userProfile,
}: EventOtpCheckinProps) {
  const router = useRouter()
  const [isCheckedIn, setIsCheckedIn] = useState(initialIsCheckedIn)
  const [hasFeedback, setHasFeedback] = useState(initialHasSubmittedFeedback)
  
  // OTP Dialog state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  // Feedback form state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [feedbackText, setFeedbackText] = useState('')
  const [hasMissedPcdp, setHasMissedPcdp] = useState(false)
  const [rollNumber, setRollNumber] = useState(userProfile?.roll_number || '')
  const [selectedHours, setSelectedHours] = useState<number[]>([])
  const [remarks, setRemarks] = useState('')

  const [isPending, startTransition] = useTransition()

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error('Please enter the OTP code provided by event coordinators.')
      return
    }

    startTransition(async () => {
      const res = await verifyAndCheckInWithOtp(eventId, otpCode.trim())
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Attendance verified successfully!')
        setIsCheckedIn(true)
        setOtpDialogOpen(false)
        setOtpCode('')
        // Immediately invite to provide feedback & PCDP missed attendance
        if (!hasFeedback) {
          setFeedbackDialogOpen(true)
        }
        router.refresh()
      }
    })
  }

  // Toggle Hour Selection
  const toggleHour = (hour: number) => {
    setSelectedHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    )
  }

  // Submit Feedback & PCDP Missed Attendance
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasMissedPcdp) {
      if (!rollNumber.trim()) {
        toast.error('Please provide your College Roll Number to record missed PCDP attendance.')
        return
      }
      if (selectedHours.length === 0) {
        toast.error('Please select at least one hour (Hours 1 - 7) that you missed in the PCDP app.')
        return
      }
    }

    startTransition(async () => {
      const res = await submitEventFeedbackAndMissedAttendance(eventId, {
        rating,
        feedback: feedbackText,
        missedHours: hasMissedPcdp ? selectedHours : [],
        rollNumber: hasMissedPcdp ? rollNumber.trim() : undefined,
        notes: hasMissedPcdp ? remarks.trim() : undefined,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          hasMissedPcdp
            ? 'Feedback submitted and missed attendance logged for institute approval!'
            : 'Feedback submitted! Thank you for participating.'
        )
        setHasFeedback(true)
        setFeedbackDialogOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Attendance & Feedback Status Card */}
      <Card className="border border-white/10 bg-gradient-to-br from-neutral-900/90 via-black to-neutral-900/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              Event OTP Attendance
            </CardTitle>
            {isCheckedIn ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Present
              </Badge>
            ) : isOtpActive ? (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-bold animate-pulse">
                OTP Active
              </Badge>
            ) : (
              <Badge className="bg-neutral-800 text-neutral-400 border-white/5 text-[10px]">
                Closed
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-neutral-400">
            {isCheckedIn
              ? 'Your attendance has been verified for this event.'
              : isOtpActive
              ? 'Organizers have opened OTP check-in. Enter the event code to mark your attendance.'
              : 'OTP attendance opens towards the end of the event.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {/* Case 1: Not checked in yet */}
          {!isCheckedIn && (
            <div className="space-y-2">
              <Button
                onClick={() => setOtpDialogOpen(true)}
                disabled={!isOtpActive}
                className={cn(
                  'w-full font-bold text-xs rounded-xl h-11 flex items-center justify-center gap-2 transition-all',
                  isOtpActive
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 shadow-lg shadow-cyan-500/10'
                    : 'bg-neutral-800 text-neutral-400 border border-white/5 cursor-not-allowed'
                )}
              >
                <KeyRound className="h-4 w-4" />
                {isOtpActive ? 'Enter Event OTP to Check In' : 'Attendance OTP Not Active Yet'}
              </Button>
              <p className="text-[10px] text-neutral-500 text-center">
                Requires the 6-character code announced or projected by the event coordinators.
              </p>
            </div>
          )}

          {/* Case 2: Checked in, but hasn't filled feedback / missed attendance */}
          {isCheckedIn && !hasFeedback && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2.5 text-xs text-neutral-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Attendance Recorded!</span>
                  Please submit the post-event feedback and claim any missed PCDP college hours.
                </div>
              </div>

              <Button
                onClick={() => setFeedbackDialogOpen(true)}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-xl h-10 flex items-center justify-center gap-2 shadow-md shadow-cyan-500/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Submit Feedback & Claim PCDP Hours
              </Button>
            </div>
          )}

          {/* Case 3: Checked in AND feedback submitted */}
          {isCheckedIn && hasFeedback && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                All Done!
              </div>
              <p className="text-[11px] text-neutral-400">
                Attendance marked and feedback submitted. If you claimed missed PCDP hours, they are included in the institute export report.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFeedbackDialogOpen(true)}
                className="text-[10px] text-neutral-400 hover:text-white h-7 mt-1"
              >
                View / Update Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. OTP Verification Modal */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-cyan-400" />
              Event OTP Check-In
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Enter the OTP code shared by the organizers at {eventTitle}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                6-Digit / Character Code
              </Label>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                placeholder="e.g. 849201"
                maxLength={10}
                autoFocus
                className="text-center font-mono text-2xl tracking-[0.3em] font-extrabold h-14 bg-black/50 border-white/10 focus:border-cyan-500 rounded-xl uppercase text-cyan-400 placeholder-neutral-700"
              />
              <p className="text-[11px] text-neutral-500 text-center">
                Make sure you are present at the venue when entering the code.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOtpDialogOpen(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 rounded-xl h-11 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !otpCode.trim()}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-black font-bold rounded-xl h-11 text-xs flex items-center justify-center gap-1.5"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Check-In'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Feedback & PCDP Missed Attendance Modal */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              Event Feedback & PCDP Attendance
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Help us improve future events and submit any missed college hours for attendance normalization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFeedback} className="space-y-5 pt-2">
            {/* Star Rating */}
            <div className="space-y-1.5 text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Label className="text-xs font-semibold text-neutral-300 block">
                How would you rate this event?
              </Label>
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={cn(
                        'h-7 w-7 transition-colors',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-neutral-600'
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-cyan-400 font-bold">
                {rating === 5 && 'Outstanding! 🌟'}
                {rating === 4 && 'Great experience! 👍'}
                {rating === 3 && 'Average / Decent ⚡'}
                {rating === 2 && 'Needs improvement 🔧'}
                {rating === 1 && 'Poor experience ⚠️'}
              </span>
            </div>

            {/* Feedback text */}
            <div className="space-y-2">
              <Label htmlFor="feedback-content" className="text-xs font-bold text-neutral-300">
                Your Thoughts / Feedback (Optional)
              </Label>
              <Textarea
                id="feedback-content"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What did you like the most? Any suggestions for the club?"
                rows={3}
                className="bg-black/40 border-white/10 rounded-xl text-xs text-white placeholder-neutral-600 focus-visible:ring-cyan-500/30"
              />
            </div>

            {/* PCDP Missed Attendance Section */}
            <div className="border border-white/10 bg-neutral-900/50 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="pcdp-checkbox"
                  checked={hasMissedPcdp}
                  onChange={(e) => setHasMissedPcdp(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-neutral-950 text-cyan-500 focus:ring-cyan-500/30"
                />
                <label htmlFor="pcdp-checkbox" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-white block">
                    Did you miss college attendance in the PCDP app?
                  </span>
                  <span className="text-neutral-400 text-[11px] block mt-0.5">
                    Tick this if you were participating in this event and missed college attendance for one or more hours.
                  </span>
                </label>
              </div>

              {hasMissedPcdp && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* Roll Number Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="roll-num" className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
                      Roll Number / Register Number *
                    </Label>
                    <Input
                      id="roll-num"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 7376221EC101"
                      className="bg-black/40 border-white/10 rounded-xl text-xs font-mono uppercase text-white focus:border-cyan-500"
                    />
                  </div>

                  {/* 7 Hours Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        Select Missed Hours (1 - 7) *
                      </Label>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {selectedHours.length} hour(s) selected
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {HOURS.map((hour) => {
                        const isSelected = selectedHours.includes(hour)
                        return (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => toggleHour(hour)}
                            className={cn(
                              'py-2 rounded-lg text-xs font-bold border transition-all text-center',
                              isSelected
                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm shadow-cyan-500/20'
                                : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
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

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <Label htmlFor="remarks" className="text-xs font-bold text-neutral-300">
                      Reason / Class Details (Optional)
                    </Label>
                    <Input
                      id="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. EC302 Lecture, Data Structures Lab"
                      className="bg-black/40 border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFeedbackDialogOpen(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 rounded-xl h-11 text-xs font-semibold"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-black font-bold rounded-xl h-11 text-xs flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <SendHorizontal className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
