'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ExperimentManager } from '@/lib/experiments'

interface ExperimentWrapperProps {
  experimentName: string
  variants: Record<string, React.ReactNode>
  onMetric?: (name: string, value: number) => void
}

export default function ExperimentWrapper({
  experimentName,
  variants,
  onMetric
}: ExperimentWrapperProps) {
  const { data: session } = useSession()
  const [variant, setVariant] = useState<string | null>(null)
  const manager = ExperimentManager.getInstance()

  useEffect(() => {
    const assignVariant = async () => {
      const result = await manager.getVariant(experimentName, {
        userId: session?.user?.id,
        userAgent: navigator.userAgent,
        path: window.location.pathname
      })

      if (result) {
        setVariant(result.name)
      }
    }

    assignVariant()
  }, [experimentName, session])

  const trackMetric = async (name: string, value: number) => {
    if (!variant) return

    await manager.trackMetric(experimentName, name, value, {
      userId: session?.user?.id,
      variant
    })

    onMetric?.(name, value)
  }

  if (!variant || !variants[variant]) {
    return variants.control || null
  }

  const VariantComponent = variants[variant]
  return (
    <div data-experiment={experimentName} data-variant={variant}>
      {VariantComponent}
    </div>
  )
} 