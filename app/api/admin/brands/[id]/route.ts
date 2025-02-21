import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Marke aktualisieren
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

    const { name } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfen ob eine andere Marke bereits diesen Namen hat
    const existingBrand = await prisma.brand.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        NOT: {
          id: params.id,
        },
      },
    })

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Eine Marke mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: { name },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Brand update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// Marke löschen
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

    // Alle Produkte dieser Marke auf null setzen
    await prisma.product.updateMany({
      where: { brandId: params.id },
      data: { brandId: null },
    })

    // Marke löschen
    await prisma.brand.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Brand deletion error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 