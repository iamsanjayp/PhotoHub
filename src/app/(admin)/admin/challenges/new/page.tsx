'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createChallenge } from '@/actions/challenges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { CldUploadWidget } from 'next-cloudinary'
import { Loader2, Image as ImageIcon, Sparkles, ChevronLeft, Trophy } from 'lucide-react'
import { toast } from 'sonner'

const challengeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(2000).optional().nullable().or(z.literal('')),
  theme: z.string().max(100).optional().nullable().or(z.literal('')),
  banner_url: z.string().url().optional().nullable().or(z.literal('')),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  points: z.number().int().min(1).default(20),
  submission_mode: z.enum(['image', 'text', 'link', 'drive_link']).default('image'),
  external_link: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
})

type ChallengeInput = z.infer<typeof challengeSchema>

export default function NewChallengePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [bannerUrl, setBannerUrl] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      description: '',
      theme: '',
      banner_url: '',
      start_date: '',
      end_date: '',
      points: 20,
      submission_mode: 'image',
      external_link: '',
    },
  })

  const handleUploadSuccess = (result: any) => {
    const info = result.info
    if (info && typeof info === 'object' && 'secure_url' in info) {
      setBannerUrl(info.secure_url)
      setValue('banner_url', info.secure_url)
      toast.success('Challenge poster uploaded!')
    }
  }

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      const formatted = {
        ...data,
        banner_url: bannerUrl || null,
        external_link: data.external_link || null,
        points: Number(data.points),
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
      }

      const res = await createChallenge(formatted)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Challenge created successfully!')
        router.push('/admin/challenges')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/challenges"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Challenges List
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <Trophy className="h-7 w-7 text-cyan-400" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Publish Challenge</h1>
        </div>
        <p className="text-neutral-400 text-sm">
          Launch a new weekly/monthly photography challenge. Winners will receive leaderboard bonus points.
        </p>
      </div>

      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden max-w-4xl mx-auto shadow-2xl">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Poster Upload */}
            <div className="space-y-2">
              <Label className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Challenge Poster Image (4:5 Aspect Ratio)</Label>
              {bannerUrl ? (
                <div className="relative aspect-[4/5] max-w-xs mx-auto w-full bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden group flex items-center justify-center">
                  <img src={bannerUrl} alt="Poster Preview" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setBannerUrl('')
                      setValue('banner_url', '')
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-white z-10"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
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
                      className="w-full aspect-[4/5] max-w-xs mx-auto border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-all select-none group"
                    >
                      <ImageIcon className="h-8 w-8 text-neutral-600 group-hover:text-cyan-400 transition-colors" />
                      <span className="text-xs font-semibold">Click to upload challenge poster</span>
                      <span className="text-[10px] text-neutral-500">Suggested ratio: 4:5. Max size: 10MB (JPEG, PNG)</span>
                    </button>
                  )}
                </CldUploadWidget>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="title" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Challenge Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Minimalist Shadows"
                  {...register('title')}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{String(errors.title.message)}</p>
                )}
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Challenge Theme</Label>
                <Input
                  id="theme"
                  placeholder="e.g. Contrast, Street, Macro"
                  {...register('theme')}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
                />
              </div>

              {/* Points */}
              <div className="space-y-2">
                <Label htmlFor="points" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Points Reward</Label>
                <Input
                  id="points"
                  type="number"
                  {...register('points', { valueAsNumber: true })}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="description" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Instructions & Guidelines</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the guidelines for the challenge..."
                  {...register('description')}
                  rows={4}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50 text-sm"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Start Date</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  {...register('start_date')}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
                />
                {errors.start_date && (
                  <p className="text-xs text-red-500 mt-1">{String(errors.start_date.message)}</p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">End Date</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  {...register('end_date')}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30 text-sm h-11"
                />
                {errors.end_date && (
                  <p className="text-xs text-red-500 mt-1">{String(errors.end_date.message)}</p>
                )}
              </div>

              {/* Submission Mode */}
              <div className="space-y-2">
                <Label htmlFor="submission_mode" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Submission Mode</Label>
                <select
                  id="submission_mode"
                  {...register('submission_mode')}
                  className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                >
                  <option value="image">Image Upload</option>
                  <option value="text">Text Entry</option>
                  <option value="link">External Link</option>
                  <option value="drive_link">Google Drive Link</option>
                </select>
              </div>

              {/* External Link */}
              <div className="space-y-2">
                <Label htmlFor="external_link" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">External Link (Optional)</Label>
                <Input
                  id="external_link"
                  type="url"
                  placeholder="e.g. Google Forms link..."
                  {...register('external_link')}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
                />
                <p className="text-[10px] text-neutral-500">Attach a Google Forms link or external submission portal.</p>
                {errors.external_link && (
                  <p className="text-xs text-red-500 mt-1">{String(errors.external_link.message)}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => router.back()}
                className="border-white/10 text-white hover:bg-white/5 rounded-xl h-11 px-6 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 px-8 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Publish Challenge
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
