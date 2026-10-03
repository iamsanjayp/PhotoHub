'use client'

import { useEffect } from 'react'

/**
 * Global scroll-lock fixer.
 * 
 * Modals or overlays sometimes set overflow:hidden / pointer-events:none
 * on <body> when opened, but may fail to remove those styles when closed.
 *
 * This component checks: if <body> is scroll-locked but there is NO active modal
 * currently open in the DOM, it force-clears the lock.
 */
export function ScrollLockFixer() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect if any modal-like overlay is actively visible
    const hasActiveOverlay = (): boolean => {
      // Check for any iframe that is positioned to cover the viewport
      // (Cloudinary widget uses a full-screen iframe)
      const iframes = document.querySelectorAll('iframe')
      for (const iframe of iframes) {
        const style = window.getComputedStyle(iframe)
        if (
          style.position === 'fixed' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        ) {
          return true
        }
      }

      // Check for Radix UI dialog portals (legitimate scroll locks from our own modals)
      const radixPortals = document.querySelectorAll('[data-radix-portal]')
      for (const portal of radixPortals) {
        // Only count portals that have a visible dialog inside
        if (portal.querySelector('[data-state="open"]')) {
          return true
        }
      }

      return false
    }

    const forceUnlock = () => {
      const body = document.body
      const html = document.documentElement
      const bodyOverflow = body.style.overflow
      const bodyPointer = body.style.pointerEvents
      const htmlOverflow = html.style.overflow

      const isLocked =
        bodyOverflow === 'hidden' ||
        bodyPointer === 'none' ||
        htmlOverflow === 'hidden'

      if (isLocked && !hasActiveOverlay()) {
        body.style.overflow = ''
        body.style.pointerEvents = ''
        body.style.position = ''
        body.style.top = ''
        body.style.width = ''
        body.style.height = ''
        html.style.overflow = ''
        html.style.pointerEvents = ''
      }
    }

    // Aggressive polling — 200ms
    const interval = setInterval(forceUnlock, 200)

    // Also react to DOM changes for instant response
    const observer = new MutationObserver(() => {
      // Small delay to let the widget finish its DOM cleanup
      setTimeout(forceUnlock, 50)
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])

  return null
}
