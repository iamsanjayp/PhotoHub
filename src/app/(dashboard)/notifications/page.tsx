'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markAsRead, markAllAsRead } from '@/actions/notifications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { Bell, ClipboardList, CheckCircle2, XCircle, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  // Query notifications
  const { data: result, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await getNotifications()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const notifications = result || []
  const hasUnread = notifications.some((n) => !n.is_read)

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await markAllAsRead()
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update notifications')
    }
  })

  // Mark single as read mutation
  const markSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await markAsRead(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update notification')
    }
  })

  // Helper to resolve icon & styling based on type
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'assignment':
        return { icon: ClipboardList, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
      case 'approval':
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20' }
      case 'rejection':
        return { icon: XCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20' }
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' }
      default:
        return { icon: Bell, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-7 w-7 text-cyan-400" />
            Notifications
          </h1>
          <p className="text-neutral-400 text-sm">
            Stay updated on your registrations, moderation outcomes, and assignments.
          </p>
        </div>

        {hasUnread && (
          <Button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            variant="outline"
            className="border-white/10 hover:bg-white/5 hover:text-white rounded-xl text-xs gap-1.5 h-9"
          >
            {markAllMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 text-cyan-400" />
            )}
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <Card key={idx} className="border-white/5 bg-black/40 p-4">
              <Skeleton className="h-4 w-1/4 bg-neutral-800 mb-2" />
              <Skeleton className="h-10 w-full bg-neutral-800" />
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          You have no notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const config = getNotificationConfig(n.type)
            const Icon = config.icon

            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markSingleMutation.mutate(n.id)}
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-2xl transition-all duration-200 select-none bg-black/40 backdrop-blur-xl border-white/5",
                  !n.is_read ? "border-cyan-500/10 cursor-pointer bg-gradient-to-r from-black via-black to-[#0E1719]" : "opacity-75"
                )}
              >
                {/* Icon box */}
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", config.color)}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className={cn("text-sm font-bold text-white", !n.is_read ? "" : "text-neutral-300")}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium shrink-0">
                      {format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                  
                  {n.message && (
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {n.message}
                    </p>
                  )}
                </div>

                {/* Dot for unread */}
                {!n.is_read && (
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0 self-center animate-pulse" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
