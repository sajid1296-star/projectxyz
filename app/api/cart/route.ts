import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { productId, quantity } = await req.json()

    if (!productId || quantity < 1) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage' },
        { status: 400 }
      )
    }

    // Prüfen ob Produkt existiert
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produkt nicht gefunden' },
        { status: 404 }
      )
    }

    // Warenkorb des Benutzers finden oder erstellen
    const cart = await prisma.cart.upsert({
      where: {
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
      },
      update: {},
    })

    // Produkt zum Warenkorb hinzufügen oder Menge aktualisieren
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    })

    return NextResponse.json(cartItem, { status: 200 })
  } catch (error) {
    console.error('Cart error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 