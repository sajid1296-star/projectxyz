import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Kategorie aktualisieren
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

    // Prüfen ob eine andere Kategorie bereits diesen Namen hat
    const existingCategory = await prisma.category.findFirst({
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

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// Kategorie löschen
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

    // Alle Produkte dieser Kategorie auf null setzen
    await prisma.product.updateMany({
      where: { categoryId: params.id },
      data: { categoryId: null },
    })

    // Kategorie löschen
    await prisma.category.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Category deletion error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 