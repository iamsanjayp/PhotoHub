import * as XLSX from 'xlsx'

/**
 * Converts any PhotoHub internal media proxy link (/api/media/<id>)
 * or Google Drive direct link to a clickable, direct Google Drive file viewer URL.
 */
export function formatDriveExportUrl(url?: string | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'N/A') return 'N/A'

  // Match /api/media/<fileId> or /api/media/drive/<fileId>
  const mediaMatch = trimmed.match(/\/api\/media\/(?:drive\/)?([a-zA-Z0-9_-]+)/)
  if (mediaMatch && mediaMatch[1]) {
    return `https://drive.google.com/file/d/${mediaMatch[1]}/view`
  }

  // Match Google usercontent direct image /d/<fileId>
  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
  if (lh3Match && lh3Match[1]) {
    return `https://drive.google.com/file/d/${lh3Match[1]}/view`
  }

  // Match drive.google.com/uc?id=<fileId> or drive.google.com/open?id=<fileId>
  const driveParamMatch = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/)
  if (driveParamMatch && driveParamMatch[1]) {
    return `https://drive.google.com/file/d/${driveParamMatch[1]}/view`
  }

  // Match existing drive.google.com/file/d/<fileId>
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/view`
  }

  // Match pure Google Drive file IDs (typically 25 to 50 alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return `https://drive.google.com/file/d/${trimmed}/view`
  }

  return trimmed
}

export interface MissedAttendanceExportItem {
  id?: string
  name: string
  email: string
  roll_number: string
  hours: number[] | string[]
  notes?: string | null
  created_at?: string
}

export interface ExportMissedAttendanceOptions {
  title: string
  date?: string
  sourceType?: 'shoot' | 'event'
  items: MissedAttendanceExportItem[]
}

/**
 * Exports missed attendance records to an Excel (.xlsx) file.
 * Crucial rule: If a student missed hours 1, 2, 3, it MUST be exported as
 * 3 separate individual rows (one for Hour 1, one for Hour 2, one for Hour 3).
 * Do NOT combine them into a single comma-separated row.
 */
export function exportMissedAttendanceToXlsx({
  title,
  date,
  sourceType = 'shoot',
  items,
}: ExportMissedAttendanceOptions) {
  if (typeof window === 'undefined') return

  const headers = [
    'S.No',
    'Student Name',
    'Roll Number',
    'College Email',
    'Missed Hour',
    sourceType === 'shoot' ? 'Shoot / Assignment' : 'Event Name',
    'Date',
    'Remarks / Reason',
  ]

  const rows: (string | number)[][] = []
  let serialNumber = 1

  for (const item of items) {
    // Normalize hours to numbers and sort ascending (1 through 7)
    const rawHours = Array.isArray(item.hours) ? item.hours : []
    const parsedHours = rawHours
      .map((h) => {
        if (typeof h === 'number') return h
        const match = String(h).match(/\d+/)
        return match ? parseInt(match[0], 10) : NaN
      })
      .filter((h) => !isNaN(h) && h >= 1 && h <= 7)
      .sort((a, b) => a - b)

    // Fallback if no specific hour was parsed
    const hoursToExport = parsedHours.length > 0 ? parsedHours : [1]

    // Create 1 distinct row per hour missed
    for (const hour of hoursToExport) {
      rows.push([
        serialNumber++,
        item.name || 'N/A',
        item.roll_number ? item.roll_number.toUpperCase() : 'N/A',
        item.email || 'N/A',
        `Hour ${hour}`,
        title || 'PhotoHub Event/Shoot',
        date || new Date().toISOString().split('T')[0],
        item.notes || '',
      ])
    }
  }

  // Create worksheet and workbook
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 25 }, // Student Name
    { wch: 18 }, // Roll Number
    { wch: 32 }, // College Email
    { wch: 14 }, // Missed Hour
    { wch: 28 }, // Shoot / Event
    { wch: 15 }, // Date
    { wch: 30 }, // Remarks
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Missed Attendance')

  // Generate clean filename
  const cleanTitle = (title || 'Attendance')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const filename = `Missed-Attendance-${cleanTitle}-${date || new Date().toISOString().split('T')[0]}.xlsx`

  // Trigger browser download
  XLSX.writeFile(workbook, filename)
}

export interface ExportShootsReportOptions {
  shoots: any[]
  filterLabel?: string
}

/**
 * Exports comprehensive monthly/periodic event shoots report for the Institute.
 * Contains: Shoot Name, Date, Venue, Department, Organizer, Assigned Crew (with Roll Numbers),
 * Allocated Gear, Shoot Status, and actual Google Drive Deliverable links.
 */
export function exportShootsMonthlyReportToXlsx({
  shoots,
  filterLabel = 'All',
}: ExportShootsReportOptions) {
  if (typeof window === 'undefined') return

  const headers = [
    'S.No',
    'Shoot / Event Title',
    'Date',
    'Time Window',
    'Venue',
    'Host Department',
    'Organizer Name',
    'Contact Email',
    'Contact Phone',
    'Status',
    'Coverage Type',
    'Assigned Crew (Name - Roll No - Role)',
    'Allocated Equipment',
    'Deliverable / Media Links (Google Drive)',
    'Remarks / Notes',
  ]

  const rows: (string | number)[][] = []
  let serialNumber = 1

  for (const s of shoots) {
    // Format crew
    const crewList = (s.apex_assignments || s.assignments || [])
      .map((a: any) => {
        const name = a.profiles?.full_name || 'Member'
        const roll = a.profiles?.roll_number ? ` (${a.profiles.roll_number})` : ''
        const role = a.role ? ` - ${a.role}` : ''
        return `${name}${roll}${role}`
      })
      .join(', ')

    // Format equipment
    const gearList = (s.equipment_assignments || [])
      .map((ea: any) => ea.equipment?.name || '')
      .filter(Boolean)
      .join(', ')

    // Format deliverables with actual Google Drive links
    const deliverableLinks = (s.apex_media || s.media || [])
      .map((m: any) => formatDriveExportUrl(m.url))
      .filter(Boolean)
      .join(' ; ')

    const timeWindow = s.event_time
      ? `${s.event_time}${s.end_time ? ` to ${s.end_time}` : ''}`
      : 'N/A'

    rows.push([
      serialNumber++,
      s.event_name || 'Untitled Shoot',
      s.event_date ? new Date(s.event_date).toLocaleDateString('en-GB') : 'N/A',
      timeWindow,
      s.venue || 'N/A',
      s.department || 'N/A',
      s.organizer_name || 'N/A',
      s.contact_email || s.organizer_email || 'N/A',
      s.contact_phone || s.organizer_phone || 'N/A',
      (s.status || 'scheduled').toUpperCase(),
      (s.coverage_type || 'photography').toUpperCase(),
      crewList || 'None Assigned',
      gearList || 'Personal Gear / None',
      deliverableLinks || 'Pending Upload',
      s.notes || '',
    ])
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  worksheet['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 30 }, // Title
    { wch: 14 }, // Date
    { wch: 18 }, // Time
    { wch: 22 }, // Venue
    { wch: 22 }, // Department
    { wch: 22 }, // Organizer
    { wch: 28 }, // Email
    { wch: 16 }, // Phone
    { wch: 14 }, // Status
    { wch: 16 }, // Coverage
    { wch: 45 }, // Crew
    { wch: 30 }, // Equipment
    { wch: 55 }, // Deliverables
    { wch: 30 }, // Notes
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shoots Report')

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `PhotoHub-Shoots-Report-${filterLabel.replace(/\s+/g, '-')}-${dateStr}.xlsx`

  XLSX.writeFile(workbook, filename)
}
