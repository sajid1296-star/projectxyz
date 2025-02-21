import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationService } from '@/lib/notifications'
import { rateLimit } from '@/lib/rate-limit'

const notifications = new NotificationService()

export async function POST(req: Request) {
  try {
    // Rate Limiting
    const limiter = await rateLimit('notifications', {
      max: 100,
      windowMs: 60 * 1000
    })

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const notification = await notifications.send({
      ...data,
      recipients: [{
        id: session.user.id,
        channels: data.channels || ['email']
      }]
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      { error: 'Benachrichtigungsfehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = await notifications.getNotificationStatus(
      searchParams.get('id')!
    )
    return NextResponse.json({ status })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      { error: 'Benachrichtigungsfehler' },
      { status: 500 }
    )
  }
} 