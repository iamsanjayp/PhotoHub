'use client'

import { useState, useTransition } from 'react'
import type { Post } from '@/types/database'
import { toggleLike, deletePost, approvePost, rejectPost, featurePost } from '@/actions/posts'
import { shortlistPost } from '@/actions/instagram-queue'
import { useAuth } from '@/providers/auth-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CommentSection from './comment-section'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, MoreVertical, Trash2, Shield, Bookmark, Star, ChevronLeft, ChevronRight, Check, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export default function PostCard({ post, isModerationMode = false }: { post: Post; isModerationMode?: boolean }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [liked, setLiked] = useState(post.user_has_liked || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [isPending, startTransition] = useTransition()

  const mediaList = post.post_media || []
  const hasMultipleMedia = mediaList.length > 1

  const handleLike = async () => {
    // Optimistic UI update
    setLiked(!liked)
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))

    const result = await toggleLike(post.id)
    if (result.error) {
      // Revert if error
      setLiked(liked)
      setLikeCount(likeCount)
      toast.error(result.error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    const result = await deletePost(post.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Post deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['approved-posts'] })
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] })
    }
  }

  const handleApprove = async () => {
    const result = await approvePost(post.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Post approved!')
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] })
      queryClient.invalidateQueries({ queryKey: ['approved-posts'] })
    }
  }

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:')
    if (reason === null) return // cancelled

    const result = await rejectPost(post.id, reason)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Post rejected.')
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] })
    }
  }

  const handleFeatureToggle = async () => {
    const result = await featurePost(post.id, !post.is_featured)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(post.is_featured ? 'Post unfeatured' : 'Post featured!')
      queryClient.invalidateQueries({ queryKey: ['approved-posts'] })
    }
  }

  const handleQueueToIG = async () => {
    const result = await shortlistPost(post.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Post added to Instagram queue!')
      queryClient.invalidateQueries({ queryKey: ['instagram-queue'] })
    }
  }

  const isOwnPost = profile && post.user_id === profile.id
  const isAdmin = profile && ['admin', 'leader'].includes(profile.role)
  const canManage = isOwnPost || isAdmin

  const nextMedia = () => {
    if (currentMediaIndex < mediaList.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1)
    }
  }

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1)
    }
  }

  return (
    <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
      {/* Post Header */}
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-xl border border-white/5">
            <AvatarImage src={post.profiles?.avatar_url || undefined} alt="avatar" className="object-cover" />
            <AvatarFallback className="bg-neutral-800 text-neutral-300 text-sm font-bold rounded-xl">
              {post.profiles?.full_name?.substring(0, 2).toUpperCase() || 'PH'}
            </AvatarFallback>
          </Avatar>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-white block truncate leading-none">
                {post.profiles?.full_name || 'Club Member'}
              </span>
              {post.is_featured && (
                <Badge className="bg-cyan-500/10 text-cyan-400 border-none text-[8px] font-bold px-1 py-0 shadow-md">
                  <Star className="h-2 w-2 mr-0.5 fill-cyan-400" /> Featured
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true }).replace('about ', '')}
            </span>
          </div>
        </div>

        {/* Dropdown Menu for Management */}
        {canManage && !isModerationMode && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white rounded-lg" />
            }>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-900 border-white/5 text-neutral-200" align="end">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={handleFeatureToggle} className="focus:bg-white/5 focus:text-white cursor-pointer gap-2">
                    <Star className="h-4 w-4 text-cyan-400" />
                    <span>{post.is_featured ? 'Unfeature Post' : 'Feature Post'}</span>
                  </DropdownMenuItem>
                  {(post.status === 'approved' || post.is_featured) && (
                    <DropdownMenuItem onClick={handleQueueToIG} className="focus:bg-white/5 focus:text-white cursor-pointer gap-2">
                      <Send className="h-4 w-4 text-pink-400" />
                      <span>Queue to Instagram</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/5" />
                </>
              )}
              <DropdownMenuItem onClick={handleDelete} className="focus:bg-red-500/10 focus:text-red-400 text-red-500 cursor-pointer gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Delete Post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      {/* Post Media Display */}
      {mediaList.length > 0 && (
        <div className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center overflow-hidden border-y border-white/5">
          {mediaList[currentMediaIndex].media_type === 'image' ? (
            <img 
              src={mediaList[currentMediaIndex].url} 
              alt="Post Media" 
              className="h-full w-full object-cover"
            />
          ) : (
            <video 
              src={mediaList[currentMediaIndex].url} 
              controls 
              className="h-full w-full object-contain"
            />
          )}

          {/* Carousel Arrows */}
          {hasMultipleMedia && (
            <>
              {currentMediaIndex > 0 && (
                <button 
                  onClick={prevMedia}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {currentMediaIndex < mediaList.length - 1 && (
                <button 
                  onClick={nextMedia}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              {/* Pagination Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/45 px-2.5 py-1 rounded-full backdrop-blur-md">
                {mediaList.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all duration-200",
                      currentMediaIndex === idx ? "bg-cyan-400 w-3" : "bg-neutral-600"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Post Action Buttons */}
      {!isModerationMode && (
        <CardContent className="p-4 pb-2 flex gap-4 items-center">
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200",
              liked ? "text-pink-500" : "text-neutral-400 hover:text-white"
            )}
          >
            <Heart className={cn("h-5 w-5", liked && "fill-pink-500")} />
            <span>{likeCount}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comment_count || 0}</span>
          </button>
        </CardContent>
      )}

      {/* Post Caption */}
      <CardContent className={cn("p-4 pt-1", isModerationMode ? "pb-4" : "pb-3")}>
        {post.caption && (
          <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
            <span className="font-extrabold text-white mr-1.5">
              {post.profiles?.full_name?.split(' ')[0] || 'Member'}
            </span>
            {post.caption}
          </p>
        )}
      </CardContent>

      {/* Moderation Controls */}
      {isModerationMode && (
        <CardFooter className="p-4 pt-0 border-t border-white/5 bg-black/20 flex gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            className="flex-1 bg-green-500 text-black hover:bg-green-400 font-bold rounded-xl h-9 text-xs gap-1"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="flex-1 border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold rounded-xl h-9 text-xs gap-1"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleQueueToIG}
            className="border-pink-500/20 bg-pink-500/5 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 font-bold rounded-xl h-9 text-xs gap-1"
            title="Queue to Instagram"
          >
            <Send className="h-4 w-4" />
            IG
          </Button>
        </CardFooter>
      )}

      {/* Comments Dropdown */}
      {showComments && !isModerationMode && (
        <CommentSection postId={post.id} initialComments={[]} />
      )}

    </Card>
  )
}
