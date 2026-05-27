'use client'

import { useQuery } from '@tanstack/react-query'
import { getChallenges } from '@/actions/challenges'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Calendar, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function ChallengesPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await getChallenges()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const challenges = result || []

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Trophy className="h-7 w-7 text-cyan-400" />
          Club Challenges
        </h1>
        <p className="text-neutral-400 text-sm">
          Compete in photography themes, submit your shots, and earn points on the leaderboard.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, idx) => (
            <Card key={idx} className="border-white/5 bg-black/40 h-64 p-4 flex flex-col justify-between">
              <Skeleton className="h-4 w-1/4 bg-neutral-800" />
              <Skeleton className="h-8 w-3/4 bg-neutral-800" />
              <Skeleton className="h-12 w-full bg-neutral-800" />
              <Skeleton className="h-8 w-full bg-neutral-800 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          No active challenges currently. Check back later!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((c) => {
            const isExpired = new Date(c.end_date) < new Date()
            const hasSubmitted = c.user_submission_count > 0

            return (
              <Card 
                key={c.id} 
                className={cn(
                  "border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group",
                  hasSubmitted && "border-cyan-500/10 shadow-lg shadow-cyan-950/2"
                )}
              >
                {/* Header Banner */}
                <div className="relative h-32 w-full bg-gradient-to-br from-neutral-800 to-neutral-900 overflow-hidden shrink-0">
                  {c.banner_url ? (
                    <img src={c.banner_url} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/10 to-neutral-900 flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-neutral-800 group-hover:text-cyan-500/20 transition-colors" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {hasSubmitted && (
                      <Badge className="border-none bg-green-500 text-black font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Submitted
                      </Badge>
                    )}
                    <Badge className={cn(
                      "border-none font-bold text-[9px] px-2 py-0.5 rounded-full capitalize",
                      isExpired ? 'bg-neutral-800 text-neutral-400' : 'bg-cyan-500 text-black'
                    )}>
                      {isExpired ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-4 pb-2">
                  {c.theme && (
                    <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Theme: {c.theme}
                    </span>
                  )}
                  <CardTitle className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors mt-1 line-clamp-1">
                    {c.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 pb-4 flex-1 space-y-3">
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {c.description || 'No description provided.'}
                  </p>

                  <div className="flex gap-4 pt-2 border-t border-white/5 text-[11px] text-neutral-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-neutral-600" />
                      Ends: {format(new Date(c.end_date), 'dd MMM yyyy')}
                    </span>
                    <span>
                      {c.submission_count} entries
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 border-t border-white/5 bg-black/10 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-cyan-400">
                    +{c.points} PTS
                  </span>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-neutral-300 hover:text-white p-0 gap-1 font-bold text-xs hover:bg-transparent">
                    <Link href={`/challenges/${c.id}`}>
                      {hasSubmitted ? 'View Entry' : 'Participate'}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardFooter>

              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
