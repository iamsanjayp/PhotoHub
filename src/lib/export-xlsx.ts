import * as XLSX from 'xlsx'

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
