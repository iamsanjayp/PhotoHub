'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeaderboard, getPointsLog, awardManualPoints, refreshLeaderboardCache } from '@/actions/leaderboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Award, RefreshCw, Users, TrendingUp, Trophy, Plus, Minus, Clock, History, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function AdminLeaderboardPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<'total' | 'monthly' | 'semester'>('total')

  // Manual points form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pointsAmount, setPointsAmount] = useState<number>(0)
  const [reason, setReason] = useState('')

  // Leaderboard query
  const { data: leaderboardResult, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['admin-leaderboard', period],
    queryFn: async () => {
      const res = await getLeaderboard(period)
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const leaderboard = leaderboardResult || []

  // Points log query
  const { data: pointsLogResult, isLoading: pointsLogLoading } = useQuery({
    queryKey: ['admin-points-log'],
    queryFn: async () => {
      const res = await getPointsLog()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const pointsLog = pointsLogResult || []

  // Award points mutation
  const awardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('Please select a user')
      if (pointsAmount === 0) throw new Error('Points cannot be zero')
      if (!reason.trim()) throw new Error('Please provide a reason')
      const res = await awardManualPoints(selectedUserId, pointsAmount, reason.trim())
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-points-log'] })
      toast.success('Points awarded successfully')
      setSelectedUserId('')
      setPointsAmount(0)
      setReason('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to award points')
    },
  })

  // Refresh cache mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await refreshLeaderboardCache()
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-points-log'] })
      toast.success('Leaderboard cache refreshed')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to refresh cache')
    },
  })

  const getPointsValue = (entry: any) => {
    if (period === 'monthly') return entry.monthly_points
    if (period === 'semester') return entry.semester_points
    return entry.total_points
  }

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-400 border-red-500/20',
      leader: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      camera_holder: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      participant: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      guest: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    }
    return config[role] || config.guest
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-7 w-7 text-cyan-400" />
            Leaderboard Management
          </h1>
          <p className="text-neutral-400 text-sm">
            View standings, award manual points, and manage leaderboard cache.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Refresh Cache Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="h-10 border-white/10 bg-white/[0.02] text-neutral-300 hover:bg-white/5 hover:text-white rounded-xl text-xs font-bold gap-2 justify-center"
          >
            <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
            Refresh Cache
          </Button>
 
          {/* Period Filters */}
          <Tabs
            value={period}
            onValueChange={(val) => setPeriod(val as any)}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-white/[0.02] border border-white/5 group-data-horizontal/tabs:h-10 h-10 p-1 rounded-xl w-full md:w-auto flex justify-between md:justify-start">
              <TabsTrigger value="total" className="flex-1 md:flex-initial data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-[11px] md:text-xs font-bold rounded-lg px-3 md:px-5 h-full text-center">
                All Time
              </TabsTrigger>
              <TabsTrigger value="semester" className="flex-1 md:flex-initial data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-[11px] md:text-xs font-bold rounded-lg px-3 md:px-5 h-full text-center">
                Semester
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1 md:flex-initial data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-[11px] md:text-xs font-bold rounded-lg px-3 md:px-5 h-full text-center">
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats Overview Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: leaderboard.length, icon: Users, color: 'text-cyan-400' },
          { label: 'Top Score', value: leaderboard[0] ? getPointsValue(leaderboard[0]) : 0, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Points Awarded', value: pointsLog.length, icon: Award, color: 'text-amber-400' },
          { label: 'Active Period', value: period === 'total' ? 'All Time' : period === 'semester' ? 'Semester' : 'Month', icon: Sparkles, color: 'text-purple-400' },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl bg-white/[0.03] border border-white/5", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-black text-white leading-none mt-0.5">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid: Table + Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Leaderboard Table — 2/3 width */}
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden xl:col-span-2">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              Full Rankings
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              All members ranked by {period === 'total' ? 'all-time' : period === 'semester' ? 'semester' : 'monthly'} points
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboardLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full bg-neutral-900 rounded-lg" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                No leaderboard data available for this period.
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto w-full">
                <Table>
                  <TableHeader className="border-b border-white/5 sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10">
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="w-14 text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Rank</TableHead>
                      <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Member</TableHead>
                      <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider hidden md:table-cell">Role</TableHead>
                      <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Total</TableHead>
                      <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider hidden lg:table-cell">Monthly</TableHead>
                      <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider hidden lg:table-cell">Semester</TableHead>
                      <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider hidden md:table-cell">Events</TableHead>
                      <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider hidden md:table-cell">Subs</TableHead>
                      <TableHead className="text-right text-neutral-500 font-bold uppercase text-[10px] tracking-wider pr-6">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry: any) => (
                      <TableRow
                        key={entry.user_id}
                        className={cn(
                          "border-b border-white/5 hover:bg-white/[0.01] transition-colors",
                          entry.rank <= 3 && "bg-white/[0.01]"
                        )}
                      >
                        <TableCell className="text-center">
                          {entry.rank <= 3 ? (
                            <span className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                              entry.rank === 1 && "bg-amber-500/20 text-amber-400",
                              entry.rank === 2 && "bg-slate-400/20 text-slate-300",
                              entry.rank === 3 && "bg-amber-700/20 text-amber-600",
                            )}>
                              #{entry.rank}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-neutral-500">#{entry.rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-white/5 shrink-0">
                              <AvatarImage src={entry.profiles?.avatar_url || undefined} className="object-cover" />
                              <AvatarFallback className="bg-neutral-800 text-xs text-neutral-400 font-semibold">
                                {entry.profiles?.full_name?.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold text-white truncate max-w-[150px]">
                              {entry.profiles?.full_name || 'Anonymous'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={cn(
                            "border text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                            getRoleBadge(entry.profiles?.role)
                          )}>
                            {entry.profiles?.role?.replace('_', ' ') || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-neutral-300 font-medium tabular-nums">
                          {entry.total_points}
                        </TableCell>
                        <TableCell className="text-center text-xs text-neutral-300 font-medium tabular-nums hidden lg:table-cell">
                          {entry.monthly_points}
                        </TableCell>
                        <TableCell className="text-center text-xs text-neutral-300 font-medium tabular-nums hidden lg:table-cell">
                          {entry.semester_points}
                        </TableCell>
                        <TableCell className="text-center text-xs text-neutral-300 font-medium hidden md:table-cell">
                          {entry.event_count}
                        </TableCell>
                        <TableCell className="text-center text-xs text-neutral-300 font-medium hidden md:table-cell">
                          {entry.submission_count}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="font-black text-sm text-cyan-400 tabular-nums">
                            {getPointsValue(entry)}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-semibold ml-0.5">PTS</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side Panel */}
        <div className="space-y-6">

          {/* Manual Points Award */}
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Award Points
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Manually add or deduct points for a member
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* User Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Select Member</label>
                <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val ?? '')}>
                  <SelectTrigger className="h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/5 text-neutral-200 max-h-60">
                    {leaderboard.map((entry: any) => (
                      <SelectItem
                        key={entry.user_id}
                        value={entry.user_id}
                        className="focus:bg-white/5 focus:text-white text-xs"
                      >
                        {entry.profiles?.full_name || 'Anonymous'} — {entry.total_points} pts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Points Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Points Amount</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPointsAmount((prev) => prev - 5)}
                    className="h-10 w-10 p-0 border border-white/5 bg-white/[0.02] rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(Number(e.target.value))}
                    className="h-10 border-white/5 bg-white/[0.02] text-sm text-white text-center font-bold rounded-xl focus-visible:ring-cyan-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPointsAmount((prev) => prev + 5)}
                    className="h-10 w-10 p-0 border border-white/5 bg-white/[0.02] rounded-xl text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-neutral-600">
                  {pointsAmount > 0 ? (
                    <span className="text-green-500">+{pointsAmount} points will be added</span>
                  ) : pointsAmount < 0 ? (
                    <span className="text-red-500">{pointsAmount} points will be deducted</span>
                  ) : (
                    <span>Enter positive or negative value</span>
                  )}
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Reason</label>
                <Input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Extra effort in workshop..."
                  className="h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={() => awardMutation.mutate()}
                disabled={awardMutation.isPending || !selectedUserId || pointsAmount === 0 || !reason.trim()}
                className="w-full h-10 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm rounded-xl gap-2 transition-all disabled:opacity-40"
              >
                {awardMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Award Points
              </Button>
            </CardContent>
          </Card>

          {/* Points History Log */}
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-neutral-500" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Latest point awards and deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pointsLogLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, idx) => (
                    <Skeleton key={idx} className="h-14 w-full bg-neutral-900 rounded-lg" />
                  ))}
                </div>
              ) : pointsLog.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  No points activity recorded yet.
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
                  {pointsLog.slice(0, 25).map((log: any, idx: number) => (
                    <div
                      key={log.id || idx}
                      className="px-5 py-3.5 hover:bg-white/[0.01] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {log.reason || 'No reason provided'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize bg-white/5 text-neutral-400">
                              {log.source_type || 'manual'}
                            </Badge>
                            {log.profiles?.full_name && (
                              <span className="text-[10px] text-neutral-600">
                                by {log.profiles.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-sm font-black tabular-nums",
                            log.points > 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {log.points > 0 ? '+' : ''}{log.points}
                          </span>
                          {log.created_at && (
                            <p className="text-[9px] text-neutral-600 mt-0.5 flex items-center gap-1 justify-end">
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date(log.created_at), 'dd MMM, HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
