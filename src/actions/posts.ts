'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

// 1. MEMBER: Create Post
export async function createPost(input: {
  caption: string
  media: Array<{
    media_type: 'image' | 'video'
    url: string
    thumbnail_url?: string | null
    cloudinary_public_id?: string | null
    width?: number | null
    height?: number | null
  }>
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Start database transaction by inserting post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        caption: input.caption,
        status: 'pending',
      })
      .select()
      .single()

    if (postError) throw postError

    // Insert associated media
    if (input.media && input.media.length > 0) {
      const mediaToInsert = input.media.map((item, idx) => ({
        post_id: post.id,
        media_type: item.media_type,
        url: item.url,
        thumbnail_url: item.thumbnail_url || null,
        cloudinary_public_id: item.cloudinary_public_id || null,
        width: item.width || null,
        height: item.height || null,
        sort_order: idx,
        created_at: new Date().toISOString(),
      }))

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert(mediaToInsert)

      if (mediaError) {
        // rollback post insert by deleting it
        await supabase.from('posts').delete().eq('id', post.id)
        throw mediaError
      }
    }

    revalidatePath('/feed')
    return { success: true, data: post }
  } catch (error: any) {
    console.error('Error in createPost:', error)
    return { error: error.message || 'Failed to publish post' }
  }
}

// 2. MEMBER: Update Post Caption
export async function updatePost(postId: string, caption: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { error } = await supabase
      .from('posts')
      .update({
        caption,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', profile.id)

    if (error) throw error

    revalidatePath('/feed')
    revalidatePath(`/feed/${postId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in updatePost:', error)
    return { error: error.message || 'Failed to update post' }
  }
}

// 3. MEMBER OR ADMIN: Soft Delete Post
export async function deletePost(postId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Fetch post to check ownership
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (!post) throw new Error('Post not found')

    if (post.user_id !== profile.id && !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const { error } = await supabase
      .from('posts')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (error) throw error

    revalidatePath('/feed')
    revalidatePath('/admin/feed-moderation')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deletePost:', error)
    return { error: error.message || 'Failed to delete post' }
  }
}

// 4. AUTHENTICATED: Get Approved Posts feed
export async function getApprovedPosts() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Fetch approved posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*, profiles:profiles!posts_user_id_fkey(*), post_media(*)')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // For each post, check if the current user has liked it
    const postsWithLikes = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: like } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', profile.id)
          .maybeSingle()

        return {
          ...post,
          user_has_liked: !!like
        }
      })
    )

    return { data: postsWithLikes }
  } catch (error: any) {
    console.error('Error in getApprovedPosts:', error)
    return { error: error.message || 'Failed to fetch posts' }
  }
}

// 5. ADMIN ONLY: Get Pending Posts moderation queue
export async function getPendingPosts() {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:profiles!posts_user_id_fkey(*), post_media(*)')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw error

    return { data }
  } catch (error: any) {
    console.error('Error in getPendingPosts:', error)
    return { error: error.message || 'Failed to fetch pending posts' }
  }
}

// 6. ADMIN ONLY: Approve Post
export async function approvePost(postId: string) {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('posts')
      .update({
        status: 'approved',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) throw error

    // Refresh leaderboard cache since points are awarded via trigger
    await supabase.rpc('refresh_leaderboard')

    revalidatePath('/feed')
    revalidatePath('/admin/feed-moderation')
    return { success: true }
  } catch (error: any) {
    console.error('Error in approvePost:', error)
    return { error: error.message || 'Failed to approve post' }
  }
}

// 7. ADMIN ONLY: Reject Post
export async function rejectPost(postId: string, reason: string) {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('posts')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) throw error

    revalidatePath('/feed')
    revalidatePath('/admin/feed-moderation')
    return { success: true }
  } catch (error: any) {
    console.error('Error in rejectPost:', error)
    return { error: error.message || 'Failed to reject post' }
  }
}

// 8. MEMBER: Toggle Like / Unlike
export async function toggleLike(postId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .maybeSingle()

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      if (error) throw error
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: profile.id,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    }

    revalidatePath('/feed')
    revalidatePath(`/feed/${postId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in toggleLike:', error)
    return { error: error.message || 'Like toggle failed' }
  }
}

// 9. MEMBER: Add Comment
export async function addComment(postId: string, content: string, parentId?: string | null) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        content,
        parent_id: parentId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/feed/${postId}`)
    revalidatePath('/feed')
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in addComment:', error)
    return { error: error.message || 'Failed to add comment' }
  }
}

// 10. MEMBER OR ADMIN: Delete Comment
export async function deleteComment(commentId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Fetch comment to check ownership
    const { data: comment } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (!comment) throw new Error('Comment not found')

    if (comment.user_id !== profile.id && !['admin', 'leader'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const { error } = await supabase
      .from('comments')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (error) throw error

    revalidatePath(`/feed/${comment.post_id}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteComment:', error)
    return { error: error.message || 'Failed to delete comment' }
  }
}

// 11. ADMIN ONLY: Feature / Unfeature Post
export async function featurePost(postId: string, isFeatured: boolean) {
  try {
    const admin = await getCurrentProfile()
    if (!admin || !['admin', 'leader'].includes(admin.role)) {
      throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('posts')
      .update({
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) throw error

    // Refresh leaderboard cache since points may be awarded via trigger
    await supabase.rpc('refresh_leaderboard')

    revalidatePath('/feed')
    revalidatePath(`/feed/${postId}`)
    revalidatePath('/admin/feed-moderation')
    return { success: true }
  } catch (error: any) {
    console.error('Error in featurePost:', error)
    return { error: error.message || 'Failed to feature post' }
  }
}
