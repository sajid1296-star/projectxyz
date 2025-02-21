import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QueueService } from '@/lib/queue'

const queueService = new QueueService()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { queue, data, options } = await req.json()
    const job = await queueService.addJob(queue, data, options)

    return NextResponse.json({ jobId: job.id })
  } catch (error) {
    console.error('Queue error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const stats = await queueService.getQueueStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Queue error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 