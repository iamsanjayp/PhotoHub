'use client'

import { useState, useTransition } from 'react'
import { registerForEvent, unregisterFromEvent } from '@/actions/events'
import { Button } from '@/components/ui/button'
import { Calendar, Loader2, LogOut, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RegistrationButtonProps {
  eventId: string
  initialIsRegistered: boolean
  registrationCount: number
  maxParticipants: number | null
  deadline: string | null
}

export default function RegistrationButton({
  eventId,
  initialIsRegistered,
  registrationCount,
  maxParticipants,
  deadline,
}: RegistrationButtonProps) {
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered)
  const [count, setCount] = useState(registrationCount)
  const [isPending, startTransition] = useTransition()

  const isClosed = deadline ? new Date(deadline) < new Date() : false
  const isFull = maxParticipants ? count >= maxParticipants : false

  const handleRegister = async () => {
    startTransition(async () => {
      const result = await registerForEvent(eventId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsRegistered(true)
        setCount((prev) => prev + 1)
        toast.success('Successfully registered for the event!')
      }
    })
  }

  const handleUnregister = async () => {
    startTransition(async () => {
      const result = await unregisterFromEvent(eventId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setIsRegistered(false)
        setCount((prev) => prev - 1)
        toast.success('Registration cancelled successfully.')
      }
    })
  }

  if (isClosed && !isRegistered) {
    return (
      <Button disabled className="w-full h-12 bg-neutral-800 text-neutral-500 rounded-xl font-bold">
        Registration Closed
      </Button>
    )
  }

  if (isFull && !isRegistered) {
    return (
      <Button disabled className="w-full h-12 bg-neutral-800 text-neutral-500 rounded-xl font-bold">
        Registration Full
      </Button>
    )
  }

  return (
    <div className="space-y-2 w-full">
      {isRegistered ? (
        <Button
          onClick={handleUnregister}
          disabled={isPending}
          variant="outline"
          className="w-full h-12 border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl font-bold flex items-center justify-center gap-2 group"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          )}
          <span>Cancel Registration</span>
        </Button>
      ) : (
        <Button
          onClick={handleRegister}
          disabled={isPending}
          className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          <span>Register Now</span>
        </Button>
      )}

      {isRegistered && (
        <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold py-1">
          <CheckCircle2 className="h-4 w-4" />
          <span>You are registered for this event</span>
        </div>
      )}
    </div>
  )
}
