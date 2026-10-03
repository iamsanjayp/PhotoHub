'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { globalSearch } from '@/actions/search'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import PostDialog from '@/components/feed/post-dialog'
import Link from 'next/link'
import { Search, User, Camera, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { getMediaUrl } from '@/lib/utils'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) return null
      const res = await globalSearch(query)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    enabled: !!query,
  })

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500 space-y-4">
        <Search className="h-12 w-12 text-neutral-800" />
        <p>Type something in the search bar to find members, posts, or events.</p>
      </div>
    )
  }

  const members = data?.members || []
  const posts = data?.posts || []
  const events = data?.events || []

  const totalResults = members.length + posts.length + events.length

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Search Results
        </h1>
        <p className="text-neutral-400 text-sm">
          Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
        </p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-white/[0.02] border border-white/5 h-11 p-1 rounded-xl w-full sm:w-auto overflow-x-auto justify-start hide-scrollbar">
          <TabsTrigger value="members" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-shrink-0">
            <User className="h-4 w-4 mr-2" /> Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-shrink-0">
            <Camera className="h-4 w-4 mr-2" /> Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs font-bold rounded-lg px-6 h-full flex-shrink-0">
            <Calendar className="h-4 w-4 mr-2" /> Events ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-neutral-900" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-white/[0.005] border border-dashed border-white/5 rounded-2xl">
              No members found matching "{query}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((member: any) => (
                <Link key={member.id} href={`/members/${member.id}`}>
                  <Card className="border-white/5 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer rounded-2xl h-full p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={member.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-neutral-800 text-white font-bold">{member.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{member.full_name}</h4>
                      <p className="text-xs text-neutral-500 capitalize">{member.role.replace('_', ' ')}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="pt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl bg-neutral-900" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-white/[0.005] border border-dashed border-white/5 rounded-2xl">
              No posts found matching "{query}"
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {posts.map((post: any) => {
                const media = post.post_media?.[0]
                return (
                  <PostDialog key={post.id} post={post}>
                    <div className="group aspect-square relative bg-neutral-900 rounded-2xl overflow-hidden block cursor-pointer">
                      {media && media.media_type === 'image' ? (
                      <img src={getMediaUrl(media.url)} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : media && media.media_type === 'video' ? (
                      <video src={getMediaUrl(media.url)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted playsInline />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-xs text-center">{post.caption}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 rounded-md">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="bg-neutral-800 text-[8px]">{post.profiles?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                          <span className="text-[10px] text-white truncate font-semibold">{post.profiles?.full_name}</span>
                        </div>
                      </div>
                    </div>
                  </PostDialog>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-neutral-900" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-white/[0.005] border border-dashed border-white/5 rounded-2xl">
              No events found matching "{query}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event: any) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="border-white/5 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer rounded-2xl overflow-hidden flex h-full">
                    <div className="w-1/3 bg-neutral-800 flex-shrink-0">
                      {event.banner_url ? (
                        <img src={event.banner_url} alt="Event" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cyan-950/30">
                          <Calendar className="h-8 w-8 text-cyan-500/50" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{event.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wide">
                          {format(new Date(event.start_date), 'MMM d, yyyy')}
                        </span>
                        <Badge className="bg-white/5 hover:bg-white/5 text-neutral-300 border-none text-[9px] capitalize rounded-md px-1.5 py-0">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
