'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQueueItems, schedulePost, markAsPosted, archiveFromQueue } from '@/actions/instagram-queue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { Send, Calendar, Check, Archive, Clock, ArrowRight, Loader2, Link } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function InstagramQueuePage() {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [draftCaption, setDraftCaption] = useState('')

  // Query queue items
  const { data: result, isLoading } = useQuery({
    queryKey: ['instagram-queue'],
    queryFn: async () => {
      const res = await getQueueItems()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const queueItems = result || []

  // Mutations
  const scheduleMutation = useMutation({
    mutationFn: async ({ id, date, caption }: { id: string; date: string; caption?: string | null }) => {
      const res = await schedulePost(id, date, caption)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-queue'] })
      setSelectedItem(null)
      toast.success('Post scheduled successfully!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to schedule post')
    }
  })

  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await markAsPosted(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-queue'] })
      toast.success('Post marked as posted to Instagram!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update status')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await archiveFromQueue(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-queue'] })
      toast.success('Post archived from queue')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to archive')
    }
  })

  // Separate columns
  const shortlisted = queueItems.filter((i) => i.status === 'shortlisted')
  const scheduled = queueItems.filter((i) => i.status === 'scheduled')
  const posted = queueItems.filter((i) => i.status === 'posted')

  const handleOpenSchedule = (item: any) => {
    setSelectedItem(item)
    setDraftCaption(item.caption || '')
    setScheduleDate(
      item.scheduled_for 
        ? format(new Date(item.scheduled_for), "yyyy-MM-dd'T'HH:mm") 
        : ''
    )
  }

  const submitSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleDate) {
      toast.error('Please select a schedule date and time.')
      return
    }
    scheduleMutation.mutate({
      id: selectedItem.id,
      date: new Date(scheduleDate).toISOString(),
      caption: draftCaption,
    })
  }

  const renderColumn = (title: string, items: any[], type: 'shortlisted' | 'scheduled' | 'posted') => {
    const colColors = {
      shortlisted: 'border-yellow-500/20 bg-yellow-500/[0.02]',
      scheduled: 'border-cyan-500/20 bg-cyan-500/[0.02]',
      posted: 'border-green-500/20 bg-green-500/[0.02]',
    }

    return (
      <Card className={cn("border border-white/5 bg-black/40 rounded-2xl flex flex-col h-[70vh]", colColors[type])}>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-white/5 shrink-0 bg-white/[0.005]">
          <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">{title}</CardTitle>
          <Badge className="bg-white/5 text-neutral-300 rounded-md font-extrabold">{items.length}</Badge>
        </CardHeader>
        <CardContent className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, idx) => (
                <Skeleton key={idx} className="h-28 w-full bg-neutral-900 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-neutral-600 font-medium py-10">
              No items in this stage.
            </div>
          ) : (
            items.map((item) => {
              const post = item.posts
              const media = post?.post_media?.[0]
              
              return (
                <div 
                  key={item.id} 
                  className="group relative border border-white/5 bg-neutral-900/60 p-3 rounded-xl space-y-3 flex flex-col justify-between hover:bg-neutral-900 transition-all duration-200"
                >
                  <div className="flex gap-3 items-start">
                    {/* Thumbnail */}
                    {media && media.media_type === 'image' && (
                      <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/5 shrink-0 bg-neutral-800">
                        <img src={media.url} alt="post" className="h-full w-full object-cover" />
                      </div>
                    )}
                    
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[10px] text-neutral-500 font-bold leading-none truncate">
                        By {post?.profiles?.full_name || 'Member'}
                      </p>
                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                        {item.caption || post?.caption || 'No caption'}
                      </p>
                    </div>
                  </div>

                  {/* Date details */}
                  {type === 'scheduled' && item.scheduled_for && (
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold bg-cyan-500/5 p-1.5 rounded-lg border border-cyan-500/10 w-fit">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(item.scheduled_for), 'dd MMM, hh:mm a')}</span>
                    </div>
                  )}

                  {type === 'posted' && item.posted_at && (
                    <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold bg-green-500/5 p-1.5 rounded-lg border border-green-500/10 w-fit">
                      <Check className="h-3 w-3" />
                      <span>Posted on {format(new Date(item.posted_at), 'dd MMM')}</span>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex justify-end gap-1.5 pt-2 border-t border-white/5">
                    {type === 'shortlisted' && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenSchedule(item)}
                        className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-lg h-7 text-[10px] px-2.5 gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        Schedule
                      </Button>
                    )}

                    {type === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleOpenSchedule(item)}
                          variant="ghost"
                          className="text-neutral-400 hover:text-white rounded-lg h-7 text-[10px] px-2 hover:bg-white/5"
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => postMutation.mutate(item.id)}
                          disabled={postMutation.isPending}
                          className="bg-green-500 text-black hover:bg-green-400 font-bold rounded-lg h-7 text-[10px] px-2.5 gap-1"
                        >
                          <Send className="h-3 w-3" />
                          Mark Posted
                        </Button>
                      </>
                    )}

                    {type !== 'posted' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => archiveMutation.mutate(item.id)}
                        disabled={archiveMutation.isPending}
                        className="h-7 w-7 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Send className="h-7 w-7 text-cyan-400" />
          Instagram Post Queue
        </h1>
        <p className="text-neutral-400 text-sm">
          Plan, schedule, and log posts for the club's Instagram operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderColumn('Shortlisted', shortlisted, 'shortlisted')}
        {renderColumn('Scheduled', scheduled, 'scheduled')}
        {renderColumn('Posted to IG', posted, 'posted')}
      </div>

      {/* Schedule Dialog Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(val) => !val && setSelectedItem(null)}>
        <DialogContent className="bg-neutral-950 border-white/5 text-neutral-200 rounded-3xl sm:max-w-md">
          <form onSubmit={submitSchedule} className="space-y-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold text-white">Schedule Queue Post</DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Choose the publishing date and draft final captions for Instagram copy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-neutral-300 font-semibold text-xs">Schedule Date & Time</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption" className="text-neutral-300 font-semibold text-xs">Draft Caption</Label>
                <Textarea
                  id="caption"
                  rows={4}
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl text-xs placeholder-neutral-700 focus-visible:ring-cyan-500/50"
                  placeholder="Draft final Instagram caption, hashtags, credits..."
                />
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 justify-end pt-2 border-t border-white/5">
              <Button
                type="button"
                onClick={() => setSelectedItem(null)}
                variant="outline"
                className="border-white/10 hover:bg-white/5 rounded-xl text-xs h-10 px-5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-xl text-xs flex items-center gap-1.5 h-10 px-5"
              >
                {scheduleMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
