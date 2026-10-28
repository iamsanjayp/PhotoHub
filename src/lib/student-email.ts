/**
 * Parses student email pattern for Bannari Amman Institute of Technology:
 * Pattern: {name}.{dept}{year}@bitsathy.ac.in
 * Examples:
 * - sanjayp.cs24@bitsathy.ac.in -> name: 'Sanjay P', department: 'CS', batch: '2024'
 * - pragathip.mz24@Bitsathy.ac.in -> name: 'Pragathi P', department: 'MZ', batch: '2024'
 * - naveenk.it23@bitsathy.ac.in -> name: 'Naveen K', department: 'IT', batch: '2023'
 */

export interface ParsedStudentInfo {
  name: string
  department: string
  batch: string
}

export function parseStudentEmail(email: string | null | undefined): ParsedStudentInfo | null {
  if (!email) return null

  const clean = email.trim().toLowerCase()
  if (!clean.endsWith('@bitsathy.ac.in')) return null

  const local = clean.split('@')[0]
  // Match username.dept24 e.g. sanjayp.cs24 or john.it23 or deepak_r.me25
  const match = local.match(/^([a-z0-9_]+)\.([a-z]+)(\d{2})$/i)
  if (!match) return null

  const rawName = match[1]
  const dept = match[2].toUpperCase()
  const yearDigits = match[3]
  const batch = `20${yearDigits}`

  // Format name nicely: if ends with a single letter initial (e.g. sanjayp -> Sanjay P)
  let formattedName = rawName
  if (rawName.length > 2 && !rawName.includes('_') && /[a-z]/i.test(rawName[rawName.length - 1])) {
    const base = rawName.slice(0, -1)
    const initial = rawName.slice(-1).toUpperCase()
    formattedName = `${base.charAt(0).toUpperCase()}${base.slice(1)} ${initial}`
  } else {
    formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  }

  return {
    name: formattedName,
    department: dept,
    batch,
  }
}
