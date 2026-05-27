'use client'

import { useQuery } from '@tanstack/react-query'
import { getAnnouncements } from '@/actions/announcements'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { format } from 'date-fns'
import { Megaphone, Pin, Clock, User, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function AnnouncementsPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await getAnnouncements(false)
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const announcements = result || []

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-cyan-400" />
          Club Announcements
        </h1>
        <p className="text-neutral-400 text-sm">
          Stay updated with the latest club news, schedules, and operations info.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="border-white/5 bg-black/40 p-4">
              <Skeleton className="h-4 w-1/4 bg-neutral-800 mb-2" />
              <Skeleton className="h-6 w-1/2 bg-neutral-800 mb-4" />
              <Skeleton className="h-16 w-full bg-neutral-800" />
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
          No announcements published recently.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card 
              key={ann.id} 
              className={`border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl transition-all duration-300 hover:border-white/10 ${
                ann.is_pinned ? 'border-cyan-500/20 bg-gradient-to-r from-black via-black to-[#0E1719]' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        {ann.title}
                      </CardTitle>
                      {ann.is_pinned && (
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-none text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-neutral-600" />
                        By {ann.profiles?.full_name || 'Admin'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-neutral-600" />
                        {format(new Date(ann.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>
              </CardContent>
              {ann.external_link && (
                <CardFooter className="pt-2 pb-4 px-6 flex justify-start border-t border-white/[0.02]">
                  <Button asChild size="sm" variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 rounded-xl gap-1.5 h-9 text-xs">
                    <a href={ann.external_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      More Information / Attachment
                    </a>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
