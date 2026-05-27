'use client'

import { useQuery } from '@tanstack/react-query'
import { getPendingPosts } from '@/actions/posts'
import PostCard from '@/components/feed/post-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Inbox, CheckCircle2 } from 'lucide-react'

export default function FeedModerationPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ['pending-posts'],
    queryFn: async () => {
      const res = await getPendingPosts()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const pendingPosts = result || []

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Inbox className="h-7 w-7 text-cyan-400" />
          Feed Moderation
        </h1>
        <p className="text-neutral-400 text-sm">
          Approve or reject member posts in the queue before they are published to the public feed.
        </p>
      </div>

      {/* Moderation Queue List */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </div>
      ) : pendingPosts.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-16 text-center text-neutral-500 bg-white/[0.005] flex flex-col items-center justify-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-green-500/80 animate-pulse" />
          <p className="text-sm font-semibold text-white">Queue is Empty!</p>
          <p className="text-xs text-neutral-500">All submissions have been moderated.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingPosts.map((post) => (
            <PostCard key={post.id} post={post} isModerationMode={true} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="border border-white/5 bg-black/40 rounded-2xl h-[500px] p-4 flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl bg-neutral-800" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4 bg-neutral-800" />
          <Skeleton className="h-3 w-1/6 bg-neutral-800" />
        </div>
      </div>
      <Skeleton className="h-80 w-full bg-neutral-800 rounded-xl my-4" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 bg-neutral-800 rounded-xl" />
        <Skeleton className="h-9 flex-1 bg-neutral-800 rounded-xl" />
      </div>
    </div>
  )
}
