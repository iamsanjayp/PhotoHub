'use client'

import { useAuth } from '@/providers/auth-provider'
import { isAdminOrLeader, isAdmin, hasPermission } from '@/lib/constants/roles'
import type { UserRole } from '@/types/database'

export function useRole() {
  const { profile } = useAuth()
  const role = profile?.role || 'guest'

  return {
    role,
    isAdmin: isAdmin(role),
    isAdminOrLeader: isAdminOrLeader(role),
    isCameraHolder: role === 'camera_holder',
    isParticipant: role === 'participant',
    isGuest: role === 'guest',
    hasPermission: (requiredRole: UserRole) => hasPermission(role, requiredRole),
    isActive: profile?.is_active ?? false,
  }
}
