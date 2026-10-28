'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { updateProfile } from '@/actions/members'
import { parseStudentEmail } from '@/lib/student-email'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, UserCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export function CompleteProfilePrompt() {
  const { profile, refreshProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [fullName, setFullName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [batch, setBatch] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!profile) return

    // Criteria for incomplete profile:
    // Missing phone number, roll number, department, or batch
    const isIncomplete =
      !profile.phone ||
      !profile.roll_number ||
      !profile.department ||
      !profile.batch

    const isDismissed = typeof window !== 'undefined' && sessionStorage.getItem('dismissed_profile_prompt') === 'true'

    if (isIncomplete && !isDismissed) {
      const parsed = parseStudentEmail(profile.email)
      setFullName(profile.full_name || parsed?.name || '')
      setRollNumber(profile.roll_number || '')
      setPhone(profile.phone || '')
      setDepartment(profile.department || parsed?.department || '')
      setBatch(profile.batch || parsed?.batch || '')
      setBio(profile.bio || '')
      setIsOpen(true)
    }
  }, [profile])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dismissed_profile_prompt', 'true')
    }
    setIsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (!rollNumber.trim()) {
      toast.error('Please enter your student roll number')
      return
    }
    if (!phone.trim()) {
      toast.error('Please provide a contact phone number')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await updateProfile({
        full_name: fullName.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        phone: phone.trim(),
        department: department.trim().toUpperCase() || null,
        batch: batch.trim() || null,
        bio: bio.trim() || null,
      })

      if (res.error) {
        throw new Error(res.error)
      }

      toast.success('Profile completed successfully! Welcome to PhotoHub.')
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('dismissed_profile_prompt')
      }
      setIsOpen(false)

      if (res.data) {
        await refreshProfile(res.data)
      } else {
        await refreshProfile()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl bg-card border border-cyan-500/30 p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Complete Your Profile
              </DialogTitle>
              <Badge className="bg-cyan-500/15 text-cyan-300 border-none text-[10px] font-bold uppercase">
                Student Onboarding
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-neutral-400 leading-relaxed">
            Please verify your department, roll number, and phone number so club leads can assign gear, log event attendance, and coordinate shoots.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-300">Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sanjay P"
              required
              className="rounded-xl text-xs sm:text-sm h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">Roll Number *</Label>
              <Input
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 7376241CS101"
                required
                className="rounded-xl text-xs sm:text-sm h-10 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                className="rounded-xl text-xs sm:text-sm h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">
                Department
                <span className="text-[10px] text-cyan-400 ml-1">(From Email)</span>
              </Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. CS"
                className="rounded-xl text-xs sm:text-sm h-10 uppercase font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">
                Batch / Year
                <span className="text-[10px] text-cyan-400 ml-1">(From Email)</span>
              </Label>
              <Input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. 2024"
                className="rounded-xl text-xs sm:text-sm h-10 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-300">Bio / Photography Interests</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Street photography enthusiast, Sony Alpha shooter, color grading."
              rows={2}
              className="rounded-xl text-xs sm:text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
            >
              Remind Me Later
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs px-5 shadow-lg shadow-cyan-500/20"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save & Complete Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
