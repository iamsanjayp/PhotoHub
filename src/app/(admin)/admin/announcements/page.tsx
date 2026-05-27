'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, pinAnnouncement } from '@/actions/announcements'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Megaphone, Plus, Trash2, Pin, Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [externalLink, setExternalLink] = useState('')

  // Query announcements
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await getAnnouncements(true) // include expired
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const announcements = result || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await createAnnouncement(data)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Announcement published successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to publish announcement')
    }
  })

  // Update pin mutation
  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const res = await pinAnnouncement(id, pinned)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      toast.success('Announcement pin state updated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update pin state')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteAnnouncement(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      toast.success('Announcement deleted')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete announcement')
    }
  })

  const resetForm = () => {
    setTitle('')
    setContent('')
    setIsPinned(false)
    setExpiresAt('')
    setExternalLink('')
  }

  const handleOpenAdd = () => {
    resetForm()
    setSelectedItem(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !content) {
      toast.error('Title and Content are required')
      return
    }

    const payload = {
      title,
      content,
      is_pinned: isPinned,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      external_link: externalLink || null,
    }

    createMutation.mutate(payload)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-cyan-400" />
            Announcement Manager
          </h1>
          <p className="text-neutral-400 text-sm">
            Publish, edit, pin, and archive announcements on the user dashboard notices grid.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl gap-2 shadow-md shadow-cyan-500/10 h-10"
        >
          <Plus className="h-5 w-5" />
          <span>New Notice</span>
        </Button>
      </div>

      {/* Grid Table */}
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            Published Announcements
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Total listings: {announcements.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full bg-neutral-900 rounded-lg" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No announcements published.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/5">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider pl-6">Notice</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Pinned</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Publish Date</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Expires At</TableHead>
                  <TableHead className="text-right text-neutral-500 font-bold uppercase text-[10px] tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="pl-6 max-w-sm">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white block leading-none">
                          {item.title}
                        </span>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 leading-normal">
                          {item.content}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={item.is_pinned}
                        onCheckedChange={(val) => pinMutation.mutate({ id: item.id, pinned: val })}
                        disabled={pinMutation.isPending}
                      />
                    </TableCell>

                    <TableCell className="text-xs text-neutral-400">
                      {format(new Date(item.created_at), 'dd MMM yyyy')}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-400">
                      {item.expires_at 
                        ? format(new Date(item.expires_at), 'dd MMM yyyy') 
                        : 'Never'
                      }
                    </TableCell>

                    <TableCell className="text-right pr-6 pt-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-neutral-950 border-white/5 text-neutral-200 rounded-3xl sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold text-white">Publish Club Notice</DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Write a title and notice content to post. You can highlight it by pinning.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-neutral-300 font-semibold text-xs">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Photowalk Details"
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-neutral-300 font-semibold text-xs">Content Body</Label>
                <Textarea
                  id="content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the full description and schedule..."
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl text-xs placeholder-neutral-700 focus-visible:ring-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 flex items-center justify-between border border-white/5 bg-white/[0.01] p-3 rounded-xl">
                  <Label htmlFor="pinned" className="text-neutral-300 font-semibold text-xs cursor-pointer">Pin Notice</Label>
                  <Switch
                    id="pinned"
                    checked={isPinned}
                    onCheckedChange={setIsPinned}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expires" className="text-neutral-300 font-semibold text-xs">Expires Date (Optional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-xs h-9"
                  />
                </div>

                {/* External Link */}
                <div className="space-y-2 col-span-1 sm:col-span-2">
                  <Label htmlFor="external_link" className="text-neutral-300 font-semibold text-xs">External Link (Optional)</Label>
                  <Input
                    id="external_link"
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="e.g. Google Forms link, registration URL..."
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-xs h-9 placeholder-neutral-600"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 justify-end pt-2 border-t border-white/5">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-white/10 hover:bg-white/5 rounded-xl text-xs h-10 px-5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-xl text-xs flex items-center gap-1.5 h-10 px-5"
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Publish Notice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
