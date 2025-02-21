import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentService } from '@/lib/payment'
import { rateLimit } from '@/lib/rate-limit'

const paymentService = new PaymentService()

export async function POST(req: Request) {
  try {
    // Rate Limiting
    const limiter = await rateLimit('payment_create', {
      max: 10,
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
    const payment = await paymentService.createPayment({
      ...data,
      customerId: session.user.id
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { error: 'Zahlungsfehler' },
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
    const payments = await prisma.payment.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { error: 'Zahlungsfehler' },
      { status: 500 }
    )
  }
} 