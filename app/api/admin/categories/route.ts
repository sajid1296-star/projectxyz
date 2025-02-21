import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Neue Kategorie erstellen
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { name, parentId, slug, description, metadata } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfen ob Kategorie bereits existiert
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive Vergleich
        },
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId,
        metadata: {
          create: metadata
        }
      },
      include: {
        parent: true,
        children: true,
        metadata: true,
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 