'use client'

import { useAuth } from '@/providers/auth-provider'
import {
  isAdminOrBoard,
  isAdmin,
  isClubCoreMember,
  canAccessCamera,
  hasPermission,
} from '@/lib/constants/roles'
import type { UserRole } from '@/types/database'

export function useRole() {
  const { profile } = useAuth()
  const role = (profile?.role || 'member') as UserRole

  return {
    role,
    isAdmin: isAdmin(role),
    isBoardMember: role === 'board_member',
    isAdminOrBoard: isAdminOrBoard(role),
    isAdminOrLeader: isAdminOrBoard(role),
    isCommitteeMember: role === 'committee_member',
    isMember: role === 'member',
    isClubCoreMember: isClubCoreMember(role),
    canAccessCamera: canAccessCamera(role),
    hasPermission: (requiredRole: UserRole) => hasPermission(role, requiredRole),
    isActive: profile?.is_active ?? false,
  }
}
