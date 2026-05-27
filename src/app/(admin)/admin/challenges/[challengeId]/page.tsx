'use client'

import { use, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { getChallengeById } from '@/actions/challenges'
import { getSubmissions, updateSubmissionStatus, scoreSubmission } from '@/actions/submissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Award,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Star,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminChallengeDetailPage({
  params,
}: {
  params: Promise<{ challengeId: string }>
}) {
  const { challengeId } = use(params)

  const queryClient = useQueryClient()
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [scoreValue, setScoreValue] = useState('')
  const [feedbackValue, setFeedbackValue] = useState('')

  // Fetch challenge details
  const { data: challengeRes, isLoading: challengeLoading } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => getChallengeById(challengeId),
  })

  // Fetch submissions
  const { data: submissionsRes, isLoading: submissionsLoading } = useQuery({
    queryKey: ['challenge-submissions', challengeId],
    queryFn: () => getSubmissions('challenge', challengeId),
  })

  const challenge = challengeRes?.data
  const submissions = submissionsRes?.data || []

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      updateSubmissionStatus(id, status),
    onSuccess: (res, variables) => {
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Submission ${variables.status} successfully`)
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions', challengeId] })
    },
    onError: () => toast.error('Failed to update submission status'),
  })

  const scoreMutation = useMutation({
    mutationFn: ({ id, score, feedback }: { id: string; score: number; feedback: string }) =>
      scoreSubmission(id, score, feedback),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Submission scored successfully')
      setScoreDialogOpen(false)
      setSelectedSubmission(null)
      setScoreValue('')
      setFeedbackValue('')
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions', challengeId] })
    },
    onError: () => toast.error('Failed to score submission'),
  })

  const handleScore = () => {
    if (!selectedSubmission) return
    const score = parseInt(scoreValue)
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Score must be between 0 and 100')
      return
    }
    scoreMutation.mutate({ id: selectedSubmission.id, score, feedback: feedbackValue })
  }

  const openScoreDialog = (submission: any) => {
    setSelectedSubmission(submission)
    setScoreValue(submission.score?.toString() || '')
    setFeedbackValue(submission.feedback || '')
    setScoreDialogOpen(true)
  }

  // Stats
  const totalSubmissions = submissions.length
  const approvedCount = submissions.filter((s: any) => s.status === 'approved').length
  const pendingCount = submissions.filter((s: any) => s.status === 'pending').length
  const scoredSubmissions = submissions.filter((s: any) => s.score != null)
  const avgScore =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce((acc: number, s: any) => acc + (s.score || 0), 0) /
            scoredSubmissions.length
        )
      : 0

  const isActive = challenge ? new Date(challenge.end_date) >= new Date() : false

  if (challengeLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <XCircle className="h-16 w-16 text-neutral-600" />
        <h2 className="text-xl font-bold text-white">Challenge Not Found</h2>
        <p className="text-sm text-neutral-500">This challenge may have been deleted.</p>
        <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl mt-2">
          <Link href="/admin/challenges">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Challenges
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Back link + Title */}
      <div className="space-y-4">
        <Button
          asChild
          variant="ghost"
          className="text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl -ml-3 h-9 px-3 text-sm"
        >
          <Link href="/admin/challenges">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            All Challenges
          </Link>
        </Button>

        {/* Challenge Overview Card */}
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          {challenge.banner_url && (
            <div className="relative h-48 w-full overflow-hidden">
              <img
                src={challenge.banner_url}
                alt={challenge.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          )}
          <CardContent className={cn('p-6', challenge.banner_url && '-mt-16 relative z-10')}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {challenge.title}
                  </h1>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase py-1 px-2.5 rounded-full',
                      isActive
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                    )}
                  >
                    {isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                {challenge.theme && (
                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
                    Theme: {challenge.theme}
                  </p>
                )}
                {challenge.description && (
                  <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
                    {challenge.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 text-sm">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <span>
                    {format(new Date(challenge.start_date), 'MMM d')} –{' '}
                    {format(new Date(challenge.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Award className="h-4 w-4" />
                  {challenge.points} points
                </div>
                <div className="flex items-center gap-2 text-neutral-400 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  {challenge.submission_mode === 'drive_link'
                    ? 'Google Drive Link'
                    : `${challenge.submission_mode} upload`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-cyan-400" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white">{totalSubmissions}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total Submissions</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white">{approvedCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white">{pendingCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="h-4.5 w-4.5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white">{avgScore || '—'}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Average Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="px-6 py-5 border-b border-white/5">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cyan-400" />
            Submissions
            <span className="text-sm font-normal text-neutral-500">({totalSubmissions})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissionsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-neutral-500">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="h-12 w-12 text-neutral-700" />
              <h3 className="text-base font-bold text-white">No Submissions Yet</h3>
              <p className="text-sm text-neutral-500">No members have submitted to this challenge yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                    <th className="py-4 px-6">Member</th>
                    <th className="py-4 px-6">Submitted</th>
                    <th className="py-4 px-6">Content</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Score</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {submissions.map((submission: any) => {
                    const profile = submission.profiles
                    const initials = profile
                      ? (profile.full_name || profile.username || '?')
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : '?'

                    return (
                      <tr
                        key={submission.id}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        {/* Member */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-white/10">
                              <AvatarImage
                                src={profile?.avatar_url || ''}
                                alt={profile?.full_name || ''}
                              />
                              <AvatarFallback className="bg-neutral-800 text-neutral-400 text-xs font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate text-sm">
                                {profile?.full_name || profile?.username || 'Unknown'}
                              </p>
                              {profile?.username && profile?.full_name && (
                                <p className="text-[11px] text-neutral-500 truncate">
                                  @{profile.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6">
                          <p className="text-neutral-300 text-xs">
                            {format(new Date(submission.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-neutral-500 text-[11px]">
                            {format(new Date(submission.created_at), 'h:mm a')}
                          </p>
                        </td>

                        {/* Content Preview */}
                        <td className="py-4 px-6">
                          {submission.content_type === 'image' && submission.content_url ? (
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/5 bg-neutral-900 shrink-0">
                                <img
                                  src={submission.content_url}
                                  alt="Submission"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <ImageIcon className="h-3.5 w-3.5 text-neutral-500" />
                            </div>
                          ) : submission.external_link || submission.content_url ? (
                            <a
                              href={submission.external_link || submission.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Link
                            </a>
                          ) : submission.caption ? (
                            <p className="text-neutral-400 text-xs truncate max-w-[150px]">
                              {submission.caption}
                            </p>
                          ) : (
                            <span className="text-neutral-600 text-xs">No content</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center">
                          <StatusBadge status={submission.status} />
                        </td>

                        {/* Score */}
                        <td className="py-4 px-6 text-center">
                          {submission.score != null ? (
                            <span className="text-sm font-bold text-cyan-400">
                              {submission.score}
                              <span className="text-neutral-600 font-normal">/100</span>
                            </span>
                          ) : (
                            <span className="text-neutral-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1">
                            {submission.status !== 'approved' && (
                              <Button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: submission.id,
                                    status: 'approved',
                                  })
                                }
                                disabled={statusMutation.isPending}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400 rounded-lg text-neutral-400"
                                title="Approve"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                            )}
                            {submission.status !== 'rejected' && (
                              <Button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: submission.id,
                                    status: 'rejected',
                                  })
                                }
                                disabled={statusMutation.isPending}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-neutral-400"
                                title="Reject"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => openScoreDialog(submission)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-purple-500/10 hover:text-purple-400 rounded-lg text-neutral-400"
                              title="Score"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Dialog */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent className="!bg-neutral-950 border border-white/5 !max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-400" />
              Score Submission
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-sm">
              Enter a score from 0 to 100 and optional feedback for{' '}
              <span className="text-white font-medium">
                {selectedSubmission?.profiles?.full_name || 'this member'}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Score (0–100)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                placeholder="e.g. 85"
                className="border-white/5 bg-black/40 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Feedback (optional)
              </label>
              <textarea
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                placeholder="Great composition and use of light..."
                rows={3}
                className="w-full border border-white/5 bg-black/40 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 p-3 text-sm resize-none focus:outline-none focus:ring-0"
              />
            </div>
          </div>
          <DialogFooter className="!bg-transparent !border-t-0 !mx-0 !mb-0 !p-0 !rounded-none">
            <Button
              variant="ghost"
              onClick={() => setScoreDialogOpen(false)}
              className="text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScore}
              disabled={scoreMutation.isPending || !scoreValue}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 font-bold rounded-xl"
            >
              {scoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  }

  const { label, className } = config[status] || config.pending

  return (
    <span
      className={cn(
        'text-[10px] font-bold uppercase py-0.5 px-2 rounded-full border inline-block',
        className
      )}
    >
      {label}
    </span>
  )
}
