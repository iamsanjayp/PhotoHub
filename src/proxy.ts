import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/unauthorized', '/apex-request', '/auth/callback', '/auth/confirm', '/auth/v1', '/rest/v1', '/storage/v1']

// Routes that require admin or leader role
const adminRoutes = ['/admin']

function getPublicOrigin() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return process.env.SITE_URL || 'https://photohub.bitsathy.ac.in'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and backend Supabase endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/v1') ||
    pathname.startsWith('/rest/v1') ||
    pathname.startsWith('/storage/v1') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  const { user, supabaseResponse, supabase } = await updateSession(request)

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Allow public routes without auth
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const origin = getPublicOrigin()
    return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(pathname)}`)
  }

  // Validate email domain
  const email = (user.email || '').toLowerCase().trim()
  if (!email.endsWith('@bitsathy.ac.in')) {
    // Sign out the user and redirect to unauthorized
    await supabase.auth.signOut()
    const origin = getPublicOrigin()
    return NextResponse.redirect(`${origin}/unauthorized`)
  }

  // Check admin routes
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isAdminRoute) {
    // Fetch user role from profiles
    let { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      const internalUrl = process.env.SUPABASE_INTERNAL_URL || 'http://kong:8000'
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      try {
        const res = await fetch(`${internalUrl}/rest/v1/profiles?select=role&id=eq.${user.id}`, {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
          }
        })
        if (res.ok) {
          const rows = await res.json()
          if (rows && rows.length > 0) {
            profile = rows[0]
          }
        }
      } catch (err) {
        console.error('Middleware admin check fallback error:', err)
      }
    }

    if (!profile || !['admin', 'board_member', 'leader'].includes(profile.role)) {
      const origin = getPublicOrigin()
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
