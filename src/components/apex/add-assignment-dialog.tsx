'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Camera, 
  Video, 
  Layers, 
  Clock, 
  MapPin, 
  Users, 
  Trash2, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { createInternalApex } from '@/actions/apex'
import { getMembers } from '@/actions/members'
import { getEquipment } from '@/actions/equipment'
import { canAccessCamera, ROLE_LABELS } from '@/lib/constants/roles'
import { cn } from '@/lib/utils'

interface AddAssignmentDialogProps {
  currentUser: {
    id: string
    full_name: string | null
    email: string
    role: string
    department?: string | null
    phone?: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}

interface CrewRow {
  id: string
  user_id: string
  role: 'photographer' | 'videographer' | 'editor'
  equipment_id: string
  isCurrentUser?: boolean
}

export function AddAssignmentDialog({
  currentUser,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}: AddAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen

  const [isPending, startTransition] = useTransition()

  // Form states
  const [eventName, setEventName] = useState('')
  const [department, setDepartment] = useState('Club Internal')
  const [venue, setVenue] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0])
  const [eventTime, setEventTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [endTime, setEndTime] = useState('')
  const [coverageType, setCoverageType] = useState<'photography' | 'videography' | 'both'>('both')
  const [notes, setNotes] = useState('')

  // Crew rows - initialize with current user
  const [crew, setCrew] = useState<CrewRow[]>([
    {
      id: 'current-user-row',
      user_id: currentUser.id,
      role: 'photographer',
      equipment_id: 'none',
      isCurrentUser: true,
    },
  ])

  // Remote data
  const [members, setMembers] = useState<any[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Fetch members and equipment when dialog opens
  useEffect(() => {
    if (isOpen && !dataLoaded) {
      Promise.all([getMembers(), getEquipment()]).then(([mRes, eRes]) => {
        if (mRes.data) setMembers(mRes.data)
        if (eRes.data) setEquipmentList(eRes.data)
        setDataLoaded(true)
      })
    }
  }, [isOpen, dataLoaded])

  const usableEquipment = equipmentList.filter((e) => e.status !== 'maintenance' && e.status !== 'retired')

  const handleAddCrew = () => {
    const unselectedMember = members.find((m) => !crew.some((c) => c.user_id === m.id))
    setCrew((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        user_id: unselectedMember ? unselectedMember.id : '',
        role: 'photographer',
        equipment_id: 'none',
        isCurrentUser: false,
      },
    ])
  }

  const handleRemoveCrew = (id: string) => {
    setCrew((prev) => prev.filter((c) => c.id !== id))
  }

  const handleCrewChange = (id: string, field: keyof CrewRow, value: string) => {
    setCrew((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        return { ...c, [field]: value }
      })
    )
  }

  const resetForm = () => {
    setEventName('')
    setDepartment('Club Internal')
    setVenue('')
    setEventDate(new Date().toISOString().split('T')[0])
    setEventTime(new Date().toTimeString().slice(0, 5))
    setEndTime('')
    setCoverageType('both')
    setNotes('')
    setCrew([
      {
        id: 'current-user-row',
        user_id: currentUser.id,
        role: 'photographer',
        equipment_id: 'none',
        isCurrentUser: true,
      },
    ])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!eventName.trim() || eventName.trim().length < 3) {
      toast.error('Shoot / Event name must be at least 3 characters')
      return
    }

    if (!eventDate) {
      toast.error('Shoot date is required')
      return
    }

    // Validate crew
    const userIds = new Set<string>()
    for (const c of crew) {
      if (!c.user_id) {
        toast.error('Please select a member for all crew rows')
        return
      }
      if (userIds.has(c.user_id)) {
        toast.error('Cannot assign the same member more than once')
        return
      }
      userIds.add(c.user_id)

      // Equipment camera check
      if (c.equipment_id && c.equipment_id !== 'none') {
        const eq = equipmentList.find((item) => item.id === c.equipment_id)
        if (eq?.type === 'camera') {
          const assignee = members.find((m) => m.id === c.user_id) || (c.user_id === currentUser.id ? currentUser : null)
          if (!assignee || !canAccessCamera(assignee.role)) {
            toast.error(
              `Camera "${eq.name}" can only be checked out by Camera Holders (Admin, Board, or Committee Member).`
            )
            return
          }
        }
      }
    }

    startTransition(async () => {
      const payloadCrew = crew
        .filter((c) => c.user_id)
        .map((c) => ({
          user_id: c.user_id,
          role: c.role,
          equipment_id: c.equipment_id !== 'none' ? c.equipment_id : null,
          status: c.user_id === currentUser.id ? ('accepted' as const) : ('pending' as const),
        }))

      const res = await createInternalApex({
        event_name: eventName,
        organizer_name: currentUser.full_name || 'Club Internal',
        department: department || 'Photography Club',
        contact_email: currentUser.email,
        contact_phone: currentUser.phone || undefined,
        venue: venue || undefined,
        event_date: eventDate,
        event_time: eventTime || undefined,
        end_time: endTime || undefined,
        coverage_type: coverageType,
        notes: notes || undefined,
        initial_status: 'assigned',
        crew: payloadCrew,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Impromptu assignment for "${eventName}" registered successfully!`)
        resetForm()
        setIsOpen(false)
        if (onSuccess) onSuccess()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger render={trigger as any} />
      ) : (
        <DialogTrigger
          render={
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-95 font-bold rounded-xl h-10 px-4 text-xs gap-2 shadow-lg shadow-cyan-950/20">
              <Plus className="h-4 w-4" />
              Add Assignment
            </Button>
          }
        />
      )}

      <DialogContent className="bg-neutral-950 border border-white/10 text-neutral-200 rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 shadow-2xl">
        {/* Header Banner */}
        <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Camera Holder Action
              </Badge>
              <Badge variant="outline" className="text-[10px] border-white/10 text-neutral-400">
                Impromptu / Unannounced Shoot
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-white flex items-center gap-2 pt-1">
              <Camera className="h-6 w-6 text-cyan-400" />
              Register Shoot Assignment
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Track spontaneous or unannounced college shoots. Record event time, check out equipment, and continue the full APEX workflow.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Shoot Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              1. Shoot Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="impromptu-event-name" className="text-neutral-300 font-semibold text-xs">
                  Shoot / Event Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="impromptu-event-name"
                  placeholder="e.g. Flashmob, Sports Practice, Guest Reception"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="impromptu-department" className="text-neutral-300 font-semibold text-xs">
                  Department / Host
                </Label>
                <Input
                  id="impromptu-department"
                  placeholder="e.g. Club Internal, Fine Arts, CSE"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="impromptu-venue" className="text-neutral-300 font-semibold text-xs">
                  Venue / Location
                </Label>
                <Input
                  id="impromptu-venue"
                  placeholder="e.g. Campus Quad, Grounds, Auditorium"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="impromptu-date" className="text-neutral-300 font-semibold text-xs">
                  Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="impromptu-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="impromptu-time" className="text-neutral-300 font-semibold text-xs">
                    Start Time
                  </Label>
                  <Input
                    id="impromptu-time"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="border-white/10 bg-white/[0.03] text-white rounded-xl focus:border-cyan-500/40 text-sm h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="impromptu-end-time" className="text-neutral-300 font-semibold text-xs">
                    End Time
                  </Label>
                  <Input
                    id="impromptu-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border-white/10 bg-white/[0.03] text-white rounded-xl focus:border-cyan-500/40 text-sm h-10"
                  />
                </div>
              </div>
            </div>

            {/* Coverage Type Selector */}
            <div className="space-y-2 pt-1">
              <Label className="text-neutral-300 font-semibold text-xs">Coverage Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'both', label: 'Photo & Video', icon: Layers },
                  { value: 'photography', label: 'Photography', icon: Camera },
                  { value: 'videography', label: 'Videography', icon: Video },
                ].map((item) => {
                  const Icon = item.icon
                  const isSelected = coverageType === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCoverageType(item.value as any)}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2.5 rounded-xl border text-center transition-all text-xs font-bold',
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-950/20'
                          : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-cyan-400' : 'text-neutral-500')} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="impromptu-notes" className="text-neutral-300 font-semibold text-xs">
                Shoot Notes & Context
              </Label>
              <Textarea
                id="impromptu-notes"
                placeholder="Brief description of the shoot, what was covered, who was present..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-xs min-h-[50px]"
              />
            </div>
          </div>

          {/* Section 2: Crew & Equipment Assignment */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  2. Assigned Crew & Checked-Out Gear
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  You are automatically assigned. You can also add fellow teammates on this shoot.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCrew}
                className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Teammate
              </Button>
            </div>

            <div className="space-y-3">
              {crew.map((c, index) => {
                const isSelf = c.user_id === currentUser.id
                const selectedMember = isSelf ? currentUser : members.find((m) => m.id === c.user_id)
                const isEligibleForCamera = selectedMember ? canAccessCamera(selectedMember.role) : false
                const selectedGear = equipmentList.find((eq) => eq.id === c.equipment_id)

                return (
                  <div
                    key={c.id}
                    className="border border-white/5 bg-white/[0.015] hover:border-white/10 p-4 rounded-2xl space-y-3 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-neutral-500">#{index + 1}</span>
                        <span className="text-xs font-bold text-white">
                          {isSelf ? `${currentUser.full_name || 'You'} (You)` : selectedMember?.full_name || 'Select Teammate'}
                        </span>
                        {isSelf ? (
                          <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Auto Accepted
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-none text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Pending Invite
                          </Badge>
                        )}
                      </div>
                      {!isSelf && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCrew(c.id)}
                          className="h-7 w-7 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Teammate selection (disabled if self) */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-neutral-400">Crew Member</Label>
                        {isSelf ? (
                          <div className="h-9 px-3 border border-white/5 bg-white/[0.02] rounded-xl flex items-center text-xs text-neutral-300 font-medium">
                            {currentUser.full_name || currentUser.email}
                          </div>
                        ) : (
                          <Select
                            value={c.user_id}
                            onValueChange={(val) => handleCrewChange(c.id, 'user_id', val || '')}
                          >
                            <SelectTrigger className="w-full h-9 border-white/10 bg-neutral-900 text-xs rounded-xl text-neutral-200">
                              <SelectValue placeholder="Select Member">
                                {(val) => {
                                  const member = members.find((m) => m.id === val)
                                  return member ? (member.full_name || member.email) : 'Select Member'
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-white/10 text-neutral-200 max-h-56">
                              {members
                                .filter((m) => m.id !== currentUser.id)
                                .map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="text-xs focus:bg-white/5">
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span>{m.full_name || m.email}</span>
                                      <span className="text-[10px] text-neutral-500 capitalize">
                                        ({ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] || m.role})
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Role selection */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-neutral-400">Role</Label>
                        <Select
                          value={c.role}
                          onValueChange={(val: any) => handleCrewChange(c.id, 'role', val || 'photographer')}
                        >
                          <SelectTrigger className="w-full h-9 border-white/10 bg-neutral-900 text-xs rounded-xl text-neutral-200 capitalize">
                            <SelectValue placeholder="Role">
                              {(val) => {
                                if (val === 'photographer') return '📷 Photographer'
                                if (val === 'videographer') return '🎥 Videographer'
                                if (val === 'editor') return '💻 Editor'
                                return val || 'Role'
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-white/10 text-neutral-200">
                            <SelectItem value="photographer" className="text-xs focus:bg-white/5">
                              📷 Photographer
                            </SelectItem>
                            <SelectItem value="videographer" className="text-xs focus:bg-white/5">
                              🎥 Videographer
                            </SelectItem>
                            <SelectItem value="editor" className="text-xs focus:bg-white/5">
                              💻 Editor
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Equipment selection */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-neutral-400">Gear Checked Out</Label>
                        <Select
                          value={c.equipment_id}
                          onValueChange={(val) => handleCrewChange(c.id, 'equipment_id', val || 'none')}
                        >
                          <SelectTrigger className="w-full h-9 border-white/10 bg-neutral-900 text-xs rounded-xl text-neutral-200">
                            <SelectValue placeholder="None / Personal Gear">
                              {(val) => {
                                if (!val || val === 'none') return 'None / Personal Gear'
                                const eq = equipmentList.find((item) => item.id === val)
                                if (!eq) return 'None / Personal Gear'
                                return `${eq.name} (${eq.type})${eq.status === 'assigned' ? ' [Reserved]' : ''}`
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-white/10 text-neutral-200 max-h-56">
                            <SelectItem value="none" className="text-xs focus:bg-white/5">
                              None / Personal Gear
                            </SelectItem>
                            {usableEquipment.map((eq) => {
                              const isCamera = eq.type === 'camera'
                              const isDisallowed = isCamera && !isEligibleForCamera
                              const isAssigned = eq.status === 'assigned'
                              return (
                                <SelectItem
                                  key={eq.id}
                                  value={eq.id}
                                  disabled={isDisallowed}
                                  className="text-xs focus:bg-white/5 disabled:opacity-40"
                                >
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="capitalize">
                                        {eq.name} ({eq.type})
                                      </span>
                                      {isAssigned && (
                                        <span className="text-[9px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                          Reserved / In Use
                                        </span>
                                      )}
                                    </div>
                                    {isDisallowed && (
                                      <span className="text-[9px] text-amber-500 font-bold">
                                        (Camera Holder only)
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Gear info chip */}
                    {selectedGear && (
                      <div className="flex items-center gap-2 text-[10px] text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-2.5 py-1.5 rounded-lg">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        <span>
                          Checked out: <strong>{selectedGear.name}</strong> • S/N: {selectedGear.serial_number || 'N/A'} • Status updated to assigned.
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-white/10 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl text-xs h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-95 font-bold rounded-xl text-xs h-10 px-6 gap-2 shadow-lg shadow-cyan-950/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Assignment...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Register & Start Assignment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
