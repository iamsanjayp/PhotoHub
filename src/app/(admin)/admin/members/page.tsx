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
import { Users, Search, ShieldAlert, CheckCircle, Ban, RefreshCw, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminMembersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

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
    }
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
      toast.success('Account deactivated and suspended')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to deactivate account')
    }
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
      toast.success('Account reactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reactivate account')
    }
  })

  // Filtering
  const filteredMembers = members.filter((m) => {
    const matchSearch = 
      (m.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (m.email || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const handleRoleChange = (userId: string, newRole: any) => {
    if (!confirm(`Are you sure you want to change this member's role to ${newRole}?`)) return
    assignRoleMutation.mutate({ userId, role: newRole })
  }

  const handleDeactivateToggle = (member: any) => {
    const action = member.is_active ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} this account?`)) return

    if (member.is_active) {
      deactivateMutation.mutate(member.id)
    } else {
      reactivateMutation.mutate(member.id)
    }
  }

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'leader', label: 'Leader' },
    { value: 'camera_holder', label: 'Camera Holder' },
    { value: 'participant', label: 'Participant' },
    { value: 'guest', label: 'Guest' },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Users className="h-7 w-7 text-cyan-400" />
          Member Directory
        </h1>
        <p className="text-neutral-400 text-sm">
          Promote roles, activate or suspend member accounts, and review profiles.
        </p>
      </div>

      {/* Search Filter */}
      <div className="flex gap-4 items-center bg-black/20 p-4 border border-white/5 rounded-2xl max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            Club Members
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Total active members: {members.filter(m => m.is_active).length}
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
              No members found matching the search.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/5">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider pl-6">Member</TableHead>
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

                    {/* Actions toggling suspend */}
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeactivateToggle(member)}
                        disabled={deactivateMutation.isPending || reactivateMutation.isPending}
                        className={cn(
                          "h-8 text-xs font-semibold rounded-lg px-3 gap-1",
                          member.is_active 
                            ? "text-red-500 hover:text-red-400 hover:bg-red-500/5" 
                            : "text-green-500 hover:text-green-400 hover:bg-green-500/5"
                        )}
                      >
                        {member.is_active ? (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                            Activate
                          </>
                        )}
                      </Button>
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
