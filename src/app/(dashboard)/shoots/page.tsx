'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPhShoots,
  createPhShoot,
  updatePhShoot,
  assignShootCrew,
  removeShootCrew,
  respondShootAssignment,
  completePhShoot,
} from '@/actions/shoots'
import { getMembers } from '@/actions/members'
import { isClubCoreMember, isAdminOrBoard, canAccessCamera, ROLE_LABELS } from '@/lib/constants/roles'
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
  Clapperboard,
  Plus,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Camera,
  Trash2,
  Award,
  AlertTriangle,
  Send,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const COMMON_ROLES = [
  'Director',
  'Camera Operator',
  'Cinematographer (DOP)',
  'Lead Editor',
  'Assistant Editor',
  'Scriptwriter',
  'Sound Engineer',
  'Lighting Specialist',
  'Colorist',
  'Production Assistant',
  'Actor / Talent',
]

export default function ShootsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [filterTab, setFilterTab] = useState<'all' | 'planning' | 'scheduled' | 'completed' | 'my'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [assigningShoot, setAssigningShoot] = useState<any | null>(null)
  const [editingShoot, setEditingShoot] = useState<any | null>(null)
  const [completingShoot, setCompletingShoot] = useState<any | null>(null)

  // Create shoot state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [shootDate, setShootDate] = useState('')
  const [postDate, setPostDate] = useState('')

  // Crew assign state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [crewRole, setCrewRole] = useState('Director')
  const [crewNotes, setCrewNotes] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  // Complete shoot state
  const [pointsPerMember, setPointsPerMember] = useState('30')

  const isCore = profile ? isClubCoreMember(profile.role) : false
  const isLeader = profile ? isAdminOrBoard(profile.role) : false

  // Fetch all shoots
  const { data: shoots = [], isLoading } = useQuery({
    queryKey: ['ph-shoots'],
    queryFn: async () => {
      const res = await getPhShoots()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!profile,
  })

  // Fetch all members for crew assignment
  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      const res = await getMembers()
      return res.data || []
    },
    enabled: !!profile && isLeader,
  })

  // Create Shoot Mutation
  const createShootMutation = useMutation({
    mutationFn: async () => {
      const res = await createPhShoot({
        title,
        description,
        location,
        shoot_date: shootDate ? new Date(shootDate).toISOString() : undefined,
        post_date: postDate ? new Date(postDate).toISOString() : undefined,
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success('PH Shoot project created!')
      setIsCreateOpen(false)
      setTitle('')
      setDescription('')
      setLocation('')
      setShootDate('')
      setPostDate('')
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create shoot')
    },
  })

  // Update Shoot Mutation
  const updateShootMutation = useMutation({
    mutationFn: async () => {
      if (!editingShoot) return
      const res = await updatePhShoot(editingShoot.id, {
        title: editingShoot.title,
        description: editingShoot.description,
        location: editingShoot.location,
        shoot_date: editingShoot.shoot_date ? new Date(editingShoot.shoot_date).toISOString() : null,
        post_date: editingShoot.post_date ? new Date(editingShoot.post_date).toISOString() : null,
        status: editingShoot.status,
      })
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Shoot updated successfully!')
      setEditingShoot(null)
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update shoot')
    },
  })

  // Assign Crew Mutation
  const assignCrewMutation = useMutation({
    mutationFn: async () => {
      if (!assigningShoot || !selectedUserId || !crewRole) return
      const res = await assignShootCrew({
        shoot_id: assigningShoot.id,
        user_id: selectedUserId,
        role: crewRole,
        notes: crewNotes,
      })
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success('Crew member assigned!')
      setAssigningShoot(null)
      setSelectedUserId('')
      setCrewRole('Director')
      setCrewNotes('')
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign crew')
    },
  })

  // Remove Crew Mutation
  const removeCrewMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await removeShootCrew(assignmentId)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Crew assignment removed')
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove assignment')
    },
  })

  // Respond to assignment (Accept / Decline)
  const respondMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: 'accepted' | 'declined' }) => {
      const res = await respondShootAssignment(assignmentId, status)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: (_, vars) => {
      toast.success(`Assignment ${vars.status}!`)
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update assignment')
    },
  })

  // Complete Shoot Mutation
  const completeShootMutation = useMutation({
    mutationFn: async () => {
      if (!completingShoot) return
      const pts = parseInt(pointsPerMember, 10) || 30
      const res = await completePhShoot(completingShoot.id, pts)
      if (res.error) throw new Error(res.error)
    },
    onSuccess: () => {
      toast.success('Shoot marked completed & points awarded to crew!')
      setCompletingShoot(null)
      queryClient.invalidateQueries({ queryKey: ['ph-shoots'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to complete shoot')
    },
  })

  // Filter shoots
  const filteredShoots = useMemo(() => {
    return shoots.filter((s: any) => {
      if (filterTab === 'planning') return s.status === 'planning'
      if (filterTab === 'scheduled') return ['scheduled', 'shooting', 'editing'].includes(s.status)
      if (filterTab === 'completed') return s.status === 'completed'
      if (filterTab === 'my') return s.assignments?.some((a: any) => a.user_id === profile?.id)
      return true
    })
  }, [shoots, filterTab, profile])

  // Filter members in crew assigner
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return allMembers
    const q = memberSearch.toLowerCase()
    return allMembers.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.roll_number?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    )
  }, [allMembers, memberSearch])

  // Check if chosen member is eligible for selected role
  const isCameraRole = /camera|cinematograph|dop|videograph/i.test(crewRole)
  const selectedMemberObj = allMembers.find((m: any) => m.id === selectedUserId)
  const isSelectedMemberCameraEligible = selectedMemberObj ? canAccessCamera(selectedMemberObj.role) : true
  const cameraError = isCameraRole && selectedMemberObj && !isSelectedMemberCameraEligible

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              PH Shoots
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Plan club productions, schedule shoot & post dates, and assemble your crew roster.
            </p>
          </div>
        </div>

        {isLeader && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold gap-2 shadow-lg shadow-cyan-500/20 rounded-2xl"
          >
            <Plus className="h-4 w-4" />
            Schedule New Shoot
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
        <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="w-full">
          <TabsList className="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
            <TabsTrigger value="all" className="font-semibold text-xs sm:text-sm">
              All Shoots ({shoots.length})
            </TabsTrigger>
            <TabsTrigger value="planning" className="font-semibold text-xs sm:text-sm">
              In Planning ({shoots.filter((s: any) => s.status === 'planning').length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="font-semibold text-xs sm:text-sm">
              In Production ({shoots.filter((s: any) => ['scheduled', 'shooting', 'editing'].includes(s.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-semibold text-xs sm:text-sm">
              Completed ({shoots.filter((s: any) => s.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="my" className="font-semibold text-xs sm:text-sm">
              My Assignments ({shoots.filter((s: any) => s.assignments?.some((a: any) => a.user_id === profile?.id)).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Shoots Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-neutral-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredShoots.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-200 dark:border-white/10 rounded-3xl">
          <Clapperboard className="h-12 w-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">No shoots found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            Approved ideas from the Idea Submissions page will appear here for planning.
          </p>
          {isLeader && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="mt-4 rounded-xl border-neutral-200 dark:border-white/10 text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" /> Schedule First Shoot
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredShoots.map((shoot: any) => {
            const isCompleted = shoot.status === 'completed'
            const assignments = shoot.assignments || []
            const userAssignment = assignments.find((a: any) => a.user_id === profile?.id)

            return (
              <Card
                key={shoot.id}
                className="bg-card/40 backdrop-blur-md border-neutral-200 dark:border-white/10 hover:border-cyan-500/30 transition-all rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm group"
              >
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[11px] font-bold'
                            : shoot.status === 'planning'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase text-[11px] font-bold'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase text-[11px] font-bold'
                        }
                      >
                        {shoot.status}
                      </Badge>
                      {shoot.idea && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] gap-1">
                          <Sparkles className="h-3 w-3" /> From Idea: {shoot.idea.category}
                        </Badge>
                      )}
                    </div>

                    {isLeader && !isCompleted && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingShoot({ ...shoot })}
                          className="h-8 px-2 text-xs rounded-xl text-neutral-400 hover:text-white"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setCompletingShoot(shoot)}
                          className="h-8 px-2.5 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold gap-1"
                        >
                          <Award className="h-3.5 w-3.5" /> Complete
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-cyan-400 transition-colors">
                      {shoot.title}
                    </CardTitle>
                    {shoot.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {shoot.description}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Shoot Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase font-semibold">Shoot Date</p>
                        <p className="font-medium truncate">
                          {shoot.shoot_date ? format(new Date(shoot.shoot_date), 'MMM d, yyyy') : 'TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Send className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase font-semibold">Target Post</p>
                        <p className="font-medium truncate">
                          {shoot.post_date ? format(new Date(shoot.post_date), 'MMM d, yyyy') : 'TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-neutral-400 uppercase font-semibold">Location</p>
                        <p className="font-medium truncate">{shoot.location || 'Location TBD'}</p>
                      </div>
                    </div>
                  </div>

                  {/* My Assignment Quick Action Banner */}
                  {userAssignment && userAssignment.status === 'pending' && (
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <p className="font-bold text-cyan-400">You are assigned as: {userAssignment.role}</p>
                        <p className="text-[11px] text-neutral-400">Please confirm if you can participate.</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() =>
                            respondMutation.mutate({ assignmentId: userAssignment.id, status: 'accepted' })
                          }
                          disabled={respondMutation.isPending}
                          className="h-7 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold px-2.5"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            respondMutation.mutate({ assignmentId: userAssignment.id, status: 'declined' })
                          }
                          disabled={respondMutation.isPending}
                          className="h-7 text-xs rounded-xl text-rose-400 hover:bg-rose-500/10 px-2.5"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Crew Roster */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Production Crew ({assignments.length})
                      </h4>
                      {isLeader && !isCompleted && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAssigningShoot(shoot)
                            setSelectedUserId('')
                            setCrewRole('Director')
                            setCrewNotes('')
                          }}
                          className="h-6 text-[11px] rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-semibold px-2"
                        >
                          + Assign Member
                        </Button>
                      )}
                    </div>

                    {assignments.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-center">
                        No crew members assigned yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {assignments.map((assignment: any) => {
                          const mProfile = assignment.profiles
                          const isCam = /camera|cinematograph|dop|videograph/i.test(assignment.role)

                          return (
                            <div
                              key={assignment.id}
                              className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={mProfile?.avatar_url || ''} />
                                  <AvatarFallback className="text-[10px]">
                                    {mProfile?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                                    {mProfile?.full_name || 'Member'}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-cyan-400 truncate flex items-center gap-1">
                                      {isCam && <Camera className="h-2.5 w-2.5" />}
                                      {assignment.role}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 font-semibold uppercase ${
                                    assignment.status === 'accepted'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : assignment.status === 'declined'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {assignment.status}
                                </Badge>
                                {isLeader && !isCompleted && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeCrewMutation.mutate(assignment.id)}
                                    className="h-6 w-6 p-0 text-neutral-400 hover:text-red-400 rounded-lg"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Schedule / Create Shoot Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-cyan-400" />
              Schedule PH Shoot
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Create a new production project to plan dates, location, and crew members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-title" className="text-xs font-semibold">
                Shoot Title *
              </Label>
              <Input
                id="s-title"
                placeholder="e.g. Monsoon Moods - 4K Short Film"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-desc" className="text-xs font-semibold">
                Description / Production Brief
              </Label>
              <Textarea
                id="s-desc"
                placeholder="Equipment needed, shot breakdowns, scene requirements..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-date" className="text-xs font-semibold">
                  Shoot Date
                </Label>
                <Input
                  id="s-date"
                  type="date"
                  value={shootDate}
                  onChange={(e) => setShootDate(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-post" className="text-xs font-semibold">
                  Target Post Date
                </Label>
                <Input
                  id="s-post"
                  type="date"
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-loc" className="text-xs font-semibold">
                Location
              </Label>
              <Input
                id="s-loc"
                placeholder="e.g. Central Amphitheatre & Botanical Garden"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createShootMutation.mutate()}
              disabled={createShootMutation.isPending || !title}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {createShootMutation.isPending ? 'Scheduling...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shoot Dialog */}
      <Dialog open={!!editingShoot} onOpenChange={(open) => !open && setEditingShoot(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-cyan-400" />
              Edit Shoot Details
            </DialogTitle>
          </DialogHeader>

          {editingShoot && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title</Label>
                <Input
                  value={editingShoot.title}
                  onChange={(e) => setEditingShoot({ ...editingShoot, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={editingShoot.status}
                  onValueChange={(v) => v && setEditingShoot({ ...editingShoot, status: v })}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {['planning', 'scheduled', 'shooting', 'editing', 'completed', 'cancelled'].map((st) => (
                      <SelectItem key={st} value={st} className="text-xs capitalize">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Shoot Date</Label>
                  <Input
                    type="date"
                    value={editingShoot.shoot_date ? editingShoot.shoot_date.split('T')[0] : ''}
                    onChange={(e) => setEditingShoot({ ...editingShoot, shoot_date: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Post Date</Label>
                  <Input
                    type="date"
                    value={editingShoot.post_date ? editingShoot.post_date.split('T')[0] : ''}
                    onChange={(e) => setEditingShoot({ ...editingShoot, post_date: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Location</Label>
                <Input
                  value={editingShoot.location || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, location: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={editingShoot.description || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, description: e.target.value })}
                  rows={3}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingShoot(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => updateShootMutation.mutate()}
              disabled={updateShootMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {updateShootMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Crew Dialog */}
      <Dialog open={!!assigningShoot} onOpenChange={(open) => !open && setAssigningShoot(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Assign Crew Member
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Assign roles for "{assigningShoot?.title}". Camera roles are strictly restricted to Board and Committee Members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role on Shoot *</Label>
              <Select value={crewRole} onValueChange={(v) => v && setCrewRole(v)}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-56">
                  {COMMON_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera Role Notice */}
            {isCameraRole && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2">
                <Camera className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Camera Access Restricted Role</p>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90">
                    Camera & Cinematography roles can only be assigned to Board Members and Committee Members.
                  </p>
                </div>
              </div>
            )}

            {/* Member Search & Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Member *</Label>
              <Input
                placeholder="Search member by name or roll number..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="rounded-xl text-xs mb-2"
              />

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-200 dark:border-white/5 rounded-2xl p-2">
                {filteredMembers.map((member: any) => {
                  const isSelected = selectedUserId === member.id
                  const isCameraEligible = canAccessCamera(member.role)
                  const isDisabled = isCameraRole && !isCameraEligible

                  return (
                    <div
                      key={member.id}
                      onClick={() => !isDisabled && setSelectedUserId(member.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-white/[0.01]'
                          : isSelected
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 cursor-pointer'
                          : 'hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">
                            {member.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                            {member.full_name || 'Member'}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {member.roll_number ? `${member.roll_number} • ` : ''}
                            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                          </p>
                        </div>
                      </div>

                      {isDisabled ? (
                        <span className="text-[10px] text-amber-500 font-medium">No camera access</span>
                      ) : isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {cameraError && (
              <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Please select a Board or Committee member for camera roles.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Instructions (Optional)</Label>
              <Input
                placeholder="e.g. Bring wide angle lens, arrive 30 mins before call time"
                value={crewNotes}
                onChange={(e) => setCrewNotes(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAssigningShoot(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => assignCrewMutation.mutate()}
              disabled={assignCrewMutation.isPending || !selectedUserId || !crewRole || !!cameraError}
              className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {assignCrewMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Shoot & Award Points Dialog */}
      <Dialog open={!!completingShoot} onOpenChange={(open) => !open && setCompletingShoot(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-card border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              Complete Shoot & Award Points
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Mark "{completingShoot?.title}" as completed. All crew members who accepted their assignment will receive points.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Points per Confirmed Crew Member</Label>
              <Input
                type="number"
                value={pointsPerMember}
                onChange={(e) => setPointsPerMember(e.target.value)}
                className="rounded-xl text-xs"
              />
              <p className="text-[11px] text-neutral-400">
                Default: 30 points. Leaderboard will be automatically recalculated.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCompletingShoot(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => completeShootMutation.mutate()}
              disabled={completeShootMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs"
            >
              {completeShootMutation.isPending ? 'Completing...' : 'Confirm & Award Points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
