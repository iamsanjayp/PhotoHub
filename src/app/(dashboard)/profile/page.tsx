'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile } from '@/actions/members'
import { getUserSubmissions } from '@/actions/submissions'
import { getPointsLog } from '@/actions/leaderboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, Award, Calendar, FileText, CheckCircle, Settings, User } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [batch, setBatch] = useState(profile?.batch || '')
  const [department, setDepartment] = useState(profile?.department || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [skills, setSkills] = useState(profile?.skills?.join(', ') || '')

  // Queries
  const { data: submissionsResult, isLoading: loadingSubs } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const res = await getUserSubmissions()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile,
    refetchOnWindowFocus: false,
  })

  const { data: logsResult, isLoading: loadingLogs } = useQuery({
    queryKey: ['my-points-log'],
    queryFn: async () => {
      const res = await getPointsLog()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile,
    refetchOnWindowFocus: false,
  })

  const submissions = submissionsResult || []
  const pointsLog = logsResult || []

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await updateProfile(data)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: async () => {
      await refreshProfile()
      setIsEditing(false)
      toast.success('Profile updated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile')
    }
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    const skillsArray = skills
      ? skills.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    updateMutation.mutate({
      full_name: fullName || null,
      phone: phone || null,
      batch: batch || null,
      department: department || null,
      bio: bio || null,
      skills: skillsArray.length > 0 ? skillsArray : null,
    })
  }

  if (!profile) return null

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <User className="h-7 w-7 text-cyan-400" />
          My Profile
        </h1>
        <p className="text-neutral-400 text-sm">
          Manage your personal details, view point histories, and track your challenge submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden text-center relative p-6">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="space-y-4 pt-6">
              <Avatar className="h-24 w-24 mx-auto ring-4 ring-cyan-500/20 ring-offset-4 ring-offset-[#0A0A0A]">
                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-neutral-800 text-white text-2xl font-bold">
                  {profile.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white leading-none">
                  {profile.full_name || 'Photography Member'}
                </h3>
                <p className="text-xs text-neutral-500">{profile.email}</p>
                <div className="pt-2">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-none capitalize text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {profile.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {profile.bio && (
                <p className="text-xs text-neutral-400 italic max-w-xs mx-auto leading-relaxed border-t border-white/5 pt-3">
                  "{profile.bio}"
                </p>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-white/5 hover:bg-white/5 text-neutral-300 text-[9px] font-semibold rounded-md border-white/5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit Form or History Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Edit Profile Details</CardTitle>
                <CardDescription className="text-xs text-neutral-400">Update your public credentials for club directories.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-neutral-300 font-semibold text-xs">Full Name</Label>
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-neutral-300 font-semibold text-xs">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch" className="text-neutral-300 font-semibold text-xs">Batch Year</Label>
                      <Input
                        id="batch"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        placeholder="e.g. 2024"
                        className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-neutral-300 font-semibold text-xs">Department</Label>
                      <Input
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills" className="text-neutral-300 font-semibold text-xs">Skills (Comma-separated)</Label>
                    <Input
                      id="skills"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g. Lightroom, Wildlife Photography, Drone"
                      className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-neutral-300 font-semibold text-xs">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Tell us about yourself..."
                      className="border-white/5 bg-white/[0.02] text-white rounded-xl placeholder-neutral-600 text-sm focus-visible:ring-cyan-500/50"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl text-white text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl text-xs flex items-center gap-1.5 h-9 px-5">
                      {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save Details
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="submissions" className="w-full">
              <TabsList className="bg-white/[0.02] border border-white/5 h-11 p-1 rounded-xl w-full sm:w-auto">
                <TabsTrigger value="submissions" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-1 sm:flex-initial">
                  Submissions ({submissions.length})
                </TabsTrigger>
                <TabsTrigger value="points" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-1 sm:flex-initial">
                  Points History ({pointsLog.length})
                </TabsTrigger>
              </TabsList>

              {/* Submissions tab content */}
              <TabsContent value="submissions" className="pt-4 space-y-4">
                {loadingSubs ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, idx) => (
                      <Skeleton key={idx} className="h-14 w-full bg-neutral-900 rounded-xl" />
                    ))}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center text-neutral-500 bg-white/[0.005]">
                    No submission entries found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub: any) => (
                      <Card key={sub.id} className="border-white/5 bg-black/20 rounded-xl p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                              {sub.submittable_type} submission
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {sub.events?.title || sub.challenges?.title || 'APEX Deliverable'}
                            </h4>
                            <p className="text-[10px] text-neutral-500">
                              Submitted on {format(new Date(sub.created_at), 'dd MMM yyyy')}
                            </p>
                          </div>
                          
                          <div className="text-right space-y-1 shrink-0">
                            <Badge className={cn(
                              "border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                              sub.status === 'winner' && 'bg-cyan-500 text-black',
                              sub.status === 'approved' && 'bg-green-500/10 text-green-500',
                              sub.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                              sub.status === 'rejected' && 'bg-red-500/10 text-red-500'
                            )}>
                              {sub.status}
                            </Badge>
                            {sub.score !== null && (
                              <p className="text-xs font-extrabold text-white mt-1">
                                {sub.score} / 100
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Points History tab content */}
              <TabsContent value="points" className="pt-4 space-y-4">
                {loadingLogs ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, idx) => (
                      <Skeleton key={idx} className="h-12 w-full bg-neutral-900 rounded-xl" />
                    ))}
                  </div>
                ) : pointsLog.length === 0 ? (
                  <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center text-neutral-500 bg-white/[0.005]">
                    No points have been awarded to you yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pointsLog.map((log: any) => (
                      <div 
                        key={log.id} 
                        className="flex justify-between items-center p-3 border border-white/5 bg-black/20 rounded-xl"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-white leading-none">{log.reason}</p>
                          <span className="text-[10px] text-neutral-500 capitalize">
                            Source: {log.source_type.replace('_', ' ')}
                            {log.profiles?.full_name ? ` • By ${log.profiles.full_name}` : ''}
                          </span>
                        </div>
                        <span className={cn(
                          "text-sm font-black pr-2 shrink-0",
                          log.points >= 0 ? "text-cyan-400" : "text-red-400"
                        )}>
                          {log.points >= 0 ? `+${log.points}` : log.points} PTS
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}

function Shield(props: any) {
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
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
    </svg>
  )
}
