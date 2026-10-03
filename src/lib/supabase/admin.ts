import { createClient } from '@supabase/supabase-js'
import { customFetch } from './fetch'

// Admin client with service_role key - bypasses RLS
// ONLY use in server-side code for admin operations
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://photohub.bitsathy.ac.in'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  return createClient(
    url,
    serviceKey,
    {
      global: {
        fetch: customFetch,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
