'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createApexRequestSchema, type CreateApexRequestInput } from '@/lib/validators/apex'
import { createApexRequest } from '@/actions/apex'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Video, Layers, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function ApexRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<any>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(createApexRequestSchema),
    defaultValues: {
      coverage_type: 'both',
      department: '',
      contact_phone: '',
      venue: '',
      event_time: '',
      end_time: '',
      notes: '',
    },
  })

  const selectedCoverage = watch('coverage_type')

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setSubmitError(null)

    const result = await createApexRequest(data)
    setIsSubmitting(false)

    if (result.error) {
      setSubmitError(result.error)
    } else {
      setSuccessData(result.data)
    }
  }

  const coverageOptions = [
    { value: 'photography', label: 'Photography Only', icon: Camera, desc: 'Professional high-res stills' },
    { value: 'videography', label: 'Videography Only', icon: Video, desc: 'Event highlight reel & footage' },
    { value: 'both', label: 'Both Stills & Video', icon: Layers, desc: 'Complete coverage team' },
  ] as const

  if (successData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto text-center"
      >
        <Card className="border-cyan-500/20 bg-black/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/10 p-6 md:p-8">
          <CardContent className="space-y-6 pt-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-extrabold text-white">Request Submitted!</CardTitle>
              <CardDescription className="text-sm text-neutral-400">
                Your APEX coverage request has been recorded and is currently pending review.
              </CardDescription>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-left space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-neutral-500 font-medium">Event Name</span>
                <span className="text-white font-bold">{successData.event_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-neutral-500 font-medium">Date</span>
                <span className="text-white font-semibold">{successData.event_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Reference ID</span>
                <span className="font-mono text-cyan-400 font-semibold select-all">{successData.id}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              A confirmation update will be sent to <span className="text-neutral-300 font-medium">{successData.contact_email}</span> once approved and staffed.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl px-6">
                <Link href="/">
                  Back to Homepage
                </Link>
              </Button>
              <Button onClick={() => setSuccessData(null)} variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl text-white">
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/5">
      <CardHeader className="border-b border-white/5 pb-6">
        <CardTitle className="text-2xl md:text-3xl font-extrabold text-white">Request Media Coverage</CardTitle>
        <CardDescription className="text-sm text-neutral-400">
          Book the Photography Club (APEX team) to cover your college event.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Submission failed:</span> {submitError}
              </div>
            </div>
          )}

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">1. Event Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_name" className="text-neutral-300 font-semibold text-xs">Event Name <span className="text-red-500">*</span></Label>
                <Input
                  id="event_name"
                  placeholder="e.g. National Cyber Symposium 2026"
                  className={cn("border-white/5 bg-white/[0.02] text-white rounded-xl focus:border-cyan-500/30", errors.event_name && "border-red-500/50")}
                  {...register('event_name')}
                />
                {errors.event_name && <p className="text-xs text-red-400">{String(errors.event_name.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-neutral-300 font-semibold text-xs">Department / Organizing Club</Label>
                <Input
                  id="department"
                  placeholder="e.g. Information Technology"
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl"
                  {...register('department')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date" className="text-neutral-300 font-semibold text-xs">Event Date <span className="text-red-500">*</span></Label>
                <Input
                  id="event_date"
                  type="date"
                  className={cn("border-white/5 bg-white/[0.02] text-white rounded-xl select-none", errors.event_date && "border-red-500/50")}
                  {...register('event_date')}
                />
                {errors.event_date && <p className="text-xs text-red-400">{String(errors.event_date.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue" className="text-neutral-300 font-semibold text-xs">Venue</Label>
                <Input
                  id="venue"
                  placeholder="e.g. Main Auditorium"
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl"
                  {...register('venue')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_time" className="text-neutral-300 font-semibold text-xs">Start Time</Label>
                <Input
                  id="event_time"
                  type="time"
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl"
                  {...register('event_time')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-neutral-300 font-semibold text-xs">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl"
                  {...register('end_time')}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">2. Contact Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizer_name" className="text-neutral-300 font-semibold text-xs">Contact Person Name <span className="text-red-500">*</span></Label>
                <Input
                  id="organizer_name"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className={cn("border-white/5 bg-white/[0.02] text-white rounded-xl", errors.organizer_name && "border-red-500/50")}
                  {...register('organizer_name')}
                />
                {errors.organizer_name && <p className="text-xs text-red-400">{String(errors.organizer_name.message)}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="text-neutral-300 font-semibold text-xs">Contact Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="organizer@bitsathy.ac.in"
                    className={cn("border-white/5 bg-white/[0.02] text-white rounded-xl", errors.contact_email && "border-red-500/50")}
                    {...register('contact_email')}
                  />
                  {errors.contact_email && <p className="text-xs text-red-400">{String(errors.contact_email.message)}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-neutral-300 font-semibold text-xs">Contact Phone Number</Label>
              <Input
                id="contact_phone"
                placeholder="e.g. +91 9876543210"
                className="border-white/5 bg-white/[0.02] text-white rounded-xl"
                {...register('contact_phone')}
              />
            </div>
          </div>

          {/* Coverage Selection */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">3. Coverage Options</h3>
              <p className="text-xs text-neutral-500">Select what media support you need.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {coverageOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = selectedCoverage === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('coverage_type', opt.value)}
                    className={cn(
                      'flex flex-col items-center text-center p-4 border rounded-2xl transition-all duration-200 outline-none select-none',
                      isSelected 
                        ? 'border-cyan-500/40 bg-cyan-500/5 text-cyan-400' 
                        : 'border-white/5 bg-white/[0.01] text-neutral-400 hover:bg-white/[0.02] hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-6 w-6 mb-2', isSelected ? 'text-cyan-400' : 'text-neutral-500')} />
                    <span className="text-xs font-bold text-white block mb-0.5">{opt.label}</span>
                    <span className="text-[10px] text-neutral-500">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <Label htmlFor="notes" className="text-neutral-300 font-semibold text-xs">Special Instructions / Brief Description</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Chief guest arrives at 10 AM, need group photo at 12 PM, videography needed for the project expo session."
              rows={4}
              className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 focus-visible:ring-cyan-500/50"
              {...register('notes')}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              'Submit Coverage Request'
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
