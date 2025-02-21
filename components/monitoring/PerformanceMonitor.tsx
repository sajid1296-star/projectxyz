'use client'

import { useEffect } from 'react'
import { getCLS, getFID, getLCP } from 'web-vitals'

declare global {
  interface Window {
    connection?: {
      effectiveType: string
      addEventListener: (type: string, cb: () => void) => void
      removeEventListener: (type: string, cb: () => void) => void
    }
  }
}

export default function PerformanceMonitor() {
  useEffect(() => {
    // Web Vitals
    getCLS(metric => sendToAnalytics('CLS', metric.value))
    getFID(metric => sendToAnalytics('FID', metric.value))
    getLCP(metric => sendToAnalytics('LCP', metric.value))

    // Performance Observer
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            sendToAnalytics('FCP', entry.startTime)
          }
        })
      })

      const layoutObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.hadRecentInput) return
          sendToAnalytics('Layout Shift', entry.value)
        })
      })

      paintObserver.observe({ entryTypes: ['paint'] })
      layoutObserver.observe({ entryTypes: ['layout-shift'] })

      return () => {
        paintObserver.disconnect()
        layoutObserver.disconnect()
      }
    }
  }, [])

  const sendToAnalytics = async (
    name: string,
    value: number
  ) => {
    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          value,
          path: window.location.pathname,
          device: navigator.userAgent,
          connection: window.connection?.effectiveType
        })
      })
    } catch (error) {
      console.error('Failed to send metrics:', error)
    }
  }

  return null // Unsichtbare Komponente
} 