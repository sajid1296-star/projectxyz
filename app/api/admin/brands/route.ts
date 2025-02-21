import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Neue Marke erstellen
export async function POST(req: Request) {
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

    // Prüfen ob Marke bereits existiert
    const existingBrand = await prisma.brand.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive Vergleich
        },
      },
    })

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Eine Marke mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: { name },
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Brand creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 