import { type UserRole } from '@/types/database'

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  BOARD_MEMBER: 'board_member' as UserRole,
  COMMITTEE_MEMBER: 'committee_member' as UserRole,
  MEMBER: 'member' as UserRole,
} as const

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  board_member: 'Board Member',
  committee_member: 'Committee Member',
  member: 'Member',
  leader: 'Board Member',
  camera_holder: 'Committee Member',
  participant: 'Member',
  guest: 'Guest',
}

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  board_member: 3,
  leader: 3,
  committee_member: 2,
  camera_holder: 2,
  member: 1,
  participant: 1,
  guest: 0,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

// Admins & Board Members have administrative leadership access
export function isAdminOrBoard(role: string): boolean {
  return role === 'admin' || role === 'board_member' || role === 'leader'
}

// Backward compatibility alias for legacy references
export const isAdminOrLeader = isAdminOrBoard

// Club internal members: Admin, Board Member, Committee Member
// These members have access to "Members Only" events, meetings, and camera equipment
export function isClubCoreMember(role: string): boolean {
  return ['admin', 'board_member', 'committee_member', 'leader', 'camera_holder'].includes(role)
}

// Only Board Members and Committee Members (and Admins) can be assigned camera equipment
export function canAccessCamera(role: string): boolean {
  return ['admin', 'board_member', 'committee_member', 'leader', 'camera_holder'].includes(role)
}

export function isAdmin(role: string): boolean {
  return role === 'admin'
}
