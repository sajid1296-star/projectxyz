import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EmailService } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

const emailService = new EmailService()

export async function POST(req: Request) {
  try {
    // Rate Limiting
    const limiter = await rateLimit('email_send', {
      max: 60,
      windowMs: 60 * 1000
    })

    const session = await getServerSession(authOptions)
    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const email = await emailService.send(data)

    return NextResponse.json(email)
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json(
      { error: 'Email-Fehler' },
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
    const { searchParams } = new URL(req.url)
    const emails = await prisma.email.findMany({
      where: {
        template: searchParams.get('template') || undefined,
        status: searchParams.get('status') || undefined
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(searchParams.get('limit') || '50')
    })
    return NextResponse.json(emails)
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json(
      { error: 'Email-Fehler' },
      { status: 500 }
    )
  }
} 