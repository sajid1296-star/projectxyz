import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateDiscount, validateDiscount } from '@/lib/discounts'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const data = await req.json()
    
    const discount = await prisma.discount.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase,
        maxUses: data.maxUses,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        conditions: data.conditions,
        categories: {
          connect: data.categoryIds?.map((id: string) => ({ id }))
        },
        products: {
          connect: data.productIds?.map((id: string) => ({ id }))
        }
      }
    })

    return NextResponse.json(discount)
  } catch (error) {
    console.error('Discount creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const cartTotal = parseFloat(searchParams.get('cartTotal') || '0')
  const items = JSON.parse(searchParams.get('items') || '[]')

  if (!code) {
    return NextResponse.json(
      { error: 'Gutscheincode erforderlich' },
      { status: 400 }
    )
  }

  const discount = await prisma.discount.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      categories: true,
      products: true
    }
  })

  if (!discount) {
    return NextResponse.json(
      { error: 'Ungültiger Gutscheincode' },
      { status: 404 }
    )
  }

  const validationError = validateDiscount(discount, cartTotal)
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    )
  }

  const discountAmount = calculateDiscount(discount, items, cartTotal)

  return NextResponse.json({
    discount,
    amount: discountAmount
  })
} 