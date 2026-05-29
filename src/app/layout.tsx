import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { getCurrentProfile } from '@/actions/auth'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#06B6D4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'PhotoHub | College Photography Club',
  description: 'Digital operations platform for the Bannari Amman Institute of Technology Photography Club',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PhotoHub',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} min-h-screen antialiased`}>
        <QueryProvider>
          <AuthProvider initialProfile={profile}>
            {children}
            <Toaster theme="dark" closeButton richColors position="top-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
