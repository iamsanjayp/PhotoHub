'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from './auth'
import { isAdminOrBoard } from '@/lib/constants/roles'
import { deleteFromGoogleDrive } from '@/lib/google-drive'

export interface GalleryItem {
  id: string
  title: string
  category: string
  caption?: string | null
  url: string
  thumbnail_url?: string | null
  author?: string | null
  author_avatar?: string | null
  created_at?: string
  is_seed?: boolean
  cloudinary_public_id?: string | null
}

// Curated default highlight photos if none uploaded yet
const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'default-1',
    title: 'Monochrome Campus Architecture',
    category: 'Architecture',
    caption: 'Bannari Amman Institute of Technology Main Block illuminated during twilight.',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
  {
    id: 'default-2',
    title: 'Golden Hour Street Symphony',
    category: 'Portraits',
    caption: 'Capturing candid expressions and natural light dynamics during the club photowalk.',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
  {
    id: 'default-3',
    title: 'Cultural Fest Stage Highlights',
    category: 'Events',
    caption: 'High-energy coverage from the annual institute cultural festival.',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
  {
    id: 'default-4',
    title: 'Cinematic Shadows & Contours',
    category: 'Cinematic',
    caption: 'Low-key studio lighting experiment conducted in the PhotoHub media room.',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
  {
    id: 'default-5',
    title: 'Wild Aviary Macro Focus',
    category: 'Nature',
    caption: 'Telephoto shot from the Sathyamangalam tiger reserve bird sanctuary photowalk.',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
  {
    id: 'default-6',
    title: 'Nightscape & Light Trails',
    category: 'Cinematic',
    caption: 'Long exposure capture showcasing moving lights on the highway boulevard.',
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80',
    author: 'PhotoHub Team',
    is_seed: true,
  },
]

export async function getGalleryItems() {
  try {
    const adminClient = await createAdminClient()
    const { data: posts, error } = await adminClient
      .from('posts')
      .select('id, caption, status, is_featured, created_at, post_media(*), profiles:profiles!posts_user_id_fkey(id, full_name, avatar_url)')
      .eq('is_featured', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching featured posts for gallery:', error)
      return { data: DEFAULT_GALLERY_ITEMS }
    }

    if (!posts || posts.length === 0) {
      return { data: DEFAULT_GALLERY_ITEMS }
    }

    const items = posts.map((p: any) => {
      const media = p.post_media && p.post_media.length > 0 ? p.post_media[0] : null
      let category = 'Featured'
      let title = p.caption || 'PhotoHub Showcase'

      // Check if caption contains category tag like [Portraits] Title
      const tagMatch = p.caption?.match(/^\[(.*?)\]\s*(.*)$/)
      if (tagMatch) {
        category = tagMatch[1]
        title = tagMatch[2]
      }

      return {
        id: p.id,
        title,
        caption: p.caption,
        category,
        url: media?.url || '',
        thumbnail_url: media?.thumbnail_url || media?.url || '',
        created_at: p.created_at,
        author: p.profiles?.full_name || 'PhotoHub Team',
        author_avatar: p.profiles?.avatar_url || null,
        is_seed: false,
        cloudinary_public_id: media?.cloudinary_public_id || null,
      }
    }).filter((i: any) => !!i.url)

    return { data: items.length > 0 ? items : DEFAULT_GALLERY_ITEMS }
  } catch (error: any) {
    console.error('getGalleryItems error:', error)
    return { data: DEFAULT_GALLERY_ITEMS }
  }
}

export async function createGalleryItem(input: {
  title: string
  category?: string
  image_url: string
  caption?: string
  drive_file_id?: string | null
}) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can upload gallery photos.' }
    }

    if (!input.image_url) {
      return { error: 'Image URL is required' }
    }

    const adminClient = await createAdminClient()
    const categoryTag = input.category ? `[${input.category.trim()}] ` : ''
    const fullCaption = `${categoryTag}${input.title.trim()}${input.caption ? ` - ${input.caption.trim()}` : ''}`

    const driveFileId = input.drive_file_id || (input.image_url?.startsWith('/api/media/') ? input.image_url.replace('/api/media/', '') : null)

    // 1. Insert post
    const { data: post, error: postErr } = await adminClient
      .from('posts')
      .insert({
        user_id: profile.id,
        caption: fullCaption,
        status: 'approved',
        is_featured: true,
      })
      .select()
      .single()

    if (postErr) {
      console.error('Error inserting gallery post:', postErr)
      return { error: postErr.message || 'Failed to create showcase post' }
    }

    // 2. Insert post_media with Google Drive fileId stored in cloudinary_public_id
    const { error: mediaErr } = await adminClient
      .from('post_media')
      .insert({
        post_id: post.id,
        media_type: 'image',
        url: input.image_url,
        thumbnail_url: input.image_url,
        cloudinary_public_id: driveFileId || null,
        sort_order: 0,
      })

    if (mediaErr) {
      console.error('Error inserting gallery post media:', mediaErr)
      return { error: mediaErr.message || 'Failed to attach image to post' }
    }

    return { success: true, data: post }
  } catch (error: any) {
    console.error('createGalleryItem error:', error)
    return { error: error.message || 'Failed to add image to gallery' }
  }
}

