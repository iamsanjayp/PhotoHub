'use client'

import { useQuery } from '@tanstack/react-query'
import { getApprovedPosts } from '@/actions/posts'
import PostCard from '@/components/feed/post-card'
import CreatePostDialog from '@/components/feed/create-post-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, Image as ImageIcon } from 'lucide-react'

export default function FeedPage() {
  // Query approved posts
  const { data: result, isLoading } = useQuery({
    queryKey: ['approved-posts'],
    queryFn: async () => {
      const res = await getApprovedPosts()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const posts = result || []

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto">
      {/* Feed Header */}
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Camera className="h-7 w-7 text-cyan-400" />
            Social Feed
          </h1>
          <p className="text-neutral-400 text-sm">
            Explore photographs, videos, and contributions shared by club members.
          </p>
        </div>

        <CreatePostDialog />
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="border border-white/5 bg-black/40 rounded-2xl h-[500px] p-4 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl bg-neutral-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4 bg-neutral-800" />
                  <Skeleton className="h-3 w-1/6 bg-neutral-800" />
                </div>
              </div>
              <Skeleton className="h-80 w-full bg-neutral-800 rounded-xl my-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3 bg-neutral-800" />
                <Skeleton className="h-3 w-1/2 bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-16 text-center text-neutral-500 bg-white/[0.005] flex flex-col items-center justify-center gap-3">
          <ImageIcon className="h-10 w-10 text-neutral-700" />
          <p className="text-sm font-semibold">No feed posts published yet.</p>
          <p className="text-xs text-neutral-600">Be the first to share your photography work!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
