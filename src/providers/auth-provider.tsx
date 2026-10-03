'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  refreshProfile: (newProfile?: Profile) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({
  children,
  initialProfile,
}: {
  children: ReactNode
  initialProfile: Profile | null
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [loading, setLoading] = useState(!initialProfile)
  const supabase = createClient()

  const refreshProfile = async (newProfile?: Profile) => {
    console.log('[refreshProfile] Starting...')
    if (newProfile) {
      console.log('[refreshProfile] Using provided profile')
      setProfile(newProfile)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[refreshProfile] No user found')
      setProfile(null)
      return
    }

    console.log('[refreshProfile] Fetching profile for user', user.id)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('[refreshProfile] Profile fetched:', data)
    setProfile(data)
  }

  useEffect(() => {
    if (!initialProfile) {
      refreshProfile().finally(() => setLoading(false))
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          await refreshProfile()
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
