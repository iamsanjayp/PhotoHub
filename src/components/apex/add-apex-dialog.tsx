'use client'

import { useAuth } from '@/providers/auth-provider'
import { ScheduleShootDialog } from './schedule-shoot-dialog'

export interface AddApexDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: (newRequest?: any) => void
}

export function AddApexDialog({ onSuccess, ...props }: AddApexDialogProps) {
  const { profile } = useAuth()

  return (
    <ScheduleShootDialog
      currentUser={profile || undefined}
      onSuccess={() => {
        if (onSuccess) onSuccess()
      }}
      {...props}
    />
  )
}
