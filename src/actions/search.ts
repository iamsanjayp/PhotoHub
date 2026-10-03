'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'

export async function globalSearch(query: string) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Supabase JS uses % as wildcard for like/ilike operators
    const formattedQuery = query.trim().replace(/\s+/g, '%')

    // 1. Search Members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, department')
      .or(`full_name.ilike.%${formattedQuery}%,email.ilike.%${formattedQuery}%`)
      .limit(10)

    if (membersError) throw membersError

    // 2. Search Posts (Approved only, matching caption)
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, caption, created_at, post_media(*), profiles!posts_user_id_fkey(id, full_name, avatar_url)')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .ilike('caption', `%${query.trim()}%`) // .ilike() handles % natively
      .limit(10)

    if (postsError) throw postsError

    // 3. Search Events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, start_date, banner_url, is_published')
      .or(`title.ilike.%${formattedQuery}%,description.ilike.%${formattedQuery}%`)
      .limit(10)

    if (eventsError) throw eventsError

    return { 
      success: true, 
      data: {
        members: members || [],
        posts: posts || [],
        events: events || []
      } 
    }
  } catch (error: any) {
    console.error('Error in globalSearch:', error)
    return { error: error.message || 'Search failed' }
  }
}
