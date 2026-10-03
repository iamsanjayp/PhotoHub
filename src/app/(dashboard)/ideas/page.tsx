'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  submitShootIdea,
  getShootIdeas,
  reviewShootIdea,
} from '@/actions/shoots'
import { isAdminOrBoard, ROLE_LABELS } from '@/lib/constants/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Lightbulb,
  Plus,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Film,
  Award,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

const CATEGORIES = [
  'Short Film',
  'Cinematic Reel',
  'Campus Spotlight',
  'Documentary',
  'Creative Portrait Series',
  'Music Video',
  'Commercial / Promo',
  'Experimental Concept',
]

export default function IdeasPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'mine'>('all')
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [reviewingIdea, setReviewingIdea] = useState<any | null>(null)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved')
  const [reviewNotes, setReviewNotes] = useState('')
  const [awardPoints, setAwardPoints] = useState('20')

  // Submit form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Short Film')
  const [description, setDescription] = useState('')
  const [referenceLinks, setReferenceLinks] = useState('')

  const isLeader = profile ? isAdminOrBoard(profile.role) : false

  // Fetch all ideas
  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['shoot-ideas'],
    queryFn: async () => {
      const res = await getShootIdeas()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile,
  })

  // Submit Mutation
  const submitIdeaMutation = useMutation({
    mutationFn: async () => {
      const res = await submitShootIdea({
        title,
        description,
        category,
        reference_links: referenceLinks,
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success('Your shoot idea has been submitted for review!')
      setIsSubmitOpen(false)
      setTitle('')
      setDescription('')
      setReferenceLinks('')
      queryClient.invalidateQueries({ queryKey: ['shoot-ideas'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit idea')
    },
  })

  // Review Mutation (Approve / Reject)
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewingIdea) return
      const pts = parseInt(awardPoints, 10) || 20
      const res = await reviewShootIdea(reviewingIdea.id, {
        status: reviewAction,
        review_notes: reviewNotes,
        points: pts,
      })
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      if (reviewAction === 'approved') {
        toast.success('Idea approved! Added to PH Shoots and points awarded.')
      } else {
        toast.success('Idea status updated.')
      }
      setReviewingIdea(null)
      setReviewNotes('')
      queryClient.invalidateQueries({ queryKey: ['shoot-ideas'] })
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to review idea')
    },
  })

  // Filter ideas
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea: any) => {
      if (activeTab === 'approved') return idea.status === 'approved'
      if (activeTab === 'pending') return idea.status === 'pending'
      if (activeTab === 'mine') return idea.created_by === profile?.id
      return true
    })
  }, [ideas, activeTab, profile])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-cyan-500/5 to-purple-500/10 border border-neutral-200 dark:border-white/10 p-6 sm:p-8 backdrop-blur-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Creative Incubator
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Shoot & Film Idea Submissions
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Have a bold visual concept, cinematic short film, portrait series, or campus story? Pitch your idea here. Approved ideas get awarded leadership points and greenlit into full PhotoHub shoots!
            </p>
          </div>

          <Button
            onClick={() => setIsSubmitOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold gap-2 shadow-lg shadow-amber-500/20 rounded-2xl h-12 px-6 self-start sm:self-center shrink-0"
          >
            <Plus className="h-5 w-5" />
            Submit Your Idea
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
            <TabsTrigger value="all" className="font-semibold text-xs sm:text-sm">
              All Ideas ({ideas.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="font-semibold text-xs sm:text-sm">
              Approved ({ideas.filter((i: any) => i.status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="font-semibold text-xs sm:text-sm">
              Under Review ({ideas.filter((i: any) => i.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="font-semibold text-xs sm:text-sm">
              My Submissions ({ideas.filter((i: any) => i.created_by === profile?.id).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ideas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-3xl bg-neutral-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-200 dark:border-white/10 rounded-3xl">
          <Lightbulb className="h-12 w-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No ideas in this section</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            Be the first to pitch an exciting concept for the team to produce.
          </p>
          <Button
            onClick={() => setIsSubmitOpen(true)}
            variant="outline"
            className="mt-4 rounded-xl border-neutral-200 dark:border-white/10 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" /> Pitch an Idea
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea: any) => {
            const isApproved = idea.status === 'approved'
            const isRejected = idea.status === 'rejected'
            const isPending = idea.status === 'pending'
            const isOwner = idea.created_by === profile?.id

            return (
              <Card
                key={idea.id}
                className="bg-card/40 backdrop-blur-md border-neutral-200 dark:border-white/10 hover:border-amber-500/30 transition-all rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm group"
              >
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/5 text-[11px] font-medium">
                      {idea.category || 'Creative'}
                    </Badge>

                    {isApproved && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-bold gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Approved & Greenlit
                      </Badge>
                    )}
                    {isPending && (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px] font-bold gap-1">
                        <Clock className="h-3 w-3" /> Under Review
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[11px] font-bold gap-1">
                        <XCircle className="h-3 w-3" /> Declined
                      </Badge>
                    )}
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                      {idea.title}
                    </CardTitle>
                    <p className="text-xs text-neutral-400 mt-1">
                      Submitted on {format(new Date(idea.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-4 leading-relaxed whitespace-pre-line">
                    {idea.description}
                  </p>

                  {/* Reference Links */}
                  {idea.reference_links && (
                    <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 text-xs">
                      <div className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 mb-1">
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" /> Reference Links:
                      </div>
                      <p className="text-neutral-500 dark:text-neutral-400 truncate">
                        {idea.reference_links.split('\n')[0]}
                      </p>
                    </div>
                  )}

                  {/* Review feedback note if provided */}
                  {idea.review_notes && (
                    <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-xs space-y-1">
                      <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> Reviewer Notes:
                      </div>
                      <p className="text-neutral-500 dark:text-neutral-400">{idea.review_notes}</p>
                    </div>
                  )}

                  {/* Submitter & Actions footer */}
                  <div className="pt-3 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={idea.profiles?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {idea.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                          {idea.profiles?.full_name || 'Member'}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {idea.profiles?.roll_number ? `${idea.profiles.roll_number} • ` : ''}
                          {ROLE_LABELS[idea.profiles?.role as keyof typeof ROLE_LABELS] || idea.profiles?.role}
                        </p>
                      </div>
                    </div>

                    {/* Admin Review Action */}
                    {isLeader && isPending ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewingIdea(idea)
                          setReviewAction('approved')
                          setReviewNotes('')
                        }}
                        className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm"
                      >
                        Review Idea
                      </Button>
                    ) : isApproved ? (
                      <Link href="/shoots">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1"
                        >
                          View Shoot <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Submit Idea Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Pitch a Shoot Idea
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Submit a creative concept for video shoots, films, or photo series. Approved ideas are greenlit into PH Shoots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-title" className="text-xs font-semibold">
                Idea Title *
              </Label>
              <Input
                id="i-title"
                placeholder="e.g. Cyberpunk Night Walk - Neon Portrait Reel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="i-category" className="text-xs font-semibold">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="i-category" className="rounded-xl text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="i-desc" className="text-xs font-semibold">
                Concept & Description *
              </Label>
              <Textarea
                id="i-desc"
                placeholder="Explain the vision, mood, locations, storyline, and why this would look amazing..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="i-ref" className="text-xs font-semibold">
                Reference Links (Optional)
              </Label>
              <Input
                id="i-ref"
                placeholder="YouTube video, Pinterest board, or Instagram reel link"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsSubmitOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitIdeaMutation.mutate()}
              disabled={submitIdeaMutation.isPending || !title || !description}
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {submitIdeaMutation.isPending ? 'Submitting...' : 'Submit Idea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Idea Dialog (Admin/Board Member only) */}
      <Dialog open={!!reviewingIdea} onOpenChange={(open) => !open && setReviewingIdea(null)}>
        <DialogContent className="max-w-lg rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Review Shoot Idea
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Approve to greenlight this into a PH Shoot project and award points, or provide feedback.
            </DialogDescription>
          </DialogHeader>

          {reviewingIdea && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                <p className="font-bold text-sm text-neutral-900 dark:text-white">{reviewingIdea.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{reviewingIdea.category}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-3">
                  {reviewingIdea.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Decision</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={reviewAction === 'approved' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('approved')}
                    className={`rounded-xl text-xs font-bold gap-2 ${
                      reviewAction === 'approved' ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400' : ''
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Greenlight
                  </Button>
                  <Button
                    type="button"
                    variant={reviewAction === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('rejected')}
                    className={`rounded-xl text-xs font-bold gap-2 ${
                      reviewAction === 'rejected' ? 'bg-rose-500 text-white hover:bg-rose-400' : ''
                    }`}
                  >
                    <XCircle className="h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>

              {reviewAction === 'approved' && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-pts" className="text-xs font-semibold flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" /> Points to Award Submitter
                  </Label>
                  <Input
                    id="r-pts"
                    type="number"
                    value={awardPoints}
                    onChange={(e) => setAwardPoints(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-emerald-500 font-medium">
                    Approving automatically creates a project in PH Shoots for crew assignments!
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="r-notes" className="text-xs font-semibold">
                  Review Notes / Feedback (Optional)
                </Label>
                <Textarea
                  id="r-notes"
                  placeholder="Notes for the submitter and production crew..."
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="rounded-xl resize-none text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setReviewingIdea(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className={`rounded-xl text-xs font-bold ${
                reviewAction === 'approved'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {reviewMutation.isPending ? 'Saving...' : 'Confirm Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
