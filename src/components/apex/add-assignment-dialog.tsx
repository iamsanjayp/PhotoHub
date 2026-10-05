'use client'

import { ScheduleShootDialog } from './schedule-shoot-dialog'

export interface AddAssignmentDialogProps {
  currentUser: {
    id: string
    full_name: string | null
    email: string
    role: string
    department?: string | null
    phone?: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function AddAssignmentDialog(props: AddAssignmentDialogProps) {
  return <ScheduleShootDialog {...props} />
}
