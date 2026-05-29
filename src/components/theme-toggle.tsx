'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // Determine initial theme on client mount
    const root = document.documentElement
    const currentTheme = root.classList.contains('dark') ? 'dark' : 'light'
    setTheme(currentTheme)
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 text-neutral-400 hover:text-white dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl transition-colors shrink-0"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-cyan-400" />
      ) : (
        <Moon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
