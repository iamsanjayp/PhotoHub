'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMembers } from '@/actions/members'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Search, Filter, RotateCcw, ArrowRight } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants/roles'
import Link from 'next/link'

export default function MembersDirectoryPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['public-members-directory'],
    queryFn: async () => {
      const res = await getMembers()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  // Extract unique departments and batches
  const departments = useMemo(() => {
    const depts = new Set<string>()
    members.forEach((m) => {
      if (m.department && m.department.trim()) {
        depts.add(m.department.trim().toUpperCase())
      }
    })
    return Array.from(depts).sort()
  }, [members])

  const batches = useMemo(() => {
    const bSet = new Set<string>()
    members.forEach((m) => {
      if (m.batch && m.batch.trim()) {
        bSet.add(m.batch.trim())
      }
    })
    return Array.from(bSet).sort((a, b) => b.localeCompare(a))
  }, [members])

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Only show active members in general directory
      if (!m.is_active) return false

      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.roll_number || '').toLowerCase().includes(q) ||
        (m.batch || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q)

      if (!matchSearch) return false

      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      if (departmentFilter !== 'all' && (m.department || '').trim().toUpperCase() !== departmentFilter) return false
      if (batchFilter !== 'all' && (m.batch || '').trim() !== batchFilter) return false

      return true
    })
  }, [members, search, roleFilter, departmentFilter, batchFilter])

  const isFiltered = search !== '' || roleFilter !== 'all' || departmentFilter !== 'all' || batchFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setDepartmentFilter('all')
    setBatchFilter('all')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-cyan-400" />
            PhotoHub Members
          </h1>
          <p className="text-neutral-400 text-sm">
            Meet the photographers, filmmakers, editors, and creators of PhotoHub BIT Sathy.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-black/20 p-4 border border-white/5 rounded-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search by name, roll no, department, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Multi-Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>Filter By:</span>
          </div>

          {/* Role Filter */}
          <div className="w-40">
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || 'all')}>
              <SelectTrigger className="h-8 rounded-xl text-xs bg-white/[0.02] border-white/5 text-neutral-200">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-neutral-900">
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                <SelectItem value="board_member" className="text-xs">Board Member</SelectItem>
                <SelectItem value="committee_member" className="text-xs">Committee Member</SelectItem>
                <SelectItem value="member" className="text-xs">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="w-44">
            <Select value={departmentFilter} onValueChange={(val) => setDepartmentFilter(val || 'all')}>
              <SelectTrigger className="h-8 rounded-xl text-xs bg-white/[0.02] border-white/5 text-neutral-200">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-neutral-900 max-h-56">
                <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept} className="text-xs">
                    Dept: {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Filter */}
          <div className="w-36">
            <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val || 'all')}>
              <SelectTrigger className="h-8 rounded-xl text-xs bg-white/[0.02] border-white/5 text-neutral-200">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-neutral-900 max-h-56">
                <SelectItem value="all" className="text-xs">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch} value={batch} className="text-xs">
                    Batch {batch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl gap-1 ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, idx) => (
            <Skeleton key={idx} className="h-44 w-full bg-neutral-900 rounded-2xl" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-16 text-center text-sm text-neutral-500 border border-white/5 rounded-3xl bg-black/20">
          <Users className="h-10 w-10 text-neutral-600 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-white">No members found</p>
          <p className="text-xs mt-1">Try clearing or adjusting your search filters.</p>
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-4 border-white/10 text-xs rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMembers.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className="group block">
              <Card className="h-full border-white/5 bg-black/40 hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
                <CardContent className="p-0 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-white/10 shrink-0">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-400 font-bold">
                        {member.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                        {member.full_name || 'Member'}
                      </p>
                      {member.roll_number && (
                        <p className="text-[11px] text-neutral-400 font-mono truncate">
                          {member.roll_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-white/10 bg-white/5 font-semibold capitalize">
                      {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                    </Badge>
                    {member.department && (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 border-cyan-500/20 text-cyan-400 bg-cyan-500/5 font-semibold">
                        {member.department}
                      </Badge>
                    )}
                    {member.batch && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        '{member.batch.slice(-2)}
                      </span>
                    )}
                  </div>
                </CardContent>

                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 group-hover:text-cyan-400 transition-colors">
                  <span>View Profile & Work</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
