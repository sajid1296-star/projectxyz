import { NextResponse } from 'next/server'
import { calculateShippingOptions } from '@/lib/shipping'

export async function POST(req: Request) {
  try {
    const { countryCode, items, cartTotal } = await req.json()

    const shippingOptions = await calculateShippingOptions(
      countryCode,
      items,
      cartTotal
    )

    return NextResponse.json(shippingOptions)
  } catch (error: any) {
    console.error('Shipping calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: error.message ? 400 : 500 }
    )
  }
} 