export async function deleteGalleryItem(postId: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can remove gallery photos.' }
    }

    const adminClient = await createAdminClient()

    // 1. Delete associated media from Google Drive if stored
    try {
      const { data: mediaRows } = await adminClient
        .from('post_media')
        .select('url, cloudinary_public_id')
        .eq('post_id', postId)

      for (const m of (mediaRows || [])) {
        const fileId = m.cloudinary_public_id || (m.url?.startsWith('/api/media/') ? m.url.replace('/api/media/', '') : null)
        if (fileId && !fileId.startsWith('http')) {
          await deleteFromGoogleDrive(fileId).catch(() => {})
        }
      }
    } catch (e) {
      console.warn('Error during Google Drive file cleanup:', e)
    }

    // 2. Mark post as deleted
    const { error } = await adminClient
      .from('posts')
      .update({
        is_featured: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) {
      console.error('Error deleting gallery item:', error)
      return { error: error.message || 'Failed to delete gallery item' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('deleteGalleryItem error:', error)
    return { error: error.message || 'Failed to delete gallery item' }
  }
}

export async function updateGalleryItem(
  postId: string,
  input: {
    title: string
    category?: string
    caption?: string
    image_url?: string
    drive_file_id?: string | null
  }
) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !isAdminOrBoard(profile.role)) {
      return { error: 'Unauthorized. Only admins can update gallery photos.' }
    }

    const adminClient = await createAdminClient()
    const categoryTag = input.category ? `[${input.category.trim()}] ` : ''
    const fullCaption = `${categoryTag}${input.title.trim()}${input.caption ? ` - ${input.caption.trim()}` : ''}`

    const { error: postErr } = await adminClient
      .from('posts')
      .update({
        caption: fullCaption,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (postErr) {
      console.error('Error updating gallery item post:', postErr)
      return { error: postErr.message || 'Failed to update post caption' }
    }

    if (input.image_url) {
      const driveFileId = input.drive_file_id || (input.image_url?.startsWith('/api/media/') ? input.image_url.replace('/api/media/', '') : null)

      // Clean up previous media from Google Drive if replacing with a new file
      try {
        const { data: oldMedia } = await adminClient
          .from('post_media')
          .select('cloudinary_public_id, url')
          .eq('post_id', postId)
          .single()

        const oldFileId = oldMedia?.cloudinary_public_id || (oldMedia?.url?.startsWith('/api/media/') ? oldMedia.url.replace('/api/media/', '') : null)
        if (oldFileId && driveFileId && oldFileId !== driveFileId && !oldFileId.startsWith('http')) {
          await deleteFromGoogleDrive(oldFileId).catch(() => {})
        }
      } catch (cleanupErr) {
        console.warn('Could not clean up replaced image from Google Drive:', cleanupErr)
      }

      const updateData: any = {
        url: input.image_url,
        thumbnail_url: input.image_url,
      }
      if (driveFileId) {
        updateData.cloudinary_public_id = driveFileId
      }

      await adminClient
        .from('post_media')
        .update(updateData)
        .eq('post_id', postId)
    }

    return { success: true }
  } catch (error: any) {
    console.error('updateGalleryItem error:', error)
    return { error: error.message || 'Failed to update gallery photo' }
  }
}
