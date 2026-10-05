'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '@/actions/members'
import { adminAssignRole, deactivateAccount, reactivateAccount } from '@/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { Users, Search, CheckCircle, Ban, RefreshCw, KeyRound, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BatchCleanupDialog } from '@/components/admin/batch-cleanup-dialog'

export default function AdminMembersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')

  // Query members list
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      const res = await getMembers()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const members = result || []
  const activeCount = members.filter((m) => m.is_active).length
  const suspendedCount = members.filter((m) => !m.is_active).length

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: any }) => {
      const res = await adminAssignRole(userId, role)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Member role updated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update role')
    },
  })

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await deactivateAccount(userId)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Account suspended — access blocked immediately')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to deactivate account')
    },
  })

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await reactivateAccount(userId)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Account unblocked and reactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reactivate account')
    },
  })

  // Filtering
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch =
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.roll_number || '').toLowerCase().includes(q) ||
      (m.batch || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)

    if (!matchSearch) return false

    if (statusFilter === 'active') return m.is_active
    if (statusFilter === 'suspended') return !m.is_active
    return true
  })

  const handleRoleChange = (userId: string, newRole: any) => {
    if (!confirm(`Are you sure you want to change this member's role to ${newRole}?`)) return
    assignRoleMutation.mutate({ userId, role: newRole })
  }

  const handleDeactivateToggle = (member: any) => {
    if (member.is_active) {
      if (
        !confirm(
          `Are you sure you want to SUSPEND ${member.full_name || member.email}? They will be immediately signed out and blocked from logging in.`
        )
      ) {
        return
      }
      deactivateMutation.mutate(member.id)
    } else {
      if (
        !confirm(
          `Are you sure you want to UNBLOCK and reactivate ${member.full_name || member.email}? They will be able to log in and access PhotoHub again.`
        )
      ) {
        return
      }
      reactivateMutation.mutate(member.id)
    }
  }

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'board_member', label: 'Board Member' },
    { value: 'committee_member', label: 'Committee Member' },
    { value: 'member', label: 'Member' },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Batch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-cyan-400" />
            Member Directory
          </h1>
          <p className="text-neutral-400 text-sm">
            Promote roles, activate or suspend member accounts, and manage graduate batch storage.
          </p>
        </div>
        <BatchCleanupDialog />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-black/20 p-4 border border-white/5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search by name, email, roll no, or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900/60 border border-white/5 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              statusFilter === 'all'
                ? "bg-white/10 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            )}
          >
            All ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              statusFilter === 'active'
                ? "bg-green-500/15 text-green-400 shadow-sm"
                : "text-neutral-400 hover:text-green-400"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('suspended')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              statusFilter === 'suspended'
                ? "bg-red-500/15 text-red-400 shadow-sm"
                : "text-neutral-400 hover:text-red-400"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Suspended ({suspendedCount})
          </button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            Club Members
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Showing {filteredMembers.length} of {members.length} members ({activeCount} active, {suspendedCount} suspended)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full bg-neutral-900 rounded-lg" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No members found matching your search or status filter.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/5">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider pl-6">Member</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Batch / Dept</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Role</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Join Date</TableHead>
                  <TableHead className="text-right text-neutral-500 font-bold uppercase text-[10px] tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow 
                    key={member.id}
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Profile detail */}
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/5 shrink-0">
                          <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-neutral-800 text-neutral-400 font-bold text-xs">
                            {member.full_name?.substring(0, 2).toUpperCase() || 'PH'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white block truncate leading-none mb-1">
                            {member.full_name || 'Anonymous'}
                          </span>
                          <span className="text-[10px] text-neutral-500 truncate block">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Batch / Dept */}
                    <TableCell>
                      <div className="text-xs text-neutral-300 font-medium">
                        {member.batch ? `Batch ${member.batch}` : (member.roll_number || '—')}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">
                        {member.department || 'General'}
                      </div>
                    </TableCell>

                    {/* Role dropdown */}
                    <TableCell>
                      <Select 
                        value={member.role} 
                        onValueChange={(val) => handleRoleChange(member.id, val)}
                        disabled={assignRoleMutation.isPending}
                      >
                        <SelectTrigger className="h-8 border-white/5 bg-white/[0.02] text-xs font-semibold rounded-lg text-neutral-300 w-[140px] focus:ring-cyan-500/50 capitalize">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-white/5 text-neutral-200">
                          {roles.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="focus:bg-white/5 focus:text-white capitalize text-xs">
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge className={cn(
                        "border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                        member.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      )}>
                        {member.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>

                    {/* Join Date */}
                    <TableCell className="text-xs text-neutral-400">
                      {format(new Date(member.created_at), 'dd MMM yyyy')}
                    </TableCell>

                    {/* Actions toggling suspend / unblock */}
                    <TableCell className="text-right pr-6">
                      {member.is_active ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivateToggle(member)}
                          disabled={deactivateMutation.isPending || reactivateMutation.isPending}
                          className="h-8 text-xs font-semibold rounded-lg px-3 gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Suspend</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivateToggle(member)}
                          disabled={deactivateMutation.isPending || reactivateMutation.isPending}
                          className="h-8 text-xs font-semibold rounded-lg px-3 gap-1.5 border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-white"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Unblock / Activate</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
