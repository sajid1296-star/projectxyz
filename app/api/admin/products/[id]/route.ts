import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Produkt aktualisieren
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    // Vorhandene Bilder löschen
    await prisma.image.deleteMany({
      where: { productId: params.id },
    })

    // Produkt aktualisieren
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        brandId: data.brandId,
        condition: data.condition,
        warranty: data.warranty,
        images: {
          create: data.images.map((url: string) => ({
            url,
            alt: data.name,
          })),
        },
      },
      include: {
        images: true,
        category: true,
        brand: true,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// Produkt löschen
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Bilder löschen
    await prisma.image.deleteMany({
      where: { productId: params.id },
    })

    // Produkt löschen
    await prisma.product.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 