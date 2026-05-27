import { type UserRole } from '@/types/database'

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  LEADER: 'leader' as UserRole,
  CAMERA_HOLDER: 'camera_holder' as UserRole,
  PARTICIPANT: 'participant' as UserRole,
  GUEST: 'guest' as UserRole,
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  leader: 'Leader',
  camera_holder: 'Camera Holder',
  participant: 'Participant',
  guest: 'Guest',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  leader: 4,
  camera_holder: 3,
  participant: 2,
  guest: 1,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function isAdminOrLeader(role: UserRole): boolean {
  return role === 'admin' || role === 'leader'
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}
