'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getMemberById } from '@/actions/members'
import { getUserPosts } from '@/actions/posts'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import PostDialog from '@/components/feed/post-dialog'
import { User, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { getMediaUrl } from '@/lib/utils'

export default function MemberProfilePage() {
  const params = useParams()
  const memberId = params.id as string

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const res = await getMemberById(memberId)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    enabled: !!memberId,
  })

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['member-posts', memberId],
    queryFn: async () => {
      const res = await getUserPosts(memberId)
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    enabled: !!memberId,
  })

  if (loadingProfile) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-10 w-48 bg-neutral-900 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-[400px] bg-neutral-900 rounded-2xl" />
          <Skeleton className="lg:col-span-2 h-[400px] bg-neutral-900 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500">
        <User className="h-12 w-12 text-neutral-800 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Member Not Found</h2>
        <p>The profile you are looking for does not exist or has been deleted.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <User className="h-7 w-7 text-cyan-400" />
          {profile.full_name}'s Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden text-center relative p-6">
            <CardContent className="space-y-4 pt-6">
              <Avatar className="h-24 w-24 mx-auto ring-4 ring-cyan-500/20 ring-offset-4 ring-offset-[#0A0A0A]">
                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-neutral-800 text-white text-2xl font-bold">
                  {profile.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white leading-none">
                  {profile.full_name || 'Photography Member'}
                </h3>
                <p className="text-xs text-neutral-500">{profile.email}</p>
                <div className="pt-2">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-none capitalize text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {profile.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5 text-left max-w-[200px] mx-auto">
                {profile.batch && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Batch</span>
                    <span className="text-neutral-300 font-medium">{profile.batch}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Dept</span>
                    <span className="text-neutral-300 font-medium">{profile.department}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500">Phone</span>
                    <span className="text-neutral-300 font-medium">{profile.phone}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-xs text-neutral-400 italic max-w-xs mx-auto leading-relaxed border-t border-white/5 pt-3">
                  "{profile.bio}"
                </p>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {profile.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-white/5 hover:bg-white/5 text-neutral-300 text-[9px] font-semibold rounded-md border-white/5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Posts Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white">Posts ({posts?.length || 0})</h3>
          
          {loadingPosts ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, idx) => (
                <Skeleton key={idx} className="aspect-square bg-neutral-900 rounded-lg" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="border border-dashed border-white/5 rounded-2xl p-12 text-center text-neutral-500 bg-white/[0.005]">
              <ImageIcon className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-sm font-semibold">{profile.full_name} hasn't posted anything yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {posts.map((post: any) => {
                const firstMedia = post.post_media?.[0]
                return (
                  <PostDialog key={post.id} post={post}>
                    <div className="aspect-square relative group bg-neutral-900 rounded-lg overflow-hidden block cursor-pointer">
                      {firstMedia && firstMedia.media_type === 'image' ? (
                      <img src={getMediaUrl(firstMedia.url)} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : firstMedia && firstMedia.media_type === 'video' ? (
                      <video src={getMediaUrl(firstMedia.url)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted playsInline />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-800 text-xs">No media</div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                      <div className="flex items-center gap-1">
                        <span className="text-cyan-400">♥</span> {post.like_count ?? (Array.isArray(post.likes) ? post.likes.length : 0)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-cyan-400">💬</span> {post.comment_count ?? (Array.isArray(post.comments) ? post.comments.length : 0)}
                      </div>
                    </div>
                  </div>
                  </PostDialog>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
