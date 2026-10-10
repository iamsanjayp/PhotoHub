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
  Calendar,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { createInternalApex } from '@/actions/apex'
import { getMembers } from '@/actions/members'
import { getEquipment } from '@/actions/equipment'
import { canAccessCamera, ROLE_LABELS } from '@/lib/constants/roles'
import { MemberSearchCombobox, type MemberProfile } from './member-search-combobox'
import { cn } from '@/lib/utils'

interface ScheduleShootDialogProps {
  currentUser?: {
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
  isCurrentUser?: boolean
}

export function ScheduleShootDialog({
  currentUser,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}: ScheduleShootDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen

  const [isPending, startTransition] = useTransition()

  // Form states
  const [eventName, setEventName] = useState('')
  const [department, setDepartment] = useState('')
  const [apexRef, setApexRef] = useState('')
  const [venue, setVenue] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0])
  const [eventTime, setEventTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [endTime, setEndTime] = useState('')
  const [coverageType, setCoverageType] = useState<'photography' | 'videography' | 'both'>('both')
  const [notes, setNotes] = useState('')

  interface AllocatedGearRow {
    id: string
    equipment_id: string
    custodian_id: string
  }

  // Shoot-level Gear allocation (supports multiple cameras/gear items)
  const [allocatedGear, setAllocatedGear] = useState<AllocatedGearRow[]>([])

  // Crew rows
  const [crew, setCrew] = useState<CrewRow[]>(() => {
    if (currentUser) {
      return [
        {
          id: 'current-user-row',
          user_id: currentUser.id,
          role: 'photographer',
          isCurrentUser: true,
        },
      ]
    }
    return []
  })

  // Remote data
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Fetch members and equipment when dialog opens
  useEffect(() => {
    if (isOpen && !dataLoaded) {
      Promise.all([getMembers(), getEquipment()]).then(([mRes, eRes]) => {
        if (mRes.data) setMembers(mRes.data as MemberProfile[])
        if (eRes.data) setEquipmentList(eRes.data)
        setDataLoaded(true)
      })
    }
  }, [isOpen, dataLoaded])

  // Usable equipment: exclude retired and maintenance
  const usableEquipment = equipmentList.filter((e) => e.status !== 'maintenance' && e.status !== 'retired')

  const handleAddGearRow = () => {
    const eligibleCrew = crew.find((c) => {
      const m = members.find((mem) => mem.id === c.user_id) || (currentUser && c.user_id === currentUser.id ? currentUser : null)
      return m ? canAccessCamera(m.role) : false
    })
    const defaultCustodian = eligibleCrew?.user_id || (currentUser && canAccessCamera(currentUser.role) ? currentUser.id : '')

    setAllocatedGear((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        equipment_id: '',
        custodian_id: defaultCustodian,
      },
    ])
  }

  const handleRemoveGearRow = (id: string) => {
    setAllocatedGear((prev) => prev.filter((g) => g.id !== id))
  }

  const handleGearChange = (id: string, field: 'equipment_id' | 'custodian_id', value: string) => {
    setAllocatedGear((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        const updated = { ...g, [field]: value }
        if (field === 'equipment_id') {
          const eq = usableEquipment.find((item) => item.id === value)
          if (eq?.type === 'camera' && !updated.custodian_id) {
            const eligibleCrew = crew.find((c) => {
              const m = members.find((mem) => mem.id === c.user_id) || (currentUser && c.user_id === currentUser.id ? currentUser : null)
              return m ? canAccessCamera(m.role) : false
            })
            if (eligibleCrew) updated.custodian_id = eligibleCrew.user_id
            else if (currentUser && canAccessCamera(currentUser.role)) updated.custodian_id = currentUser.id
          }
        }
        return updated
      })
    )
  }

  const handleAddCrewRow = () => {
    setCrew((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        user_id: '',
        role: 'photographer',
        isCurrentUser: false,
      },
    ])
  }

  const handleRemoveCrewRow = (id: string) => {
    setCrew((prev) => prev.filter((c) => c.id !== id))
  }

  const handleCrewChange = (id: string, field: keyof CrewRow, value: any) => {
    setCrew((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        return { ...c, [field]: value }
      })
    )
  }

  const resetForm = () => {
    setEventName('')
    setDepartment('')
    setApexRef('')
    setVenue('')
    setEventDate(new Date().toISOString().split('T')[0])
    setEventTime(new Date().toTimeString().slice(0, 5))
    setEndTime('')
    setCoverageType('both')
    setNotes('')
    setAllocatedGear([])
    if (currentUser) {
      setCrew([
        {
          id: 'current-user-row',
          user_id: currentUser.id,
          role: 'photographer',
          isCurrentUser: true,
        },
      ])
    } else {
      setCrew([])
    }
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

    if (crew.length === 0) {
      toast.error('Please assign at least one crew member')
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
    }

    // Validate allocated gear
    const selectedGearIds = new Set<string>()
    for (const gear of allocatedGear) {
      if (!gear.equipment_id || gear.equipment_id === 'none') {
        toast.error('Please select an equipment item for all allocated gear rows or remove empty rows.')
        return
      }
      if (selectedGearIds.has(gear.equipment_id)) {
        toast.error('Cannot allocate the same equipment item multiple times.')
        return
      }
      selectedGearIds.add(gear.equipment_id)

      const gearItem = equipmentList.find((item) => item.id === gear.equipment_id)
      if (gearItem?.type === 'camera') {
        if (!gear.custodian_id) {
          toast.error(`Please select a designated Camera Custodian for ${gearItem.name}.`)
          return
        }
        const custodianMember =
          members.find((m) => m.id === gear.custodian_id) ||
          (currentUser && currentUser.id === gear.custodian_id ? currentUser : null)

        if (!custodianMember || !canAccessCamera(custodianMember.role)) {
          toast.error(`Designated Camera Custodian for ${gearItem.name} must be a Camera Holder (Admin, Board, or Committee Member).`)
          return
        }

        if (!userIds.has(gear.custodian_id)) {
          toast.error(`The designated Camera Custodian for ${gearItem.name} must also be in the assigned crew.`)
          return
        }
      }
    }

    startTransition(async () => {
      const payloadCrew = crew
        .filter((c) => c.user_id)
        .map((c) => {
          const isMe = currentUser ? c.user_id === currentUser.id : false
          return {
            user_id: c.user_id,
            role: c.role,
            status: isMe ? ('accepted' as const) : ('pending' as const),
          }
        })

      // Combine notes with APEX reference if present
      const combinedNotes = [
        apexRef.trim() ? `[APEX Ref: ${apexRef.trim()}]` : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join('\n\n')

      const res = await createInternalApex({
        event_name: eventName.trim(),
        organizer_name: department.trim() || 'Club Internal',
        department: department.trim() || 'Photography Club',
        contact_email: currentUser?.email || 'admin@photohub.club',
        contact_phone: currentUser?.phone || undefined,
        venue: venue.trim() || undefined,
        event_date: eventDate,
        event_time: eventTime || undefined,
        end_time: endTime || undefined,
        coverage_type: coverageType,
        notes: combinedNotes || undefined,
        initial_status: 'assigned',
        allocated_gear: allocatedGear.map((g) => ({
          equipment_id: g.equipment_id,
          custodian_id: g.custodian_id || undefined,
        })),
        equipment_id: allocatedGear[0]?.equipment_id || undefined,
        camera_custodian_id: allocatedGear[0]?.custodian_id || undefined,
        crew: payloadCrew,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Event coverage shoot "${eventName}" scheduled successfully!`)
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
              Schedule Event Shoot
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
                <FileCheck2 className="h-3 w-3" />
                Event Coverage Shoot
              </Badge>
              <Badge variant="outline" className="text-[10px] border-white/10 text-neutral-400">
                Campus & APEX Assignment
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-white flex items-center gap-2 pt-1">
              <Camera className="h-6 w-6 text-cyan-400" />
              Schedule Coverage Shoot
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Schedule photography and videography coverage for institute events. Assign crew members and allocate club cameras.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Shoot & Event Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              1. Shoot & Event Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="shoot-event-name" className="text-neutral-300 font-semibold text-xs">
                  Event / Shoot Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="shoot-event-name"
                  placeholder="e.g. Flashmob, Tech Fest Valedictory, Sports Meet, Guest Lecture"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shoot-department" className="text-neutral-300 font-semibold text-xs">
                  Host / Department
                </Label>
                <Input
                  id="shoot-department"
                  placeholder="e.g. CSE Dept, Student Council, Fine Arts"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shoot-apex-ref" className="text-neutral-300 font-semibold text-xs flex items-center gap-1">
                  <span>APEX / Approval Ref</span>
                  <span className="text-[10px] text-neutral-500 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="shoot-apex-ref"
                  placeholder="e.g. APEX-2026-042 or Approval #12"
                  value={apexRef}
                  onChange={(e) => setApexRef(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shoot-venue" className="text-neutral-300 font-semibold text-xs">
                  Venue / Location
                </Label>
                <Input
                  id="shoot-venue"
                  placeholder="e.g. Campus Auditorium, Quadrangle, Ground"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shoot-date" className="text-neutral-300 font-semibold text-xs">
                  Shoot Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="shoot-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl focus:border-cyan-500/40 text-sm h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shoot-start-time" className="text-neutral-300 font-semibold text-xs">
                    Start Time
                  </Label>
                  <Input
                    id="shoot-start-time"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="border-white/10 bg-white/[0.03] text-white rounded-xl focus:border-cyan-500/40 text-sm h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shoot-end-time" className="text-neutral-300 font-semibold text-xs">
                    End Time
                  </Label>
                  <Input
                    id="shoot-end-time"
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
              <Label htmlFor="shoot-notes" className="text-neutral-300 font-semibold text-xs">
                Shoot Notes & Briefing
              </Label>
              <Textarea
                id="shoot-notes"
                placeholder="Key moments to capture, VIP guests, lighting conditions, specific shots needed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/40 text-xs min-h-[50px]"
              />
            </div>
          </div>

          {/* Section 2: Club Equipment & Camera Custodians */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  2. Club Camera & Gear Allocation ({allocatedGear.length})
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Allocate club cameras and gear for this shoot. Each camera must have a designated Camera Custodian from the crew.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddGearRow}
                className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Allocate Camera / Gear
              </Button>
            </div>

            {allocatedGear.length === 0 ? (
              <div className="border border-dashed border-white/5 bg-white/[0.01] rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs text-neutral-400">
                  No club cameras or gear allocated yet. (Crew will use personal equipment).
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddGearRow}
                  className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 font-bold rounded-xl text-xs h-8 px-3 gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  Allocate Club Camera / Gear
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {allocatedGear.map((gear, index) => {
                  const selectedItem = usableEquipment.find((item) => item.id === gear.equipment_id)
                  const isCamera = selectedItem?.type === 'camera'
                  const otherAllocatedEqIds = allocatedGear.filter((g) => g.id !== gear.id).map((g) => g.equipment_id)

                  return (
                    <div
                      key={gear.id}
                      className="border border-white/5 bg-white/[0.015] hover:border-white/10 p-3.5 rounded-2xl space-y-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-neutral-500">Gear #{index + 1}</span>
                          {selectedItem ? (
                            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full capitalize">
                              {selectedItem.type}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] border-white/10 text-neutral-400">
                              Unselected
                            </Badge>
                          )}
                          {selectedItem?.serial_number && (
                            <span className="text-[10px] text-neutral-500 font-mono">
                              S/N: {selectedItem.serial_number}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveGearRow(gear.id)}
                          className="h-7 w-7 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Equipment dropdown */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-neutral-400">Club Equipment</Label>
                          <select
                            value={gear.equipment_id}
                            onChange={(e) => handleGearChange(gear.id, 'equipment_id', e.target.value)}
                            className="w-full border border-white/10 bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500/30 h-10 focus:outline-none"
                          >
                            <option value="">Select equipment...</option>
                            {usableEquipment.map((eq) => {
                              const isAlreadyPicked = otherAllocatedEqIds.includes(eq.id)
                              const isInUse = eq.is_currently_in_use
                              const upcoming = eq.upcoming_reservation
                              const statusLabel = isInUse ? ' [In Use]' : upcoming ? ' [Booked]' : ' [Available]'

                              return (
                                <option
                                  key={eq.id}
                                  value={eq.id}
                                  disabled={isAlreadyPicked}
                                >
                                  {eq.name} ({eq.type}){statusLabel}{isAlreadyPicked ? ' — (Selected in other row)' : ''}
                                </option>
                              )
                            })}
                          </select>
                        </div>

                        {/* Custodian picker */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-neutral-400 flex items-center justify-between">
                            <span>Designated Custodian</span>
                            {isCamera && (
                              <span className="text-[9px] text-cyan-400 font-normal">(Camera Holder only)</span>
                            )}
                          </Label>
                          <MemberSearchCombobox
                            members={members}
                            selectedMemberId={gear.custodian_id}
                            onSelectMember={(mem) => handleGearChange(gear.id, 'custodian_id', mem ? mem.id : '')}
                            filterOnlyCameraHolders={isCamera}
                            placeholder="Search crew custodian..."
                          />
                        </div>
                      </div>

                      {selectedItem && (
                        <div className="flex items-center gap-2 text-[11px] text-cyan-300 bg-cyan-500/5 border border-cyan-500/10 px-3 py-1.5 rounded-xl">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                          <span>
                            {selectedItem.name} • {selectedItem.model || selectedItem.type} (S/N: {selectedItem.serial_number || 'N/A'}). Status updates to assigned when shoot starts.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 3: Assigned Crew Members */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  3. Assigned Crew Members ({crew.length})
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Search and add teammates to cover this shoot.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCrewRow}
                className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Teammate
              </Button>
            </div>

            <div className="space-y-3">
              {crew.map((c, index) => {
                const isSelf = currentUser ? c.user_id === currentUser.id : false
                const otherAssignedIds = crew.filter((cr) => cr.id !== c.id).map((cr) => cr.user_id)
                const crewMemberGear = allocatedGear.filter((g) => g.custodian_id === c.user_id && g.equipment_id)

                return (
                  <div
                    key={c.id}
                    className="border border-white/5 bg-white/[0.015] hover:border-white/10 p-3.5 rounded-2xl space-y-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-neutral-500">#{index + 1}</span>
                        {isSelf ? (
                          <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            You (Auto-Accepted)
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-none text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Pending Invite
                          </Badge>
                        )}
                        {crewMemberGear.map((g) => {
                          const eq = usableEquipment.find((item) => item.id === g.equipment_id)
                          return (
                            <Badge
                              key={g.id}
                              className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                              <Camera className="h-2.5 w-2.5" />
                              Custodian: {eq?.name || 'Gear'}
                            </Badge>
                          )
                        })}
                      </div>

                      {(!isSelf || crew.length > 1) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCrewRow(c.id)}
                          className="h-7 w-7 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Searchable Member Picker */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-neutral-400">Crew Member</Label>
                        <MemberSearchCombobox
                          members={members}
                          selectedMemberId={c.user_id}
                          disabledMemberIds={otherAssignedIds}
                          onSelectMember={(mem) => handleCrewChange(c.id, 'user_id', mem ? mem.id : '')}
                          placeholder="Search teammate by name, roll #..."
                        />
                      </div>

                      {/* Role selection */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-neutral-400">Role</Label>
                        <select
                          value={c.role}
                          onChange={(e) => handleCrewChange(c.id, 'role', e.target.value as any)}
                          className="w-full border border-white/10 bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500/30 h-10 focus:outline-none capitalize"
                        >
                          <option value="photographer">📷 Photographer</option>
                          <option value="videographer">🎥 Videographer</option>
                          <option value="editor">💻 Editor</option>
                        </select>
                      </div>
                    </div>
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
                  Scheduling Shoot...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Schedule Coverage Shoot
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
