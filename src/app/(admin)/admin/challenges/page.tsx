'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getChallenges, deleteChallenge } from '@/actions/challenges'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Trophy, 
  Plus, 
  Search, 
  Calendar, 
  Award, 
  Users, 
  Trash2, 
  Loader2,
  FileText,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()

  const loadChallenges = async () => {
    setLoading(true)
    const res = await getChallenges()
    if (res.error) {
      toast.error(res.error)
    } else {
      setChallenges(res.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadChallenges()
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete challenge "${title}"?`)) return
    startTransition(async () => {
      const res = await deleteChallenge(id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Challenge deleted successfully')
        setChallenges(prev => prev.filter(c => c.id !== id))
      }
    })
  }

  // Filter challenges
  const filteredChallenges = challenges.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.theme && c.theme.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Title / Action bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-7 w-7 text-cyan-400" />
            Club Challenges
          </h1>
          <p className="text-neutral-400 text-sm">
            Publish photo prompts and theme challenges. Track entries and moderate leaderboard points.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl h-11 px-5 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <Link href="/admin/challenges/new">
            <Plus className="h-5 w-5" />
            New Challenge
          </Link>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          placeholder="Search challenges by title or theme..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-white/5 bg-black/20 text-white rounded-xl placeholder-neutral-600 focus:border-cyan-500/30 text-sm h-11"
        />
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-neutral-500">Loading challenges...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <Card className="border border-dashed border-white/5 bg-black/20 rounded-2xl p-12 text-center">
          <Trophy className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Challenges Found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-6">
            There are no challenges created yet. Create a photography challenge to engage club members!
          </p>
          <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-5">
            <Link href="/admin/challenges/new">Create Your First Challenge</Link>
          </Button>
        </Card>
      ) : (
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-neutral-400 bg-white/[0.01]">
                    <th className="py-4 px-6">Challenge Details</th>
                    <th className="py-4 px-6">Submission Mode</th>
                    <th className="py-4 px-6">Timeline</th>
                    <th className="py-4 px-6">Points</th>
                    <th className="py-4 px-6 text-center">Submissions</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredChallenges.map((challenge) => {
                    const isActive = new Date(challenge.end_date) >= new Date()
                    return (
                      <tr key={challenge.id} className="hover:bg-white/[0.01] transition-colors group">
                        {/* Title & Banner */}
                        <td className="py-4 px-6 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-16 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-neutral-900">
                              {challenge.banner_url ? (
                                <img src={challenge.banner_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-neutral-600 bg-cyan-950/10 text-cyan-400 border border-cyan-500/10">
                                  PROMPT
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white truncate">{challenge.title}</h4>
                              {challenge.theme && (
                                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-0.5">
                                  Theme: {challenge.theme}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Submission Mode */}
                        <td className="py-4 px-6">
                          <span className="capitalize font-medium text-neutral-300">
                            {challenge.submission_mode === 'drive_link' ? 'Google Drive Link' : `${challenge.submission_mode} upload`}
                          </span>
                        </td>

                        {/* Date Range */}
                        <td className="py-4 px-6">
                          <div className="text-xs text-neutral-300">
                            Until {new Date(challenge.end_date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className={cn(
                              "text-[8px] font-bold uppercase py-0.5 px-1.5 rounded",
                              isActive 
                                ? "bg-green-500/10 text-green-500" 
                                : "bg-neutral-500/10 text-neutral-500"
                            )}>
                              {isActive ? 'Active' : 'Closed'}
                            </span>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs">
                            <Award className="h-4 w-4" />
                            {challenge.points} pts
                          </div>
                        </td>

                        {/* Submissions Count */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-neutral-300 font-bold">
                            <Users className="h-4 w-4 text-neutral-500" />
                            {challenge.submission_count}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg text-neutral-400">
                              <Link href={`/admin/challenges/${challenge.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              onClick={() => handleDelete(challenge.id, challenge.title)}
                              disabled={isPending}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-neutral-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
