import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExperimentManager } from '@/lib/experiments'

const manager = ExperimentManager.getInstance()

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const experimentId = searchParams.get('id')

    if (experimentId) {
      const results = await manager.getResults(experimentId)
      return NextResponse.json(results)
    }

    const experiments = await prisma.experiment.findMany({
      include: {
        variants: true,
        metrics: true
      }
    })

    return NextResponse.json(experiments)
  } catch (error) {
    console.error('Experiment error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { experiment } = await req.json()

    const created = await prisma.experiment.create({
      data: {
        ...experiment,
        variants: {
          create: experiment.variants
        },
        metrics: {
          create: experiment.metrics
        }
      },
      include: {
        variants: true,
        metrics: true
      }
    })

    return NextResponse.json(created)
  } catch (error) {
    console.error('Experiment creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 