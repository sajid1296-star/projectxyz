import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Neue Adresse erstellen
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const data = await req.json()

    // Wenn als Standardadresse markiert, alle anderen auf false setzen
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      })
    }

    // Wenn erste Adresse, automatisch als Standard setzen
    const addressCount = await prisma.address.count({
      where: { userId: session.user.id },
    })

    const address = await prisma.address.create({
      data: {
        ...data,
        isDefault: data.isDefault || addressCount === 0,
        userId: session.user.id,
      },
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Address creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 