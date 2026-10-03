import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { customFetch } from '@/lib/supabase/fetch'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Determine true public origin (avoid container internal localhost:3000)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || 'photohub.bitsathy.ac.in'
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = process.env.SITE_URL || (host.includes('localhost') && process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL : `${proto}://${host}`)

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
      
      return response
    }
  }

  // Redirect to login page if authentication fails
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
