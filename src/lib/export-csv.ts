import { format } from 'date-fns'
import { formatDriveExportUrl } from '@/lib/export-xlsx'

function escapeCsvCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) {
    return ''
  }
  const str = String(cell)
  // If the string contains double quotes, commas, or newlines, escape it
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  if (typeof window === 'undefined') return

  // UTF-8 BOM for proper Excel Unicode recognition
  const BOM = '\uFEFF'
  const headerLine = headers.map(escapeCsvCell).join(',')
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','))
  const csvContent = BOM + [headerLine, ...rowLines].join('\r\n')

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // Support IE/Edge legacy msSaveBlob
  if ((window.navigator as any)?.msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, cleanFilename)
    return
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = cleanFilename
  link.rel = 'noopener noreferrer'
  link.style.display = 'none'

  // Prevent Next.js global click interception from treating this as a route navigation
  link.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  document.body.appendChild(link)
  link.click()

  // Defer revoking and removing link to ensure browser download pipeline has initiated
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
      window.URL.revokeObjectURL(url)
    } catch {
      // Ignore cleanup issues
    }
  }, 3000)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function formatSafeDate(dateVal?: string | null): string {
  if (!dateVal) return 'N/A'
  try {
    return format(new Date(dateVal), 'yyyy-MM-dd HH:mm:ss')
  } catch {
    return dateVal
  }
}

/**
 * Export consolidated results for an Event:
 * Combines registration, attendance, submission, marks, and feedback into a single comprehensive sheet.
 */
export function exportEventConsolidatedResults(
  event: { id?: string; title?: string },
  registrations: any[] = [],
  submissions: any[] = []
) {
  const safeRegistrations = Array.isArray(registrations) ? registrations : []
  const safeSubmissions = Array.isArray(submissions) ? submissions : []

  const headers = [
    'Participant Name',
    'Roll Number',
    'Email',
    'Phone',
    'Department',
    'Batch',
    'Registration Date',
    'Registration Status',
    'Attendance Status',
    'Check-in Time',
    'Submission Status',
    'Submission Date & Time',
    'Submission Type',
    'Submission Link / URL',
    'Caption / Notes',
    'Marks / Score',
    'Feedback / Comments',
    'Winner Declared',
  ]

  const subMap = new Map<string, any>()
  safeSubmissions.forEach((sub) => {
    if (sub && sub.user_id) {
      subMap.set(sub.user_id, sub)
    }
  })

  const rows: (string | number | null | undefined)[][] = []
  const processedUserIds = new Set<string>()

  // 1. Process all registrations
  safeRegistrations.forEach((reg) => {
    if (!reg) return
    const profile = reg.profiles || {}
    const sub = subMap.get(reg.user_id)
    if (reg.user_id) processedUserIds.add(reg.user_id)

    rows.push([
      profile.full_name || profile.username || 'Unknown',
      profile.roll_number || 'N/A',
      profile.email || 'N/A',
      profile.phone || 'N/A',
      profile.department || 'N/A',
      profile.batch || 'N/A',
      formatSafeDate(reg.registered_at),
      reg.status ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1) : 'Registered',
      reg.attended ? 'Attended' : 'Absent',
      formatSafeDate(reg.checked_in_at),
      sub ? (sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Submitted') : 'No Submission',
      sub ? formatSafeDate(sub.created_at) : 'N/A',
      sub ? sub.content_type : 'N/A',
      sub ? (formatDriveExportUrl(sub.external_link || sub.content_url) || 'N/A') : 'N/A',
      sub ? (sub.caption || '') : '',
      sub && sub.score !== null && sub.score !== undefined ? sub.score : 'N/A',
      sub ? (sub.feedback || '') : '',
      sub && sub.status === 'winner' ? 'Yes' : 'No',
    ])
  })

  // 2. Add any submissions from users not formally registered
  safeSubmissions.forEach((sub) => {
    if (sub && sub.user_id && !processedUserIds.has(sub.user_id)) {
      const profile = sub.profiles || {}
      rows.push([
        profile.full_name || profile.username || 'Unknown',
        profile.roll_number || 'N/A',
        profile.email || 'N/A',
        profile.phone || 'N/A',
        profile.department || 'N/A',
        profile.batch || 'N/A',
        'Not Registered',
        'Unregistered',
        'Not Marked',
        'N/A',
        sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Submitted',
        formatSafeDate(sub.created_at),
        sub.content_type,
        formatDriveExportUrl(sub.external_link || sub.content_url) || 'N/A',
        sub.caption || '',
        sub.score !== null && sub.score !== undefined ? sub.score : 'N/A',
        sub.feedback || '',
        sub.status === 'winner' ? 'Yes' : 'No',
      ])
    }
  })

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `event-${slugify(event?.title || 'results')}-results-${dateStr}.csv`
  downloadCsv(filename, headers, rows)
}

/**
 * Export attendance sheet only for an Event
 */
export function exportEventAttendanceOnly(
  event: { id?: string; title?: string },
  registrations: any[] = []
) {
  const safeRegistrations = Array.isArray(registrations) ? registrations : []

  const headers = [
    'Participant Name',
    'Roll Number',
    'Email',
    'Phone',
    'Department',
    'Batch',
    'Registration Date',
    'Registration Status',
    'Attendance Status',
    'Check-in Time',
  ]

  const rows = safeRegistrations.map((reg) => {
    const profile = reg?.profiles || {}
    return [
      profile.full_name || profile.username || 'Unknown',
      profile.roll_number || 'N/A',
      profile.email || 'N/A',
      profile.phone || 'N/A',
      profile.department || 'N/A',
      profile.batch || 'N/A',
      formatSafeDate(reg?.registered_at),
      reg?.status ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1) : 'Registered',
      reg?.attended ? 'Attended' : 'Absent',
      formatSafeDate(reg?.checked_in_at),
    ]
  })

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `event-${slugify(event?.title || 'attendance')}-attendance-${dateStr}.csv`
  downloadCsv(filename, headers, rows)
}

