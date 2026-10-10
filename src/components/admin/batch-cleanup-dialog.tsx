'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DatabaseZap,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBatchStorageOverview, cleanupBatchStorage, type BatchStat } from '@/actions/batch-cleanup'
import { toast } from 'sonner'

export function BatchCleanupDialog() {
  const [open, setOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [mode, setMode] = useState<'media_only' | 'delete_all'>('media_only')
  const [deleteAccounts, setDeleteAccounts] = useState(false)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [lastResult, setLastResult] = useState<any>(null)

  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['batch-storage-overview'],
    queryFn: async () => {
      const res = await getBatchStorageOverview()
      if (res.error) throw new Error(res.error)
      return res.batches || []
    },
    enabled: open,
  })

  const batches = data || []
  const activeBatchStat = batches.find((b) => b.batch === selectedBatch)

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBatch) throw new Error('Please select a batch.')
      const res = await cleanupBatchStorage({
        batch: selectedBatch,
        mode,
        deleteAccounts: mode === 'delete_all' && deleteAccounts,
      })
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: (res) => {
      setLastResult(res)
      toast.success(
        `Batch ${selectedBatch} cleaned up! Freed ${res.filesDeletedDrive} Drive files & ${res.filesDeletedLocal} local files.`
      )
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      queryClient.invalidateQueries({ queryKey: ['batch-storage-overview'] })
      setConfirmationInput('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Cleanup operation failed.')
    },
  })

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedBatch('')
      setConfirmationInput('')
      setLastResult(null)
    }
  }

  const isConfirmed = confirmationInput.trim() === selectedBatch && selectedBatch.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white rounded-xl gap-2 font-medium"
          >
            <DatabaseZap className="h-4 w-4 text-amber-400" />
            <span>Batch Storage Cleanup</span>
          </Button>
        }
      />

      <DialogContent className="max-w-2xl bg-neutral-950 border-white/10 text-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Batch Storage Cleanup
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Purge media files or graduate records for past student batches to optimize Google Drive and server storage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
            <p className="text-xs text-neutral-400">Scanning database and storage per batch...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Step 1: Select Batch */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  1. Select Target Batch
                </Label>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="text-neutral-400 hover:text-white text-xs h-6 gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {batches.map((b) => {
                  const isSelected = selectedBatch === b.batch
                  return (
                    <button
                      key={b.batch}
                      type="button"
                      onClick={() => {
                        setSelectedBatch(b.batch)
                        setLastResult(null)
                        setConfirmationInput('')
                      }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-950/20'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white">
                          Batch {b.batch}
                        </span>
                        <Badge variant="outline" className="border-white/10 text-[10px] text-neutral-400">
                          {b.memberCount} members
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <HardDrive className="h-3 w-3 text-cyan-400" />
                        <span>{b.totalMediaFiles} storage files</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Batch Statistics Card */}
            {activeBatchStat && (
              <Card className="border-white/10 bg-black/40 rounded-xl overflow-hidden">
                <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold">Members</span>
                    <div className="text-xl font-bold text-white mt-0.5">{activeBatchStat.memberCount}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold">Feed Media</span>
                    <div className="text-xl font-bold text-white mt-0.5">{activeBatchStat.postMediaCount}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase font-semibold">Submissions</span>
                    <div className="text-xl font-bold text-white mt-0.5">{activeBatchStat.submissionCount}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 uppercase font-semibold">Total Cloud Files</span>
                    <div className="text-xl font-bold text-amber-400 mt-0.5">{activeBatchStat.totalMediaFiles}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Cleanup Mode */}
            {selectedBatch && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  2. Choose Cleanup Policy
                </Label>
                <div className="space-y-2">
                  <div
                    onClick={() => setMode('media_only')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      mode === 'media_only'
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      mode === 'media_only' ? 'border-cyan-400 bg-cyan-400' : 'border-neutral-600'
                    }`}>
                      {mode === 'media_only' && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-cyan-400" />
                        <span>Purge Media Files Only (Recommended)</span>
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-none text-[9px]">Safe</Badge>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Deletes uploaded photos & videos from Google Drive and server disk to free storage. Preserves member names, assignment logs, and attendance history in the database.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMode('delete_all')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      mode === 'delete_all'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      mode === 'delete_all' ? 'border-red-400 bg-red-400' : 'border-neutral-600'
                    }`}>
                      {mode === 'delete_all' && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-red-400 flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-400" />
                        <span>Full Purge (Media + Historical Posts & Submissions)</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Deletes all cloud media files AND deletes all associated posts, challenges submissions, and shoot logs authored by this batch.
                      </p>
                    </div>
                  </div>
                </div>

                {mode === 'delete_all' && (
                  <div className="pt-2 pl-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={deleteAccounts}
                        onCheckedChange={(c) => setDeleteAccounts(!!c)}
                      />
                      <span className="text-xs text-red-300 font-medium">
                        Also purge graduate student accounts from database (Auth & Profiles)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirmation Safeguard */}
            {selectedBatch && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Permanent Action Required</span>
                </div>
                <p className="text-xs text-neutral-300">
                  To confirm permanent deletion for <strong className="text-white">Batch {selectedBatch}</strong>, please type the batch year below:
                </p>
                <Input
                  type="text"
                  placeholder={`Type "${selectedBatch}" to confirm`}
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className="h-9 border-red-500/30 bg-black text-white text-xs focus-visible:ring-red-500"
                />
              </div>
            )}

            {/* Result summary banner */}
            {lastResult && (
              <div className="rounded-xl border border-green-500/20 bg-green-950/20 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-green-400">Cleanup Completed Successfully</p>
                  <p className="text-neutral-300">
                    Deleted <strong className="text-white">{lastResult.filesDeletedDrive}</strong> files from Google Drive and{' '}
                    <strong className="text-white">{lastResult.filesDeletedLocal}</strong> local files. Cleared{' '}
                    <strong className="text-white">{lastResult.recordsCleared}</strong> database records across{' '}
                    <strong className="text-white">{lastResult.membersAffected}</strong> batch members.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6 pt-4 border-t border-white/5 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Close
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || cleanupMutation.isPending}
            onClick={() => cleanupMutation.mutate()}
            className="text-xs font-semibold gap-2 bg-red-600 hover:bg-red-500 text-white"
          >
            {cleanupMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cleaning Up Storage...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Execute Batch Cleanup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
