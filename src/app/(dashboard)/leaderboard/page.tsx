'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '@/actions/leaderboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Award, Trophy, Users, Camera, Flame, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'total' | 'monthly' | 'semester'>('total')

  const { data: result, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const res = await getLeaderboard(period)
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const leaderboard = result || []
  
  // Separate top 3 podium places from the rest
  const topThree = leaderboard.slice(0, 3)
  const remaining = leaderboard.slice(3)

  // Podium formatting configurations
  const podiumStyles = [
    {
      // 1st Place (Gold)
      cardBg: 'from-amber-500/10 to-transparent border-amber-500/30 shadow-amber-500/5',
      badgeColor: 'bg-amber-500 text-black',
      avatarBorder: 'ring-amber-500',
      podiumHeight: 'h-48 md:h-52',
      place: '1st',
    },
    {
      // 2nd Place (Silver)
      cardBg: 'from-slate-400/10 to-transparent border-slate-400/20 shadow-slate-400/5',
      badgeColor: 'bg-slate-400 text-black',
      avatarBorder: 'ring-slate-400',
      podiumHeight: 'h-40 md:h-44',
      place: '2nd',
    },
    {
      // 3rd Place (Bronze)
      cardBg: 'from-amber-700/10 to-transparent border-amber-700/20 shadow-amber-700/5',
      badgeColor: 'bg-amber-700 text-white',
      avatarBorder: 'ring-amber-700',
      podiumHeight: 'h-36 md:h-40',
      place: '3rd',
    },
  ]

  // Reorder top 3 to display 2nd, 1st, 3rd (standard podium look)
  const orderedPodium = []
  if (topThree[1]) orderedPodium.push({ entry: topThree[1], config: podiumStyles[1] })
  if (topThree[0]) orderedPodium.push({ entry: topThree[0], config: podiumStyles[0] })
  if (topThree[2]) orderedPodium.push({ entry: topThree[2], config: podiumStyles[2] })

  const getPointsValue = (entry: any) => {
    if (period === 'monthly') return entry.monthly_points
    if (period === 'semester') return entry.semester_points
    return entry.total_points
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-7 w-7 text-cyan-400" />
            Club Leaderboard
          </h1>
          <p className="text-neutral-400 text-sm">
            Recognizing the most active contributors in the photography club.
          </p>
        </div>

        {/* Period Filters */}
        <Tabs 
          value={period} 
          onValueChange={(val) => setPeriod(val as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-white/[0.02] border border-white/5 h-10 p-1 rounded-xl w-full sm:w-auto">
            <TabsTrigger value="total" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-5 h-full flex-1 sm:flex-initial">
              All Time
            </TabsTrigger>
            <TabsTrigger value="semester" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-5 h-full flex-1 sm:flex-initial">
              This Semester
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-5 h-full flex-1 sm:flex-initial">
              This Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {/* Skeleton Podium */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto h-56 items-end">
            <Skeleton className="h-32 bg-neutral-900 rounded-2xl" />
            <Skeleton className="h-44 bg-neutral-900 rounded-2xl" />
            <Skeleton className="h-28 bg-neutral-900 rounded-2xl" />
          </div>
          {/* Skeleton Table */}
          <div className="border border-white/5 rounded-2xl p-4 bg-black/20">
            {[...Array(5)].map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full bg-neutral-900 my-2 rounded-lg" />
            ))}
          </div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          No points data logged for this period yet.
        </div>
      ) : (
        <>
          {/* Top 3 Podium (Desktop) */}
          <div className="hidden md:grid grid-cols-3 gap-6 max-w-3xl mx-auto items-end pt-8 pb-4">
            {orderedPodium.map(({ entry, config }) => (
              <div 
                key={entry.user_id} 
                className="flex flex-col items-center group"
              >
                <div className="relative mb-4">
                  <Avatar className={cn("h-20 w-20 ring-4 ring-offset-4 ring-offset-[#0A0A0A]", config.avatarBorder)}>
                    <AvatarImage src={entry.profiles?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-neutral-800 text-white font-bold">
                      {entry.profiles?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full font-bold shadow-md text-xs", config.badgeColor)}>
                    {config.place}
                  </span>
                </div>

                <Card className={cn(
                  "bg-gradient-to-t border w-full rounded-2xl flex flex-col justify-end text-center p-5 shadow-lg shadow-black/40 transition-all duration-300 group-hover:scale-[1.02]",
                  config.cardBg,
                  config.podiumHeight
                )}>
                  <CardContent className="p-0 space-y-2">
                    <p className="font-extrabold text-white text-sm line-clamp-1">
                      {entry.profiles?.full_name || 'Anonymous'}
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-2xl font-black text-white tracking-tight">
                        {getPointsValue(entry)}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Points</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Simple Top 3 Cards for Mobile */}
          <div className="md:hidden space-y-3">
            {topThree.map((entry, idx) => {
              const config = podiumStyles[idx]
              return (
                <div 
                  key={entry.user_id}
                  className={cn(
                    "flex items-center gap-3 p-4 border rounded-2xl bg-gradient-to-r",
                    config.cardBg
                  )}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shrink-0 shadow-md", config.badgeColor)}>
                    {config.place}
                  </span>
                  <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                    <AvatarImage src={entry.profiles?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-neutral-800 text-white font-semibold">
                      {entry.profiles?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {entry.profiles?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-[10px] text-neutral-500 capitalize">
                      {entry.profiles?.role.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-white block leading-none">
                      {getPointsValue(entry)}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Points</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Leaderboard Table List (Ranks 4+) */}
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-neutral-500" />
                Active Standings
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Performance matrix for active club contributors
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="border-b border-white/5">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="w-16 text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Rank</TableHead>
                    <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Member</TableHead>
                    <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Events</TableHead>
                    <TableHead className="text-center text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Submissions</TableHead>
                    <TableHead className="text-right text-neutral-500 font-bold uppercase text-[10px] tracking-wider pr-6">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remaining.map((entry) => (
                    <TableRow 
                      key={entry.user_id}
                      className="border-b border-white/5 hover:bg-white/[0.01] transition-colors"
                    >
                      <TableCell className="text-center font-bold text-xs text-neutral-400">
                        #{entry.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-white/5 shrink-0">
                            <AvatarImage src={entry.profiles?.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-neutral-800 text-xs text-neutral-400 font-semibold">
                              {entry.profiles?.full_name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-white block truncate leading-none mb-1">
                              {entry.profiles?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider capitalize">
                              {entry.profiles?.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-neutral-300 font-medium">
                        {entry.event_count}
                      </TableCell>
                      <TableCell className="text-center text-xs text-neutral-300 font-medium">
                        {entry.submission_count}
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-cyan-400 pr-6">
                        {getPointsValue(entry)} <span className="text-[10px] text-neutral-500 font-semibold ml-0.5">PTS</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