/**
 * Export submissions and marks only for an Event
 */
export function exportEventSubmissionsOnly(
  event: { id?: string; title?: string },
  submissions: any[] = []
) {
  const safeSubmissions = Array.isArray(submissions) ? submissions : []

  const headers = [
    'Participant Name',
    'Roll Number',
    'Email',
    'Phone',
    'Department',
    'Batch',
    'Submission Status',
    'Submission Date & Time',
    'Submission Type',
    'Submission Link / URL',
    'Caption / Notes',
    'Marks / Score',
    'Feedback / Comments',
    'Winner Declared',
  ]

  const rows = safeSubmissions.map((sub) => {
    const profile = sub?.profiles || {}
    return [
      profile.full_name || profile.username || 'Unknown',
      profile.roll_number || 'N/A',
      profile.email || 'N/A',
      profile.phone || 'N/A',
      profile.department || 'N/A',
      profile.batch || 'N/A',
      sub?.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Submitted',
      formatSafeDate(sub?.created_at),
      sub?.content_type || 'N/A',
      formatDriveExportUrl(sub?.external_link || sub?.content_url) || 'N/A',
      sub?.caption || '',
      sub && sub.score !== null && sub.score !== undefined ? sub.score : 'N/A',
      sub?.feedback || '',
      sub && sub.status === 'winner' ? 'Yes' : 'No',
    ]
  })

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `event-${slugify(event?.title || 'submissions')}-submissions-${dateStr}.csv`
  downloadCsv(filename, headers, rows)
}

/**
 * Export winners only for an Event
 */
export function exportEventWinnersOnly(
  event: { id?: string; title?: string },
  submissions: any[] = []
) {
  const safeSubmissions = Array.isArray(submissions) ? submissions : []
  const winners = safeSubmissions.filter((s: any) => s && s.status === 'winner')
  exportEventSubmissionsOnly(
    { ...event, title: `${event?.title || 'Event'} - Winners` },
    winners
  )
}

/**
 * Export challenge submissions, scores/marks, and feedback
 */
export function exportChallengeSubmissions(
  challenge: { id?: string; title?: string },
  submissions: any[] = []
) {
  const safeSubmissions = Array.isArray(submissions) ? submissions : []

  const headers = [
    'Participant Name',
    'Roll Number',
    'Email',
    'Phone',
    'Department',
    'Batch',
    'Submission Status',
    'Submission Date & Time',
    'Submission Type',
    'Submission Link / URL',
    'Caption / Notes',
    'Marks / Score',
    'Feedback / Review Notes',
    'Winner Declared',
  ]

  const rows = safeSubmissions.map((sub) => {
    const profile = sub?.profiles || {}
    return [
      profile.full_name || profile.username || 'Unknown',
      profile.roll_number || 'N/A',
      profile.email || 'N/A',
      profile.phone || 'N/A',
      profile.department || 'N/A',
      profile.batch || 'N/A',
      sub?.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Submitted',
      formatSafeDate(sub?.created_at),
      sub?.content_type || 'N/A',
      formatDriveExportUrl(sub?.external_link || sub?.content_url) || 'N/A',
      sub?.caption || '',
      sub && sub.score !== null && sub.score !== undefined ? sub.score : 'N/A',
      sub?.feedback || '',
      sub && sub.status === 'winner' ? 'Yes' : 'No',
    ]
  })

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `challenge-${slugify(challenge?.title || 'results')}-results-${dateStr}.csv`
  downloadCsv(filename, headers, rows)
}

/**
 * Export summary of all events
 */
export function exportAllEventsSummary(events: any[]) {
  const headers = [
    'Title',
    'Type',
    'Visibility',
    'Start Date',
    'End Date',
    'Venue',
    'Points',
    'Submission Required',
    'Registered Count',
    'Max Participants',
  ]

  const rows = events.map((ev) => [
    ev.title || '',
    ev.event_type || '',
    ev.visibility || '',
    formatSafeDate(ev.start_date),
    formatSafeDate(ev.end_date),
    ev.venue || 'N/A',
    ev.points ?? 0,
    ev.submission_required ? 'Yes' : 'No',
    ev.registration_count ?? 0,
    ev.max_participants ?? 'Unlimited',
  ])

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  downloadCsv(`all-events-summary-${dateStr}.csv`, headers, rows)
}

/**
 * Export summary of all challenges
 */
export function exportAllChallengesSummary(challenges: any[]) {
  const headers = [
    'Title',
    'Theme',
    'Points',
    'Start Date',
    'End Date',
    'Submission Mode',
    'Total Submissions',
    'Status',
  ]

  const rows = challenges.map((c) => {
    const isPast = new Date(c.end_date) < new Date()
    return [
      c.title || '',
      c.theme || 'N/A',
      c.points ?? 0,
      formatSafeDate(c.start_date),
      formatSafeDate(c.end_date),
      c.submission_mode || 'image',
      c.submission_count ?? 0,
      isPast ? 'Closed' : 'Active',
    ]
  })

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  downloadCsv(`all-challenges-summary-${dateStr}.csv`, headers, rows)
}
