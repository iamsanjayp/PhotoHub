import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { customFetch } from '@/lib/supabase/fetch'

function getPublicOrigin() {
  return process.env.SITE_URL || 'https://photohub.bitsathy.ac.in'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const origin = getPublicOrigin()

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    const supabase = createServerClient(
      url,
      anonKey,
      {
        global: {
          fetch: customFetch,
        },
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Code exchange error during OAuth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`)
    }

    if (data?.user) {
      const email = (data.user.email ?? '').toLowerCase().trim()
      
      // Enforce domain restriction on login
      if (!email.endsWith('@bitsathy.ac.in')) {
        const unauthorizedResponse = NextResponse.redirect(`${origin}/unauthorized`)
        const cleanClient = createServerClient(
          url,
          anonKey,
          {
            global: {
              fetch: customFetch,
            },
            cookies: {
              getAll() {
                return request.cookies.getAll()
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  unauthorizedResponse.cookies.set(name, value, options)
                })
              },
            },
          }
        )
        await cleanClient.auth.signOut()
        return unauthorizedResponse
      }

      // Check if user is suspended/deactivated
      const internalUrl = process.env.SUPABASE_INTERNAL_URL || 'http://kong:8000'
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      try {
        const profileRes = await fetch(`${internalUrl}/rest/v1/profiles?select=is_active&id=eq.${data.user.id}`, {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
          }
        })
        if (profileRes.ok) {
          const profiles = await profileRes.json()
          if (profiles && profiles.length > 0 && profiles[0].is_active === false) {
            const suspendedResponse = NextResponse.redirect(`${origin}/suspended`)
            const cleanClient = createServerClient(
              url,
              anonKey,
              {
                global: {
                  fetch: customFetch,
                },
                cookies: {
                  getAll() {
                    return request.cookies.getAll()
                  },
                  setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                      suspendedResponse.cookies.set(name, value, options)
                    })
                  },
                },
              }
            )
            await cleanClient.auth.signOut()
            return suspendedResponse
          }
        }
      } catch (err) {
        console.error('Error checking profile is_active in callback:', err)
      }
      
      return response
    }
  }

  // Redirect to login page if authentication fails
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
