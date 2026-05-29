'use client'

import { useEffect } from 'react'

export function ScrollLockFixer() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let hadCloudinary = false

    const cleanup = () => {
      const hasCloudinary = !!(
        document.querySelector('iframe[src*="cloudinary"]') ||
        document.querySelector('.cloudinary-container') ||
        document.querySelector('[class*="cloudinary"]') ||
        document.querySelector('[id*="cloudinary"]')
      )

      if (hasCloudinary) {
        hadCloudinary = true
      }

      // Cleanup logic if Cloudinary widget was closed, OR if there's a stray lock without any overlay open
      const shouldClean =
        (!hasCloudinary && hadCloudinary) || // Cloudinary just closed
        (!hasCloudinary && !document.querySelector('[role="dialog"]') && !document.querySelector('[data-radix-portal]') && !document.querySelector('.fixed.inset-0.z-50')) // Stray lock, no overlay active

      if (shouldClean) {
        hadCloudinary = false

        const body = document.body
        const html = document.documentElement

        body.style.removeProperty('overflow')
        body.style.removeProperty('pointer-events')
        html.style.removeProperty('overflow')
        html.style.removeProperty('pointer-events')

        if (body.style.overflow === 'hidden' || body.style.pointerEvents === 'none') {
          body.style.overflow = ''
          body.style.pointerEvents = ''
        }
        if (html.style.overflow === 'hidden' || html.style.pointerEvents === 'none') {
          html.style.overflow = ''
          html.style.pointerEvents = ''
        }
      }
    }

    // Watch for child additions/removals (catch iframe mounts/unmounts)
    const domObserver = new MutationObserver(() => {
      cleanup()
    })
    domObserver.observe(document.body, { childList: true, subtree: true })

    // Watch for body and html style changes (catch inline CSS locks)
    const styleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          cleanup()
        }
      })
    })
    styleObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    styleObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    // Fallback poll
    const interval = setInterval(cleanup, 1000)

    // Initial run
    cleanup()

    return () => {
      domObserver.disconnect()
      styleObserver.disconnect()
      clearInterval(interval)
    }
  }, [])

  return null
}
