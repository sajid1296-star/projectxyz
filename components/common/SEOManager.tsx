'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    webVitals: {
      getFCP: () => Promise<number>
      getLCP: () => Promise<number>
      getFID: () => Promise<number>
      getCLS: () => Promise<number>
    }
  }
}

export default function SEOManager() {
  const pathname = usePathname()

  useEffect(() => {
    const reportWebVitals = async () => {
      try {
        const connection = (navigator as any).connection?.effectiveType
        const metrics = {
          fcp: await window.webVitals.getFCP(),
          lcp: await window.webVitals.getLCP(),
          fid: await window.webVitals.getFID(),
          cls: await window.webVitals.getCLS(),
          ttfb: performance.getEntriesByType('navigation')[0].responseStart
        }

        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            metrics,
            userAgent: navigator.userAgent,
            device: getDeviceType(),
            connection
          })
        })
      } catch (error) {
        console.error('Error reporting web vitals:', error)
      }
    }

    // Report nach dem ersten Paint
    requestIdleCallback(() => {
      reportWebVitals()
    })
  }, [pathname])

  return null
}

function getDeviceType() {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
} 