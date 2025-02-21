import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Neues Produkt erstellen
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
    
    // Validierung
    if (!data.name || !data.description || !data.price || !data.categoryId || !data.brandId) {
      return NextResponse.json(
        { error: 'Alle Pflichtfelder müssen ausgefüllt sein' },
        { status: 400 }
      )
    }

    // Produkt erstellen
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
        brandId: data.brandId,
        images: {
          create: data.images.map((url: string) => ({ url })),
        },
        variants: {
          create: data.variants,
        },
      },
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  // Ähnliche Implementierung wie POST, aber mit update statt create
}

export async function DELETE(req: Request) {
  // Implementierung für Produktlöschung
} 