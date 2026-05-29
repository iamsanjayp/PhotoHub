'use client'

import { useState, useTransition } from 'react'
import { createSubmission } from '@/actions/submissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CldUploadWidget } from 'next-cloudinary'
import { Loader2, CheckCircle2, Image as ImageIcon, Link2, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SubmissionFormProps {
  submittableType: 'event' | 'challenge' | 'apex'
  submittableId: string
  submissionMode: 'image' | 'text' | 'link' | 'drive_link'
  existingSubmission: any | null
}

export default function SubmissionForm({
  submittableType,
  submittableId,
  submissionMode,
  existingSubmission,
}: SubmissionFormProps) {
  const [submission, setSubmission] = useState(existingSubmission)
  const [caption, setCaption] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleUploadSuccess = (result: any) => {
    const info = result.info
    if (info && typeof info === 'object' && 'secure_url' in info) {
      setContentUrl(info.secure_url)
      toast.success('Media uploaded successfully!')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submissionMode === 'image' && !contentUrl) {
      toast.error('Please upload an image first.')
      return
    }

    if ((submissionMode === 'link' || submissionMode === 'drive_link') && !externalLink) {
      toast.error('Please enter a link.')
      return
    }

    if (submissionMode === 'text' && !caption) {
      toast.error('Please enter your text entry.')
      return
    }

    startTransition(async () => {
      const result = await createSubmission({
        submittable_type: submittableType,
        submittable_id: submittableId,
        content_type: submissionMode,
        content_url: submissionMode === 'image' ? contentUrl : null,
        caption: submissionMode === 'text' ? null : caption, // Use caption for image/link caption, otherwise use text entry in caption or content_url
        external_link: ['link', 'drive_link'].includes(submissionMode) ? externalLink : null,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmission(result.data)
        toast.success('Submission received successfully!')
      }
    })
  }

  // If already submitted, show the submission summary and moderation feedback
  if (submission) {
    const statusStyles: Record<string, string> = {
      pending: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-500',
      approved: 'border-green-500/20 bg-green-500/5 text-green-500',
      rejected: 'border-red-500/20 bg-red-500/5 text-red-500',
      winner: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
    }

    return (
      <Card className="border-white/5 bg-black/20 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-bold text-white">Your Submission</h3>
            <p className="text-xs text-neutral-400">Submitted on {new Date(submission.created_at).toLocaleDateString()}</p>
          </div>
          <span className={cn(
            "border px-3 py-1 rounded-full text-xs font-bold capitalize w-fit",
            statusStyles[submission.status] || statusStyles.pending
          )}>
            {submission.status}
          </span>
        </div>

        {/* Display Content based on mode */}
        <div className="space-y-4">
          {submission.content_type === 'image' && submission.content_url && (
            <div className="relative aspect-video max-h-72 w-fit bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden mx-auto">
              <img src={submission.content_url} alt="Submission" className="h-full w-full object-contain" />
            </div>
          )}

          {submission.content_type === 'text' && (
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-sm text-neutral-200 whitespace-pre-line leading-relaxed">
              {submission.caption}
            </div>
          )}

          {['link', 'drive_link'].includes(submission.content_type) && submission.external_link && (
            <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-sm text-neutral-200">
              <Link2 className="h-5 w-5 text-cyan-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-neutral-500 block uppercase font-bold tracking-wider">Submission Link</span>
                <a href={submission.external_link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate block">
                  {submission.external_link}
                </a>
              </div>
            </div>
          )}

          {/* Caption */}
          {submission.content_type !== 'text' && submission.caption && (
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Caption</span>
              <p className="text-sm text-neutral-300 italic">"{submission.caption}"</p>
            </div>
          )}
        </div>

        {/* Feedback Section (if scored or feedback exists) */}
        {(submission.score !== null || submission.feedback) && (
          <div className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Evaluator Feedback
            </h4>
            {submission.score !== null && (
              <p className="text-sm font-bold text-white">
                Score: <span className="text-cyan-400">{submission.score} / 100</span>
              </p>
            )}
            {submission.feedback && (
              <p className="text-xs text-neutral-300 leading-relaxed italic">
                "{submission.feedback}"
              </p>
            )}
          </div>
        )}
      </Card>
    )
  }

  // Render the submission form based on mode
  return (
    <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white">Submit Entry</CardTitle>
        <CardDescription className="text-xs text-neutral-400">
          Submit your work for evaluation. You can only submit once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Submission Mode Specific Fields */}
          {submissionMode === 'image' && (
            <div className="space-y-3">
              <Label className="text-neutral-300 font-semibold text-xs">Image Upload</Label>
              {contentUrl ? (
                <div className="relative aspect-video max-h-56 bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                  <img src={contentUrl} alt="Preview" className="h-full w-full object-contain" />
                  <Button
                    type="button"
                    onClick={() => setContentUrl('')}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 rounded-lg text-xs"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <CldUploadWidget
                  uploadPreset="photohub_unsigned"
                  onSuccess={handleUploadSuccess}
                  onClose={() => {
                    document.body.style.overflow = '';
                    document.body.style.pointerEvents = '';
                  }}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      className="w-full h-32 border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-all select-none"
                    >
                      <ImageIcon className="h-8 w-8 text-neutral-600" />
                      <span className="text-xs font-semibold">Click to upload your photograph</span>
                      <span className="text-[10px] text-neutral-500">Max size: 10MB (JPEG, PNG)</span>
                    </button>
                  )}
                </CldUploadWidget>
              )}
            </div>
          )}

          {/* Text entry mode */}
          {submissionMode === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="text_entry" className="text-neutral-300 font-semibold text-xs">Write your Entry</Label>
              <Textarea
                id="text_entry"
                placeholder="Write your submission text here..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-sm"
              />
            </div>
          )}

          {/* Link and Drive Link modes */}
          {['link', 'drive_link'].includes(submissionMode) && (
            <div className="space-y-2">
              <Label htmlFor="external_link" className="text-neutral-300 font-semibold text-xs">
                {submissionMode === 'drive_link' ? 'Google Drive Link' : 'Submission Link'}
              </Label>
              <Input
                id="external_link"
                placeholder={submissionMode === 'drive_link' ? 'https://drive.google.com/...' : 'https://...'}
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-10"
              />
              <p className="text-[10px] text-neutral-500 flex items-start gap-1 p-1">
                <AlertTriangle className="h-3 w-3 text-cyan-500 shrink-0 mt-0.5" />
                <span>Make sure sharing permissions are set to "Anyone with the link can view".</span>
              </p>
            </div>
          )}

          {/* Caption for image/link/drive mode */}
          {submissionMode !== 'text' && (
            <div className="space-y-2">
              <Label htmlFor="caption" className="text-neutral-300 font-semibold text-xs">Caption / Notes</Label>
              <Textarea
                id="caption"
                placeholder="Add a caption or notes for the reviewer..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-xs"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl text-xs flex items-center justify-center gap-2 mt-4"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Entry...
              </>
            ) : (
              'Submit Entry'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
