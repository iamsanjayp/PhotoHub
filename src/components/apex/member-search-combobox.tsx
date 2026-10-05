'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Check,
  ChevronsUpDown,
  X,
  Camera,
  ShieldAlert,
  User,
  Sparkles,
  Building2,
  GraduationCap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { canAccessCamera, ROLE_LABELS } from '@/lib/constants/roles'

export interface MemberProfile {
  id: string
  full_name: string | null
  email: string
  role: string
  batch?: string | null
  department?: string | null
  avatar_url?: string | null
  phone?: string | null
  roll_number?: string | null
}

interface MemberSearchComboboxProps {
  members: MemberProfile[]
  selectedMemberId: string
  onSelectMember: (member: MemberProfile | null) => void
  placeholder?: string
  disabledMemberIds?: string[]
  filterOnlyCameraHolders?: boolean
  className?: string
  disabled?: boolean
}

export function MemberSearchCombobox({
  members,
  selectedMemberId,
  onSelectMember,
  placeholder = 'Search teammate by name, dept, roll #...',
  disabledMemberIds = [],
  filterOnlyCameraHolders = false,
  className,
  disabled = false,
}: MemberSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'camera_holders' | 'board' | 'committee' | 'member'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Find selected member object
  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  )

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filtered members
  const filteredMembers = useMemo(() => {
    let list = members

    if (filterOnlyCameraHolders) {
      list = list.filter((m) => canAccessCamera(m.role))
    }

    if (roleFilter === 'camera_holders') {
      list = list.filter((m) => canAccessCamera(m.role))
    } else if (roleFilter === 'board') {
      list = list.filter((m) => m.role === 'board_member')
    } else if (roleFilter === 'committee') {
      list = list.filter((m) => m.role === 'committee_member')
    } else if (roleFilter === 'member') {
      list = list.filter((m) => m.role === 'member')
    }

    if (!searchQuery.trim()) {
      return list
    }

    const q = searchQuery.toLowerCase().trim()
    return list.filter((m) => {
      const name = (m.full_name || '').toLowerCase()
      const email = (m.email || '').toLowerCase()
      const dept = (m.department || '').toLowerCase()
      const roll = (m.roll_number || '').toLowerCase()
      const batch = (m.batch || '').toLowerCase()
      const roleText = (ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] || m.role).toLowerCase()

      return (
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        roll.includes(q) ||
        batch.includes(q) ||
        roleText.includes(q)
      )
    })
  }, [members, filterOnlyCameraHolders, roleFilter, searchQuery])

  const handleSelect = (member: MemberProfile) => {
    if (disabledMemberIds.includes(member.id) && member.id !== selectedMemberId) {
      return
    }
    onSelectMember(member)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectMember(null)
  }

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-xl border transition-all text-xs h-10',
          isOpen
            ? 'border-cyan-500/50 bg-neutral-900/90 ring-1 ring-cyan-500/20 shadow-md shadow-cyan-950/20'
            : 'border-white/10 bg-neutral-900/60 hover:bg-neutral-900 hover:border-white/20 text-neutral-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
          {selectedMember ? (
            <>
              <Avatar className="h-6 w-6 border border-white/10 shrink-0">
                {selectedMember.avatar_url && (
                  <AvatarImage src={selectedMember.avatar_url} alt={selectedMember.full_name || ''} />
                )}
                <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                  {(selectedMember.full_name || selectedMember.email || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-white truncate text-xs">
                  {selectedMember.full_name || selectedMember.email}
                </span>

                <Badge
                  className={cn(
                    'text-[9px] px-1.5 py-0 rounded-full font-bold uppercase tracking-wider shrink-0 border-none',
                    selectedMember.role === 'admin' && 'bg-red-500/15 text-red-400',
                    selectedMember.role === 'board_member' && 'bg-purple-500/15 text-purple-400',
                    selectedMember.role === 'committee_member' && 'bg-cyan-500/15 text-cyan-400',
                    selectedMember.role === 'member' && 'bg-neutral-700/50 text-neutral-300'
                  )}
                >
                  {ROLE_LABELS[selectedMember.role as keyof typeof ROLE_LABELS] || selectedMember.role}
                </Badge>

                {selectedMember.department && (
                  <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                    • {selectedMember.department}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-neutral-500">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs truncate">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedMember && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 text-neutral-500 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-500" />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[300px] sm:min-w-[380px] z-50 rounded-2xl border border-white/15 bg-neutral-950/95 backdrop-blur-2xl shadow-2xl p-2.5 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search by name, email, department, roll #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-neutral-900/90 border-white/10 rounded-xl text-white placeholder-neutral-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          {!filterOnlyCameraHolders && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={cn(
                  'px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                  roleFilter === 'all'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white'
                )}
              >
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('camera_holders')}
                className={cn(
                  'px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1',
                  roleFilter === 'camera_holders'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white'
                )}
              >
                <Camera className="h-2.5 w-2.5" />
                Camera Holders
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('committee')}
                className={cn(
                  'px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                  roleFilter === 'committee'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white'
                )}
              >
                Committee
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('board')}
                className={cn(
                  'px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                  roleFilter === 'board'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white'
                )}
              >
                Board
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No club members found matching "{searchQuery}"
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = member.id === selectedMemberId
                const isDisabled = disabledMemberIds.includes(member.id) && !isSelected
                const isCameraEligible = canAccessCamera(member.role)

                return (
                  <div
                    key={member.id}
                    onClick={() => !isDisabled && handleSelect(member)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-xs',
                      isSelected
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                        : isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-white/[0.01]'
                        : 'hover:bg-white/[0.06] text-neutral-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-7 w-7 border border-white/10 shrink-0">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name || ''} />}
                        <AvatarFallback className="bg-neutral-800 text-neutral-300 text-[10px] font-bold">
                          {(member.full_name || member.email || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white truncate text-xs">
                            {member.full_name || member.email}
                          </span>

                          {isCameraEligible && (
                            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[8px] font-bold px-1.5 py-0 rounded-full flex items-center gap-0.5">
                              <Camera className="h-2 w-2" />
                              Holder
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 truncate mt-0.5">
                          <span className="capitalize">
                            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                          </span>
                          {member.department && (
                            <>
                              <span>•</span>
                              <span className="truncate">{member.department}</span>
                            </>
                          )}
                          {member.roll_number && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{member.roll_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-cyan-400" />
                      ) : isDisabled ? (
                        <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">
                          In Crew
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
