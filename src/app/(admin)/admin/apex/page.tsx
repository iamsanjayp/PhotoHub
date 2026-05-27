'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getApexRequests, approveApexRequest, rejectApexRequest } from '@/actions/apex'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Search, 
  Clock, 
  MapPin, 
  Users, 
  Eye, 
  Check, 
  X, 
  Loader2, 
  Calendar,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminApexPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusTab, setStatusTab] = useState('pending')
  const [isPending, startTransition] = useTransition()

  const loadRequests = async () => {
    setLoading(true)
    const res = await getApexRequests('all')
    if (res.error) {
      toast.error(res.error)
    } else {
      setRequests(res.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Approve coverage request for "${name}"?`)) return
    startTransition(async () => {
      const res = await approveApexRequest(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Request approved! You can now assign team members.`)
        setRequests(prev => 
          prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)
        )
      }
    })
  }

  const handleReject = async (id: string, name: string) => {
    const reason = prompt(`Enter rejection reason for "${name}":`)
    if (reason === null) return // cancelled
    if (!reason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    startTransition(async () => {
      const res = await rejectApexRequest(id, reason)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Request rejected.`)
        setRequests(prev => 
          prev.map(r => r.id === id ? { ...r, status: 'rejected', rejection_reason: reason } : r)
        )
      }
    })
  }

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.organizer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.department && req.department.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let matchesStatus = false
    if (statusTab === 'pending') {
      matchesStatus = req.status === 'pending'
    } else if (statusTab === 'active') {
      // approved, assigned, ongoing
      matchesStatus = ['approved', 'assigned', 'ongoing'].includes(req.status)
    } else if (statusTab === 'completed') {
      // completed, delivered
      matchesStatus = ['completed', 'delivered'].includes(req.status)
    } else if (statusTab === 'rejected') {
      matchesStatus = req.status === 'rejected'
    } else {
      matchesStatus = true
    }

    return matchesSearch && matchesStatus
  })

  // Get status styles
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
      <Badge className={cn("text-[9px] font-bold py-0.5 rounded-full uppercase tracking-wider", styles[status] || styles.pending)}>
        {status}
      </Badge>
    )
  }

  // Counter helpers
  const countPending = requests.filter(r => r.status === 'pending').length
  const countActive = requests.filter(r => ['approved', 'assigned', 'ongoing'].includes(r.status)).length
  const countCompleted = requests.filter(r => ['completed', 'delivered'].includes(r.status)).length

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Send className="h-7 w-7 text-cyan-400" />
          APEX Coverage Pipeline
        </h1>
        <p className="text-neutral-400 text-sm">
          Moderate public photography coverage requests, assign club crews, track deliverables, and manage completions.
        </p>
      </div>

      {/* Tabs / Filter bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full md:w-auto">
          <TabsList className="bg-white/[0.02] border border-white/5 group-data-horizontal/tabs:h-10 h-10 p-1 rounded-xl flex overflow-x-auto whitespace-nowrap scrollbar-none w-full md:w-auto">
            <TabsTrigger value="pending" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-4 h-full">
              Pending ({countPending})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-4 h-full">
              Active ({countActive})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-4 h-full">
              Done ({countCompleted})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-4 h-full">
              Rejected
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search by event or organizer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-white/5 bg-black/20 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-neutral-500">Loading requests pipeline...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center">
          <Send className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Requests Found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            There are no coverage requests currently in the "{statusTab}" pipeline.
          </p>
        </Card>
      ) : (
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                    <th className="py-4 px-6">Event Info</th>
                    <th className="py-4 px-6">Organizer</th>
                    <th className="py-4 px-6">Event Date</th>
                    <th className="py-4 px-6">Crews Assigned</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.01] transition-colors group">
                      {/* Event Details */}
                      <td className="py-4 px-6 max-w-xs">
                        <div className="min-w-0">
                          <h4 className="font-bold text-white truncate leading-snug">{req.event_name}</h4>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mt-1">
                            {req.coverage_type} coverage
                          </span>
                        </div>
                      </td>

                      {/* Organizer Details */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-neutral-200 block leading-none mb-1">
                          {req.organizer_name}
                        </span>
                        <span className="text-[10px] text-neutral-500 block leading-none">
                          {req.department || 'No department'}
                        </span>
                      </td>

                      {/* Event Date */}
                      <td className="py-4 px-6 text-neutral-300">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
                          {new Date(req.event_date).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Assigned crews count */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 text-neutral-300 text-xs">
                          <Users className="h-4 w-4 text-neutral-500" />
                          <span>{req.team_count} crew member{req.team_count !== 1 ? 's' : ''}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {getStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleApprove(req.id, req.event_name)}
                                disabled={isPending}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-green-500/10 text-neutral-400 hover:text-green-500 rounded-lg"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleReject(req.id, req.event_name)}
                                disabled={isPending}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg text-neutral-400">
                            <Link href={`/admin/apex/${req.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
