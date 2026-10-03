'use client'

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CommentSection from './comment-section'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { getMediaUrl } from '@/lib/utils'

export default function PostDialog({ post, children }: { post: any, children: React.ReactNode }) {
  const media = post.post_media?.[0]
  const mediaUrl = getMediaUrl(media?.url)
  
  return (
    <Dialog>
      <DialogTrigger render={<div className="contents cursor-pointer">{children}</div>} />
      <DialogContent 
        className="max-w-4xl sm:max-w-4xl md:max-w-4xl p-0 overflow-hidden bg-neutral-900 border-white/5 h-[80vh] flex flex-col md:flex-row focus-visible:outline-none"
        style={{ maxWidth: '896px', width: '100%' }}
      >
        
        {/* Left Side: Media */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          {media?.media_type === 'image' ? (
            <img src={mediaUrl} alt="Post" className="max-h-full max-w-full object-contain" />
          ) : media?.media_type === 'video' ? (
            <video src={mediaUrl} controls playsInline className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-neutral-500">No media</div>
          )}
        </div>

        {/* Right Side: Details & Comments */}
        <div className="w-full md:w-[380px] bg-neutral-900 flex flex-col border-l border-white/5 shrink-0 max-h-[50vh] md:max-h-none">
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Link href={`/members/${post.user_id || post.profiles?.id}`}>
                <Avatar className="h-9 w-9 rounded-xl hover:opacity-80 transition-opacity">
                  <AvatarImage src={post.profiles?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-neutral-800 text-neutral-300 font-bold text-xs">
                    {post.profiles?.full_name?.substring(0, 2).toUpperCase() || 'PH'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="leading-tight">
                <Link href={`/members/${post.user_id || post.profiles?.id}`} className="text-sm font-bold text-white hover:underline">
                  {post.profiles?.full_name || 'Member'}
                </Link>
                <div className="text-[10px] text-neutral-500">
                  {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content (Caption + Comments) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
            {post.caption && (
              <div className="p-4 border-b border-white/5 text-sm text-neutral-300 leading-relaxed whitespace-pre-line break-words">
                <span className="font-bold text-white mr-2">{post.profiles?.full_name}</span>
                {post.caption}
              </div>
            )}
            
            <div className="bg-transparent border-t-0 pb-0">
              <CommentSection postId={post.id} initialComments={post.comments || []} />
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  )
}
