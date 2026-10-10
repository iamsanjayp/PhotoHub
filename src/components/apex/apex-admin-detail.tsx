'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  assignTeamMember, 
  removeAssignment, 
  updateApexStatus, 
  deleteApexMedia,
  allocateEquipmentToApex,
  removeEquipmentFromApex,
  updateApexDetails,
  deleteApexRequest,
  type UpdateApexDetailsInput
} from '@/actions/apex'
import {
  addMissedAttendanceRecord,
  deleteMissedAttendanceRecord,
  type MissedAttendanceRecord
} from '@/actions/missed-attendance'
import { exportMissedAttendanceToXlsx } from '@/lib/export-xlsx'
import { 
  Send, 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  FileText, 
  Check, 
  X, 
  Trash2, 
  UserPlus, 
  FolderHeart,
  Loader2,
  HardDrive,
  UserCheck,
  ExternalLink,
  Camera,
  Plus,
  Mail,
  Phone,
  Edit3,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react'
import { MemberSearchCombobox } from './member-search-combobox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ApexAdminDetailProps {
  request: any
  members: any[]
  equipmentList: any[]
}

export default function ApexAdminDetail({
  request,
  members,
  equipmentList
}: ApexAdminDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isPending, startTransition] = useTransition()

  // Form states for assignment
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('photographer')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('')

  // Gear allocation states
  const [allocGearId, setAllocGearId] = useState('')
  const [allocCustodianId, setAllocCustodianId] = useState('')
  const [showAllocateDialog, setShowAllocateDialog] = useState(false)

  // Edit Shoot Details Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editEventName, setEditEventName] = useState(request.event_name || '')
  const [editOrganizerName, setEditOrganizerName] = useState(request.organizer_name || '')
  const [editDepartment, setEditDepartment] = useState(request.department || '')
  const [editContactEmail, setEditContactEmail] = useState(request.contact_email || '')
  const [editContactPhone, setEditContactPhone] = useState(request.contact_phone || '')
  const [editVenue, setEditVenue] = useState(request.venue || '')
  const [editEventDate, setEditEventDate] = useState(request.event_date || '')
  const [editEventTime, setEditEventTime] = useState(request.event_time || '')
  const [editEndTime, setEditEndTime] = useState(request.end_time || '')
  const [editCoverageType, setEditCoverageType] = useState<'photography' | 'videography' | 'both'>(request.coverage_type || 'both')
  const [editNotes, setEditNotes] = useState(request.notes || '')
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false)

  // Delete Shoot Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeletingShoot, setIsDeletingShoot] = useState(false)

  // Missed Attendance state
  const [missedRecords, setMissedRecords] = useState<MissedAttendanceRecord[]>(request.missed_attendance || [])
  const [showAddMissedDialog, setShowAddMissedDialog] = useState(false)
  const [missedMemberId, setMissedMemberId] = useState('')
  const [missedName, setMissedName] = useState('')
  const [missedRollNumber, setMissedRollNumber] = useState('')
  const [missedEmail, setMissedEmail] = useState('')
  const [missedHours, setMissedHours] = useState<number[]>([1])
  const [missedNotes, setMissedNotes] = useState('')
  const [isAddingMissed, setIsAddingMissed] = useState(false)


  // Filter usable equipment (exclude maintenance and retired)
  const usableEquipment = equipmentList.filter(e => e.status !== 'maintenance' && e.status !== 'retired')

  // Status handlers
  const handleStatusTransition = async (status: 'ongoing' | 'completed' | 'delivered') => {
    if (!confirm(`Transition request status to "${status}"?`)) return
    startTransition(async () => {
      const res = await updateApexStatus(request.id, status)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Request status updated to ${status}`)
        router.refresh()
      }
    })
  }

  // Teammate assignment handler
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId) {
      toast.error('Please select a member')
      return
    }

    startTransition(async () => {
      const res = await assignTeamMember(
        request.id,
        selectedMemberId,
        selectedRole,
        selectedEquipmentId || null
      )
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Team member assigned successfully!')
        setSelectedMemberId('')
        setSelectedEquipmentId('')
        router.refresh()
      }
    })
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this teammate assignment?')) return
    startTransition(async () => {
      const res = await removeAssignment(assignmentId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Assignment removed')
        router.refresh()
      }
    })
  }

  const handleDeleteDeliverable = async (mediaId: string) => {
    if (!confirm('Delete this deliverable?')) return
    startTransition(async () => {
      const res = await deleteApexMedia(mediaId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Deliverable deleted')
        router.refresh()
      }
    })
  }

  const handleAllocateEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allocGearId) {
      toast.error('Please select an equipment item')
      return
    }
    if (!allocCustodianId) {
      toast.error('Please select a designated custodian')
      return
    }

    startTransition(async () => {
      const res = await allocateEquipmentToApex(request.id, allocGearId, allocCustodianId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Equipment allocated to shoot successfully!')
        setAllocGearId('')
        setAllocCustodianId('')
        setShowAllocateDialog(false)
        router.refresh()
      }
    })
  }

  const handleRemoveEquipment = async (eqAssignmentId: string, eqId: string) => {
    if (!confirm('Remove / return this equipment from the shoot?')) return
    startTransition(async () => {
      const res = await removeEquipmentFromApex(eqAssignmentId, eqId, request.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Equipment removed from shoot')
        router.refresh()
      }
    })
  }

  // 1. Update Shoot Details Handler
  const handleUpdateShootDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEventName.trim()) {
      toast.error('Event / Shoot name is required')
      return
    }
    if (!editOrganizerName.trim()) {
      toast.error('Organizer name is required')
      return
    }
    if (!editContactEmail.trim()) {
      toast.error('Contact email is required')
      return
    }

    setIsUpdatingDetails(true)
    const res = await updateApexDetails(request.id, {
      event_name: editEventName,
      organizer_name: editOrganizerName,
      department: editDepartment,
      contact_email: editContactEmail,
      contact_phone: editContactPhone,
      venue: editVenue,
      event_date: editEventDate,
      event_time: editEventTime,
      end_time: editEndTime,
      coverage_type: editCoverageType,
      notes: editNotes,
    })
    setIsUpdatingDetails(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Shoot details updated successfully!')
      setShowEditDialog(false)
      router.refresh()
    }
  }

  // 2. Delete Shoot Handler
  const handleDeleteShoot = async () => {
    setIsDeletingShoot(true)
    const res = await deleteApexRequest(request.id)
    setIsDeletingShoot(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Shoot permanently deleted from database')
      setShowDeleteDialog(false)
      router.push('/admin/apex')
    }
  }

  // 3. Missed Attendance Handlers
  const handleSelectMissedMember = (memberId: string) => {
    setMissedMemberId(memberId)
    const m = members.find((mem) => mem.id === memberId)
    if (m) {
      setMissedName(m.full_name || '')
      setMissedEmail(m.email || '')
      setMissedRollNumber(m.roll_number || '')
    }
  }

  const handleToggleMissedHour = (hour: number) => {
    setMissedHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    )
  }

  const handleAddMissedRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!missedName.trim() || !missedEmail.trim() || !missedRollNumber.trim()) {
      toast.error('Student Name, Email, and Roll Number are required')
      return
    }
    if (missedHours.length === 0) {
      toast.error('Please select at least one hour (Hour 1 to 7)')
      return
    }

    setIsAddingMissed(true)
    const res = await addMissedAttendanceRecord({
      sourceType: 'shoot',
      sourceId: request.id,
      userId: missedMemberId || null,
      name: missedName,
      email: missedEmail,
      rollNumber: missedRollNumber,
      hours: missedHours,
      notes: missedNotes,
    })
    setIsAddingMissed(false)

    if (res.error) {
      toast.error(res.error)
    } else if (res.data) {
      toast.success(`Recorded missed attendance for ${missedName} (${missedHours.length} hours)`)
      setMissedRecords((prev) => [res.data!, ...prev])
      setMissedName('')
      setMissedEmail('')
      setMissedRollNumber('')
      setMissedHours([1])
      setMissedNotes('')
      setMissedMemberId('')
      setShowAddMissedDialog(false)
      router.refresh()
    }
  }

  const handleDeleteMissedRecord = async (recordId: string) => {
    if (!confirm('Remove this missed attendance record?')) return
    const res = await deleteMissedAttendanceRecord(recordId, 'shoot', request.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Missed attendance record removed')
      setMissedRecords((prev) => prev.filter((r) => r.id !== recordId))
      router.refresh()
    }
  }

  const handleExportMissedAttendance = () => {
    if (missedRecords.length === 0) {
      toast.info('No missed attendance records logged for this shoot yet')
      return
    }
    exportMissedAttendanceToXlsx({
      title: request.event_name,
      date: request.event_date,
      sourceType: 'shoot',
      items: missedRecords,
    })
    toast.success('Exporting missed attendance to Excel (.xlsx)...')
  }


  const allocatedGearItems = (() => {
    const map = new Map<string, { equipment: any; custodian: any; eqAssignmentId?: string; assignmentId?: string }>()

    for (const ea of (request.equipment_assignments || [])) {
      if (ea.equipment && !ea.returned_at) {
        map.set(ea.equipment.id, {
          equipment: ea.equipment,
          custodian: ea.profiles,
          eqAssignmentId: ea.id,
        })
      }
    }

    for (const a of (request.assignments || [])) {
      if (a.equipment && !map.has(a.equipment.id)) {
        map.set(a.equipment.id, {
          equipment: a.equipment,
          custodian: a.profiles,
          assignmentId: a.id,
        })
      }
    }

    return Array.from(map.values())
  })()

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-none',
      approved: 'bg-cyan-500/10 text-cyan-400 border-none',
      assigned: 'bg-blue-500/10 text-blue-400 border-none',
      ongoing: 'bg-purple-500/10 text-purple-400 border-none',
      completed: 'bg-green-500/10 text-green-500 border-none',
      delivered: 'bg-emerald-500/10 text-emerald-400 border-none',
      rejected: 'bg-red-500/10 text-red-500 border-none',
    }

    return (
      <Badge className={cn("text-[10px] font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider", styles[status] || styles.pending)}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/apex"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-400 transition-colors w-fit font-semibold"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Request Pipeline
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-2">
          <div className="flex items-center gap-3">
            <Send className="h-7 w-7 text-cyan-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{request.event_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(request.status)}
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                  {request.coverage_type} Coverage
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {request.status === 'assigned' && (
              <Button
                onClick={() => handleStatusTransition('ongoing')}
                disabled={isPending}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Ongoing
              </Button>
            )}
            {['assigned', 'ongoing'].includes(request.status) && (
              <Button
                onClick={() => handleStatusTransition('completed')}
                disabled={isPending}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Completed
              </Button>
            )}
            {request.status === 'completed' && (
              <Button
                onClick={() => handleStatusTransition('delivered')}
                disabled={isPending}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl px-4 h-9"
              >
                Mark Delivered
              </Button>
            )}

            {/* Delete Shoot Button */}
            <Button
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending || isDeletingShoot}
              size="sm"
              variant="outline"
              className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:text-red-300 text-xs font-bold rounded-xl px-3.5 h-9 gap-1.5 transition-all shadow-sm"
              title="Delete shoot entirely from database"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Shoot
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Layout - Perfectly aligned across container width with no overflow */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-1.5 shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                "w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none",
                activeTab === 'overview'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <Info className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={cn(
                "w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none",
                activeTab === 'assignments'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <Users className="h-4 w-4" />
              <span>Crew & Gear</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deliverables')}
              className={cn(
                "w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none",
                activeTab === 'deliverables'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <FolderHeart className="h-4 w-4" />
              <span>Deliverables</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={cn(
                "w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none",
                activeTab === 'attendance'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <UserCheck className="h-4 w-4" />
              <span>Check-in Logs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missed-attendance')}
              className={cn(
                "w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all col-span-2 sm:col-span-1 cursor-pointer select-none",
                activeTab === 'missed-attendance'
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <Clock className={cn("h-4 w-4", activeTab === 'missed-attendance' ? "text-black" : "text-amber-400")} />
              <span>Missed Attendance</span>
              {missedRecords.length > 0 && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1",
                  activeTab === 'missed-attendance'
                    ? "bg-black/20 text-black"
                    : "bg-amber-500/20 text-amber-300"
                )}>
                  {missedRecords.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border border-white/5 bg-black/40 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Assigned Crew</span>
                <span className="text-xl font-extrabold text-white">{request.assignments?.length || 0} Members</span>
              </div>
            </Card>

            <Card className="border border-white/5 bg-black/40 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Cameras & Gear</span>
                <span className="text-xl font-extrabold text-white">{allocatedGearItems.length} Allocated</span>
              </div>
            </Card>

            <Card className="border border-white/5 bg-black/40 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <FolderHeart className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Deliverables</span>
                <span className="text-xl font-extrabold text-white">{request.media?.length || 0} Media Files</span>
              </div>
            </Card>

            <Card className="border border-white/5 bg-black/40 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Missed Attendance</span>
                <span className="text-xl font-extrabold text-amber-300">{missedRecords.length} Logged</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Columns: Organizer Details, Registration Log & Notes */}
            <div className="md:col-span-2 space-y-6">
              {/* Event & Organizer Details Card */}
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Event & Organizer Details</h3>
                      <p className="text-xs text-neutral-400">Official host, point of contact, and communication channels.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setEditEventName(request.event_name || '')
                      setEditOrganizerName(request.organizer_name || '')
                      setEditDepartment(request.department || '')
                      setEditContactEmail(request.contact_email || '')
                      setEditContactPhone(request.contact_phone || '')
                      setEditVenue(request.venue || '')
                      setEditEventDate(request.event_date || '')
                      setEditEventTime(request.event_time || '')
                      setEditEndTime(request.end_time || '')
                      setEditCoverageType(request.coverage_type || 'both')
                      setEditNotes(request.notes || '')
                      setShowEditDialog(true)
                    }}
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Shoot Details
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-neutral-300">
                  <div className="bg-white/[0.015] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-cyan-400" />
                      Organizer / Point of Contact
                    </span>
                    <span className="text-white font-bold text-base block">{request.organizer_name || 'N/A'}</span>
                  </div>

                  <div className="bg-white/[0.015] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-cyan-400" />
                      Host / Department
                    </span>
                    <span className="text-white font-bold text-base block">{request.department || 'N/A'}</span>
                  </div>

                  <div className="bg-white/[0.015] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-cyan-400" />
                      Contact Email
                    </span>
                    {request.contact_email ? (
                      <a
                        href={`mailto:${request.contact_email}`}
                        className="text-cyan-400 hover:underline font-medium break-all block text-sm"
                      >
                        {request.contact_email}
                      </a>
                    ) : (
                      <span className="text-neutral-500 italic">Not provided</span>
                    )}
                  </div>

                  <div className="bg-white/[0.015] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-cyan-400" />
                      Contact Phone
                    </span>
                    {request.contact_phone ? (
                      <a
                        href={`tel:${request.contact_phone}`}
                        className="text-cyan-400 hover:underline font-medium block text-sm"
                      >
                        {request.contact_phone}
                      </a>
                    ) : (
                      <span className="text-neutral-500 italic">Not provided</span>
                    )}
                  </div>
                </div>

                {request.notes && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                      Client Requirements & Briefing Notes
                    </h4>
                    <p className="text-sm text-neutral-300 bg-white/[0.02] border border-white/5 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                      {request.notes}
                    </p>
                  </div>
                )}

                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl space-y-1">
                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Rejection Reason</h4>
                    <p className="text-sm text-red-200 italic">"{request.rejection_reason}"</p>
                  </div>
                )}
              </Card>

              {/* Registered / Assigned By Card */}
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Shoot Registered & Scheduled By</h3>
                </div>

                {request.reviewed_by_profile ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.015] border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-900 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        {request.reviewed_by_profile.avatar_url ? (
                          <img src={request.reviewed_by_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-cyan-400 uppercase">
                            {(request.reviewed_by_profile.full_name || 'U').slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{request.reviewed_by_profile.full_name}</span>
                          <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[9px] uppercase tracking-wider py-0 px-2 rounded-full font-bold">
                            {request.reviewed_by_profile.role}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-0.5">
                          <span>{request.reviewed_by_profile.email}</span>
                          {request.reviewed_by_profile.phone && <span>• {request.reviewed_by_profile.phone}</span>}
                          {request.reviewed_by_profile.roll_number && <span>• Roll: {request.reviewed_by_profile.roll_number}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Registered Timestamp</span>
                      <span className="text-xs text-neutral-300 font-medium">
                        {new Date(request.created_at || request.reviewed_at || Date.now()).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-neutral-400 flex items-center justify-between">
                    <span>Submitted via Public APEX Coverage Request Portal</span>
                    <span className="text-neutral-500 font-mono">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Schedule & Venue Card */}
            <div className="space-y-6">
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Shoot Schedule</h3>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Date</span>
                    <span className="text-white font-bold text-sm block">
                      {new Date(request.event_date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Time Window</span>
                    <span className="text-white font-medium text-sm block">
                      {request.event_time ? request.event_time : 'Not specified'}
                      {request.end_time ? ` to ${request.end_time}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-white/5 pt-4">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Venue / Location</span>
                    <span className="text-white font-medium text-sm block">
                      {request.venue || 'Campus (Unspecified)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-white/5 pt-4">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Camera className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Coverage Requirement</span>
                    <span className="text-cyan-400 font-bold uppercase tracking-wider text-xs block capitalize">
                      {request.coverage_type} Coverage
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* Tab 2: Crew & Gear Assignments */}
        <TabsContent value="assignments" className="mt-6">
          {['pending', 'rejected'].includes(request.status) ? (
            <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center text-sm text-neutral-500">
               te requests must be APPROVED before assigning crews and checking out equipment.
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Assignments List */}
              <div className="xl:col-span-2 space-y-6">
                {/* Allocated Equipment Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-md font-bold text-white px-1">
                        Allocated Shoot Cameras & Gear ({allocatedGearItems.length})
                      </h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAllocateDialog(!showAllocateDialog)}
                      className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold rounded-xl h-8 px-3 text-xs gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {showAllocateDialog ? 'Cancel' : 'Allocate Camera / Gear'}
                    </Button>
                  </div>

                  {/* Inline Allocation Card */}
                  {showAllocateDialog && (
                    <Card className="border border-cyan-500/30 bg-cyan-500/5 p-4 rounded-xl">
                      <form onSubmit={handleAllocateEquipment} className="space-y-3">
                        <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          Allocate Additional Camera / Gear
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-neutral-400">Select Equipment</Label>
                            <select
                              value={allocGearId}
                              onChange={(e) => setAllocGearId(e.target.value)}
                              className="w-full border border-white/10 bg-neutral-950 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500/30 h-10 focus:outline-none"
                            >
                              <option value="">Choose camera or gear...</option>
                              {usableEquipment.map((eq) => (
                                <option key={eq.id} value={eq.id}>
                                  {eq.name} ({eq.type}){eq.status === 'assigned' ? ' — [In Use / Reserved]' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-neutral-400">Designated Custodian</Label>
                            <MemberSearchCombobox
                              members={members}
                              selectedMemberId={allocCustodianId}
                              onSelectMember={(m) => setAllocCustodianId(m ? m.id : '')}
                              filterOnlyCameraHolders={true}
                              placeholder="Search camera holder..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllocateDialog(false)}
                            className="text-neutral-400 text-xs h-8"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isPending}
                            size="sm"
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs h-8 px-4"
                          >
                            {isPending ? 'Allocating...' : 'Confirm Allocation'}
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {allocatedGearItems.length === 0 ? (
                    <Card className="border border-dashed border-white/5 bg-black/20 rounded-xl p-4 text-center text-xs text-neutral-500">
                      No club cameras or gear currently allocated to this shoot.
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allocatedGearItems.map((item) => (
                        <Card
                          key={item.equipment.id}
                          className="border border-cyan-500/20 bg-cyan-500/5 p-3.5 flex items-start justify-between gap-3 rounded-xl"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Camera className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs">{item.equipment.name}</span>
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-[9px] uppercase tracking-wider capitalize">
                                  {item.equipment.type}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-neutral-400 space-y-0.5 mt-0.5">
                                <p>Model: {item.equipment.model || item.equipment.type} • S/N: {item.equipment.serial_number || 'N/A'}</p>
                                {item.custodian && (
                                  <p className="text-cyan-300 font-medium text-[10px]">
                                    Custodian: <strong>{item.custodian.full_name}</strong>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEquipment(item.eqAssignmentId || '', item.equipment.id)}
                            disabled={isPending}
                            className="h-7 w-7 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                            title="Return / Remove Equipment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Crews Assigned */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <h3 className="text-md font-bold text-white px-1">Crews Assigned ({request.assignments?.length || 0})</h3>
                  {request.assignments?.length === 0 ? (
                    <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-8 text-center text-sm text-neutral-500">
                      No team members assigned yet. Use the assignment panel to assign photographers, videographers, or editors.
                    </Card>
                  ) : (
                    <div className="space-y-3">
                    {request.assignments.map((assignment: any) => (
                      <Card key={assignment.id} className="border-white/5 bg-black/30 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                            {assignment.profiles?.avatar_url ? (
                              <img src={assignment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase">
                                {(assignment.profiles?.full_name || 'U').slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block leading-none mb-1">
                              {assignment.profiles?.full_name || 'Crew Member'}
                            </span>
                            <span className="text-[10px] text-neutral-500 block leading-none capitalize">
                              {assignment.role}
                            </span>
                          </div>
                        </div>

                        {/* Equipment Assigned */}
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-neutral-500 shrink-0" />
                          <div className="text-xs">
                            <span className="text-neutral-500 block uppercase text-[8px] font-semibold">Equipment Checkout</span>
                            <span className="text-neutral-200">
                              {assignment.equipment?.name ? `${assignment.equipment.name} (${assignment.equipment.model})` : 'None checkout'}
                            </span>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider border",
                            assignment.status === 'accepted' && "border-green-500/20 bg-green-500/5 text-green-500",
                            assignment.status === 'rejected' && "border-red-500/20 bg-red-500/5 text-red-500",
                            assignment.status === 'pending' && "border-yellow-500/20 bg-yellow-500/5 text-yellow-500"
                          )}>
                            {assignment.status}
                          </span>
                          <Button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            disabled={isPending}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Form */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-white px-1">Assign Teammate</h3>
                <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-5">
                  <form onSubmit={handleAssignMember} className="space-y-4">
                    {/* Select Member */}
                    <div className="space-y-1.5">
                      <Label className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Select Member</Label>
                      <MemberSearchCombobox
                        members={members}
                        selectedMemberId={selectedMemberId}
                        disabledMemberIds={(request.assignments || []).map((a: any) => a.user_id)}
                        onSelectMember={(mem) => setSelectedMemberId(mem ? mem.id : '')}
                        placeholder="Search teammate by name, dept, roll #..."
                      />
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Coverage Role</Label>
                      <select
                        id="role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                      >
                        <option value="photographer">Photographer</option>
                        <option value="videographer">Videographer</option>
                        <option value="editor">Editor</option>
                      </select>
                    </div>

                    {/* Equipment Checkout (Optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="equipment" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">Assign Equipment (Optional)</Label>
                      <select
                        id="equipment"
                        value={selectedEquipmentId}
                        onChange={(e) => setSelectedEquipmentId(e.target.value)}
                        className="w-full border border-white/5 bg-neutral-950 text-white rounded-xl px-3 py-2 text-sm focus:border-cyan-500/30 h-11 focus:outline-none"
                      >
                        <option value="">Check out gear...</option>
                        {usableEquipment.map(eq => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} ({eq.model || eq.type}){eq.status === 'assigned' ? ' — [Reserved / In Use]' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-neutral-500 px-1 mt-1">Gear marked [Reserved / In Use] can still be assigned if available for this date.</p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Assign Teammate
                        </>
                      )}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Deliverables */}
        <TabsContent value="deliverables" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <FolderHeart className="h-5 w-5 text-cyan-400" />
                Coverage Deliverables ({request.media?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400">
                Media files uploaded by the coverage crew for client delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {request.media?.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 border border-dashed border-white/5 rounded-2xl bg-white/[0.001]">
                  No deliverables uploaded yet. Crew members upload files in the "My Assignments" portal.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {request.media.map((media: any) => (
                    <div key={media.id} className="border border-white/5 bg-black/20 rounded-2xl overflow-hidden group relative">
                      <div className="aspect-video w-full bg-neutral-900 overflow-hidden relative">
                        {media.media_type === 'image' ? (
                          <img src={media.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <video src={media.url} className="h-full w-full object-cover" controls />
                        )}
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-black/50 text-white hover:text-cyan-400">
                            <a href={media.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            onClick={() => handleDeleteDeliverable(media.id)}
                            disabled={isPending}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full bg-black/50 text-white hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 text-[10px] text-neutral-500 flex justify-between items-center bg-white/[0.01]">
                        <span>Uploaded by {media.profiles?.full_name}</span>
                        <span className="capitalize">{media.media_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Check-in Logs */}
        <TabsContent value="attendance" className="mt-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-cyan-400" />
                Crew Logged Hours & Check-ins
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400">
                Tracked timings and session hours for coverage assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {/* Gather assignments check-in info */}
              {!request.assignments || request.assignments.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500">
                  No assignments checked in yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-white/5 rounded-2xl overflow-hidden">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6">Crew Member</th>
                        <th className="py-4 px-6">Check-In</th>
                        <th className="py-4 px-6">Check-Out</th>
                        <th className="py-4 px-6 text-center">Hours Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {request.assignments.map((assignment: any) => {
                        const attendance = assignment.apex_attendance?.[0]
                        return (
                          <tr key={assignment.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
                                  {assignment.profiles?.avatar_url ? (
                                    <img src={assignment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-neutral-500 uppercase">
                                      {(assignment.profiles?.full_name || 'U').slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-white">{assignment.profiles?.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-neutral-300 text-xs">
                              {attendance?.checked_in_at 
                                ? new Date(attendance.checked_in_at).toLocaleString() 
                                : <span className="italic text-neutral-600">Not checked in</span>}
                            </td>
                            <td className="py-4 px-6 text-neutral-300 text-xs">
                              {attendance?.checked_out_at 
                                ? new Date(attendance.checked_out_at).toLocaleString() 
                                : <span className="italic text-neutral-600">Not checked out</span>}
                            </td>
                            <td className="py-4 px-6 text-center text-cyan-400 font-extrabold">
                              {attendance?.hours_logged !== null && attendance?.hours_logged !== undefined
                                ? `${attendance.hours_logged} hrs` 
                                : <span className="text-neutral-600 font-normal italic">-</span>}
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
        </TabsContent>

        {/* Tab 5: Missed Attendance */}
        <TabsContent value="missed-attendance" className="mt-6 space-y-4">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  Missed Attendance Tracking ({missedRecords.length})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  College institute rules require hourly attendance (Hours 1 to 7). Exporting generates an .xlsx file with each missed hour on a distinct row.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleExportMissedAttendance}
                  disabled={missedRecords.length === 0}
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 font-bold rounded-xl h-9 px-3.5 text-xs gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  Export Missed Attendance (XLSX)
                </Button>

                <Button
                  onClick={() => setShowAddMissedDialog(true)}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-95 font-bold rounded-xl h-9 px-3.5 text-xs gap-1.5 shadow-md shadow-amber-950/20"
                >
                  <Plus className="h-4 w-4" />
                  Record Missed Attendance
                </Button>
              </div>
            </div>

            <CardContent className="px-0 pb-0 pt-4">
              {missedRecords.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.005] p-6 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No Missed Attendance Logged</h4>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                      If crew members missed their college hourly attendance while covering this shoot, click "Record Missed Attendance" to log their name, roll number, and missed hours.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddMissedDialog(true)}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs h-8 px-3 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record First Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-white/5 rounded-2xl overflow-hidden">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                        <th className="py-4 px-6">S.No</th>
                        <th className="py-4 px-6">Student Name</th>
                        <th className="py-4 px-6">Roll Number</th>
                        <th className="py-4 px-6">College Email</th>
                        <th className="py-4 px-6">Missed Hours (1–7)</th>
                        <th className="py-4 px-6">Remarks</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {missedRecords.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-white/[0.015] transition-colors">
                          <td className="py-4 px-6 font-mono text-neutral-500 text-xs">{idx + 1}</td>
                          <td className="py-4 px-6 font-bold text-white">{item.name}</td>
                          <td className="py-4 px-6 font-mono text-cyan-400 text-xs font-semibold">
                            {item.roll_number?.toUpperCase() || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-neutral-300 text-xs font-mono">{item.email}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap items-center gap-1">
                              {(Array.isArray(item.hours) ? item.hours : [1]).map((h) => (
                                <Badge
                                  key={h}
                                  className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold py-0.5 px-2 rounded-md"
                                >
                                  Hour {h}
                                </Badge>
                              ))}
                              <span className="text-[10px] text-neutral-500 font-medium ml-1">
                                ({Array.isArray(item.hours) ? item.hours.length : 1} hrs)
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-neutral-400 text-xs max-w-xs truncate">
                            {item.notes || <span className="italic text-neutral-600">None</span>}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              onClick={() => handleDeleteMissedRecord(item.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Shoot Details Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-neutral-950 border border-white/10 text-white rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                Edit Shoot Details
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-white">
              Update Shoot Information
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Update organizer contact information, schedule, venue, and client notes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateShootDetails} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">
                Shoot / Event Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={editEventName}
                onChange={(e) => setEditEventName(e.target.value)}
                required
                className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Organizer / Contact Person <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={editOrganizerName}
                  onChange={(e) => setEditOrganizerName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Rajesh Kumar / Faheem"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Host / Department
                </Label>
                <Input
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. IECC / CSE Dept"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Contact Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  required
                  placeholder="e.g. faheem@bitsathy.ac.in"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Contact Phone
                </Label>
                <Input
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-neutral-300">
                  Venue / Location
                </Label>
                <Input
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="e.g. SF Seminar Hall 2"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Shoot Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={editEventDate}
                  onChange={(e) => setEditEventDate(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Coverage Type
                </Label>
                <select
                  value={editCoverageType}
                  onChange={(e) => setEditCoverageType(e.target.value as any)}
                  className="w-full border border-white/10 bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500/40 h-10 focus:outline-none"
                >
                  <option value="both">Both Photography & Videography</option>
                  <option value="photography">Photography Only</option>
                  <option value="videography">Videography Only</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={editEventTime}
                  onChange={(e) => setEditEventTime(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  End Time
                </Label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">
                Client Notes & Requirements
              </Label>
              <Textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Special instructions or briefing details..."
                className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditDialog(false)}
                className="text-neutral-400 text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingDetails}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs h-9 px-4 rounded-xl"
              >
                {isUpdatingDetails ? 'Saving...' : 'Save Shoot Details'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Shoot Confirmation Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-neutral-950 border border-red-500/20 text-white rounded-3xl max-w-md p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-white">
              Delete Shoot Permanently?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 leading-relaxed">
              This will permanently delete <strong className="text-white">"{request.event_name}"</strong> from the PhotoHub database.
              All crew assignments, camera checkouts, attendance logs, deliverables, and missed attendance logs associated with this shoot will be wiped completely.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingShoot}
              className="text-neutral-400 text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteShoot}
              disabled={isDeletingShoot}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-lg shadow-red-950/30"
            >
              {isDeletingShoot ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting from DB...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Yes, Delete Entirely
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Missed Attendance Modal */}
      <Dialog open={showAddMissedDialog} onOpenChange={setShowAddMissedDialog}>
        <DialogContent className="bg-neutral-950 border border-amber-500/20 text-white rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                Institute PCDP Rules
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Record Missed Attendance
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Log students who missed their hourly college attendance (Hours 1 to 7). Exporting will produce a dedicated row for each individual hour missed.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMissedRecord} className="space-y-4 pt-3">
            {/* Quick picker from assigned crew */}
            {request.assignments && request.assignments.length > 0 && (
              <div className="space-y-1.5 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-amber-300 block">
                  Quick Select from Assigned Crew
                </Label>
                <select
                  value={missedMemberId}
                  onChange={(e) => handleSelectMissedMember(e.target.value)}
                  className="w-full border border-white/10 bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500/40 h-9 focus:outline-none"
                >
                  <option value="">-- Choose a crew member or type details below --</option>
                  {request.assignments.map((a: any) => (
                    <option key={a.id} value={a.user_id}>
                      {a.profiles?.full_name} ({a.role}) • {a.profiles?.roll_number || a.profiles?.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-neutral-300">
                  Student Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={missedName}
                  onChange={(e) => setMissedName(e.target.value)}
                  required
                  placeholder="e.g. Faheem M"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  Roll Number <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={missedRollNumber}
                  onChange={(e) => setMissedRollNumber(e.target.value)}
                  required
                  placeholder="e.g. 7376221EC101 / EC25"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10 uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-300">
                  College Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="email"
                  value={missedEmail}
                  onChange={(e) => setMissedEmail(e.target.value)}
                  required
                  placeholder="e.g. student@bitsathy.ac.in"
                  className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
                />
              </div>
            </div>

            {/* 7 Hours Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-neutral-300">
                  Select Missed Hours (1 through 7) <span className="text-red-400">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (missedHours.length === 7) setMissedHours([1])
                    else setMissedHours([1, 2, 3, 4, 5, 6, 7])
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 h-6 px-2 py-0"
                >
                  {missedHours.length === 7 ? 'Clear to 1' : 'Select All 7 Hours'}
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                  const isSelected = missedHours.includes(hour)
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleToggleMissedHour(hour)}
                      className={cn(
                        "py-2.5 px-1 rounded-xl border text-center transition-all text-xs font-extrabold flex flex-col items-center justify-center gap-0.5",
                        isSelected
                          ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-950/20"
                          : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <span className="text-[10px] opacity-70">Hr</span>
                      <span className="text-sm">{hour}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-neutral-500">
                Selected: <strong>{missedHours.length}</strong> hour(s). In XLSX export, each selected hour will become its own row!
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-300">
                Reason / Shoot Coverage Remarks
              </Label>
              <Input
                value={missedNotes}
                onChange={(e) => setMissedNotes(e.target.value)}
                placeholder="e.g. On-duty coverage during Inaugural ceremony"
                className="border-white/10 bg-white/[0.03] text-white rounded-xl text-sm h-10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddMissedDialog(false)}
                disabled={isAddingMissed}
                className="text-neutral-400 text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingMissed}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md shadow-amber-950/20"
              >
                {isAddingMissed ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Entry...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Record Missed Attendance
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

  )
}
