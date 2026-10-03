'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  Loader2,
  FileSpreadsheet,
  Users,
  Award,
  ChevronDown,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { getEventExportData } from '@/actions/events'
import { getChallengeExportData } from '@/actions/challenges'
import {
  exportEventConsolidatedResults,
  exportEventAttendanceOnly,
  exportEventSubmissionsOnly,
  exportEventWinnersOnly,
  exportChallengeSubmissions,
} from '@/lib/export-csv'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export interface ExportResultsButtonProps {
  type: 'event' | 'challenge'
  id: string
  title?: string
  // Preloaded data if on detail page
  event?: any
  challenge?: any
  registrations?: any[]
  submissions?: any[]
  // Specific export mode: 'all' | 'attendance' | 'submissions' | 'winners'
  // When set to a specific mode, clicking directly runs that export without opening a dropdown
  exportMode?: 'all' | 'attendance' | 'submissions' | 'winners'
  // Style & UI
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  label?: string
  showIcon?: boolean
  hideDropdown?: boolean
}

export function ExportResultsButton({
  type,
  id,
  title,
  event: preloadedEvent,
  challenge: preloadedChallenge,
  registrations: preloadedRegistrations,
  submissions: preloadedSubmissions,
  exportMode,
  variant = 'outline',
  size = 'default',
  className,
  label,
  showIcon = true,
  hideDropdown = false,
}: ExportResultsButtonProps) {
  const [loading, setLoading] = useState(false)

  // Fetch event data if not already provided
  const loadEventData = async () => {
    if (preloadedRegistrations || preloadedSubmissions) {
      return {
        event: preloadedEvent || { id, title: title || 'Event' },
        registrations: preloadedRegistrations || [],
        submissions: preloadedSubmissions || [],
      }
    }

    setLoading(true)
    const res = await getEventExportData(id)
    setLoading(false)

    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to fetch event data')
      return null
    }
    return res.data
  }

  // Fetch challenge data if not already provided
  const loadChallengeData = async () => {
    if (preloadedSubmissions) {
      return {
        challenge: preloadedChallenge || { id, title: title || 'Challenge' },
        submissions: preloadedSubmissions || [],
      }
    }

    setLoading(true)
    const res = await getChallengeExportData(id)
    setLoading(false)

    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to fetch challenge data')
      return null
    }
    return res.data
  }

  const handleExportConsolidated = async () => {
    setLoading(true)
    try {
      if (type === 'event') {
        const data = await loadEventData()
        if (!data) return
        exportEventConsolidatedResults(data.event, data.registrations, data.submissions)
        toast.success(`Exported ${data.registrations.length} registrations & ${data.submissions.length} submissions`)
      } else {
        const data = await loadChallengeData()
        if (!data) return
        exportChallengeSubmissions(data.challenge, data.submissions)
        toast.success(`Exported ${data.submissions.length} challenge submissions & marks`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportAttendanceOnly = async () => {
    setLoading(true)
    try {
      const data = await loadEventData()
      if (!data) return

      if (!data.registrations || data.registrations.length === 0) {
        toast.info('No registrations found for this event yet')
      }
      exportEventAttendanceOnly(data.event, data.registrations)
      toast.success(`Exported attendance for ${data.registrations.length} participants`)
    } catch (err: any) {
      console.error(err)
      toast.error('Attendance export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportSubmissionsOnly = async () => {
    setLoading(true)
    try {
      if (type === 'event') {
        const data = await loadEventData()
        if (!data) return
        if (!data.submissions || data.submissions.length === 0) {
          toast.info('No submissions found for this event yet')
        }
        exportEventSubmissionsOnly(data.event, data.submissions)
        toast.success(`Exported ${data.submissions.length} submissions & marks`)
      } else {
        const data = await loadChallengeData()
        if (!data) return
        if (!data.submissions || data.submissions.length === 0) {
          toast.info('No submissions found for this challenge yet')
        }
        exportChallengeSubmissions(data.challenge, data.submissions)
        toast.success(`Exported ${data.submissions.length} submissions`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Submissions export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportWinnersOnly = async () => {
    setLoading(true)
    try {
      if (type === 'event') {
        const data = await loadEventData()
        if (!data) return

        const winners = (data.submissions || []).filter((s: any) => s && s.status === 'winner')
        if (winners.length === 0) {
          toast.info('No winners declared yet for this event')
        }
        exportEventWinnersOnly(data.event, data.submissions)
        toast.success(`Exported ${winners.length} winner entries`)
      } else {
        const data = await loadChallengeData()
        if (!data) return

        const winners = (data.submissions || []).filter((s: any) => s && s.status === 'winner')
        if (winners.length === 0) {
          toast.info('No winners declared yet for this challenge')
        }
        exportChallengeSubmissions(
          { ...data.challenge, title: `${data.challenge.title || 'Challenge'} - Winners` },
          winners
        )
        toast.success(`Exported ${winners.length} winner entries`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Winners export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  // Determine button label based on mode if not explicitly provided
  const displayLabel = label || (
    exportMode === 'attendance'
      ? 'Export Attendance Report'
      : exportMode === 'submissions'
      ? 'Export Submissions Report'
      : exportMode === 'winners'
      ? 'Export Winners'
      : 'Export Results'
  )

  // Determine direct action if specific exportMode is requested
  const isDirectMode = exportMode === 'attendance' || exportMode === 'submissions' || exportMode === 'winners' || exportMode === 'all' || hideDropdown || size === 'icon'

  const directAction = () => {
    if (exportMode === 'attendance') return handleExportAttendanceOnly()
    if (exportMode === 'submissions') return handleExportSubmissionsOnly()
    if (exportMode === 'winners') return handleExportWinnersOnly()
    return handleExportConsolidated()
  }

  // Simple direct button if specific mode, dropdown disabled, or icon-only
  if (isDirectMode) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={directAction}
        disabled={loading}
        className={className}
        title={displayLabel}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        ) : (
          showIcon && <Download className="h-4 w-4 text-cyan-400" />
        )}
        {size !== 'icon' && <span className="ml-1.5">{displayLabel}</span>}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400 mr-1.5" />
        ) : (
          showIcon && <Download className="h-4 w-4 text-cyan-400 mr-1.5" />
        )}
        <span>{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400 ml-1.5 opacity-70" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-neutral-950/95 border border-white/10 backdrop-blur-xl text-neutral-200 shadow-2xl p-1.5 rounded-xl z-50"
      >
        <DropdownMenuLabel className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1.5">
          {type === 'event' ? 'Event Export Options' : 'Challenge Export Options'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5 my-1" />

        <DropdownMenuItem
          onClick={handleExportConsolidated}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-cyan-500/10 focus:text-cyan-400 text-neutral-200"
        >
          <FileSpreadsheet className="h-4 w-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold">Complete Results (CSV)</span>
            <span className="text-[10px] text-neutral-400">
              {type === 'event'
                ? 'All data: Name, Attendance, Submissions, Marks'
                : 'All submissions, marks & feedback'}
            </span>
          </div>
        </DropdownMenuItem>

        {type === 'event' && (
          <>
            <DropdownMenuItem
              onClick={handleExportAttendanceOnly}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-cyan-500/10 focus:text-cyan-400 text-neutral-200"
            >
              <Users className="h-4 w-4 text-green-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">Attendance Log Only</span>
                <span className="text-[10px] text-neutral-400">
                  Participants, registration & check-ins
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleExportSubmissionsOnly}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-cyan-500/10 focus:text-cyan-400 text-neutral-200"
            >
              <Award className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">Submissions & Marks Only</span>
                <span className="text-[10px] text-neutral-400">
                  Links, scores, captions & feedback
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleExportWinnersOnly}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-cyan-500/10 focus:text-cyan-400 text-neutral-200"
            >
              <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">Winners Only (CSV)</span>
                <span className="text-[10px] text-neutral-400">
                  Only entries declared as winners
                </span>
              </div>
            </DropdownMenuItem>
          </>
        )}

        {type === 'challenge' && (
          <DropdownMenuItem
            onClick={handleExportWinnersOnly}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-cyan-500/10 focus:text-cyan-400 text-neutral-200"
          >
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold">Winners Only (CSV)</span>
              <span className="text-[10px] text-neutral-400">
                Only entries declared as winners
              </span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
