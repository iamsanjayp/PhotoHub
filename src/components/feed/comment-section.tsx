'use client'

import { useState, useTransition } from 'react'
import { addComment, deleteComment } from '@/actions/posts'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, CornerDownRight, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommentSectionProps {
  postId: string
  initialComments: any[]
}

export default function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const { profile } = useAuth()
  const [comments, setComments] = useState<any[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Real-time synchronization
  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (data) setComments(data)
  }

  const handleAddComment = async (e: React.FormEvent, parentId?: string | null) => {
    e.preventDefault()
    const text = parentId ? replyText : newComment
    if (!text.trim()) return

    startTransition(async () => {
      const result = await addComment(postId, text, parentId)
      if (result.error) {
        toast.error(result.error)
      } else {
        if (parentId) {
          setReplyText('')
          setReplyToId(null)
        } else {
          setNewComment('')
        }
        await fetchComments()
        toast.success('Comment added')
      }
    })
  }

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    const result = await deleteComment(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      await fetchComments()
      toast.success('Comment deleted')
    }
  }

  if (!profile) return null

  // Organize comments into parent and child threads
  const parentComments = comments.filter((c) => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId)

  return (
    <div className="space-y-4 pt-4 border-t border-white/5 bg-black/10 p-4 rounded-b-2xl">
      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 mb-2">
        <MessageSquare className="h-4 w-4" />
        <span>Comments ({comments.length})</span>
      </div>

      {/* Main Comment Input */}
      <form onSubmit={(e) => handleAddComment(e, null)} className="flex items-center gap-2">
        <Avatar className="h-8 w-8 rounded-lg shrink-0">
          <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="bg-neutral-800 text-xs text-white">
            {profile.full_name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 h-9 border-white/5 bg-white/[0.02] text-xs text-neutral-200 placeholder-neutral-500 rounded-lg focus-visible:ring-cyan-500/50"
        />
        <Button 
          type="submit" 
          disabled={isPending || !newComment.trim()}
          className="h-9 w-9 bg-cyan-500 hover:bg-cyan-400 text-black p-0 rounded-lg shrink-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 pt-2">
        {parentComments.map((comment) => {
          const replies = getReplies(comment.id)
          const isOwnComment = comment.user_id === profile.id
          const canDelete = isOwnComment || ['admin', 'leader'].includes(profile.role)

          return (
            <div key={comment.id} className="space-y-3">
              {/* Parent Comment */}
              <div className="flex items-start gap-3 group/comment">
                <Avatar className="h-7 w-7 rounded-lg shrink-0 mt-0.5">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                    {comment.profiles?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white leading-none">
                      {comment.profiles?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-[9px] text-neutral-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }).replace('about ', '')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-normal">{comment.content}</p>
                  
                  {/* Reply trigger link */}
                  <button
                    onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                    className="text-[10px] text-cyan-500 font-bold hover:underline"
                  >
                    Reply
                  </button>
                </div>

                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-6 w-6 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 rounded-md shrink-0 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Replies list */}
              {replies.map((reply) => {
                const isOwnReply = reply.user_id === profile.id
                const canDeleteReply = isOwnReply || ['admin', 'leader'].includes(profile.role)

                return (
                  <div key={reply.id} className="flex items-start gap-3 pl-8 group/reply">
                    <CornerDownRight className="h-4 w-4 text-neutral-600 shrink-0 mt-1" />
                    
                    <Avatar className="h-6 w-6 rounded-lg shrink-0 mt-0.5">
                      <AvatarImage src={reply.profiles?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-neutral-800 text-[8px] text-white">
                        {reply.profiles?.full_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white leading-none">
                          {reply.profiles?.full_name || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-neutral-500">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-normal">{reply.content}</p>
                    </div>

                    {canDeleteReply && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteComment(reply.id)}
                        className="h-6 w-6 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 rounded-md shrink-0 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}

              {/* Reply Form */}
              {replyToId === comment.id && (
                <form
                  onSubmit={(e) => handleAddComment(e, comment.id)}
                  className="flex items-center gap-2 pl-8 pt-1"
                >
                  <Input
                    type="text"
                    placeholder={`Reply to ${comment.profiles?.full_name?.split(' ')[0] || 'member'}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 h-8 border-white/5 bg-white/[0.01] text-xs text-neutral-200 placeholder-neutral-600 rounded-lg focus-visible:ring-cyan-500/50"
                  />
                  <Button 
                    type="submit" 
                    disabled={isPending || !replyText.trim()}
                    className="h-8 w-8 bg-cyan-500 hover:bg-cyan-400 text-black p-0 rounded-lg shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
