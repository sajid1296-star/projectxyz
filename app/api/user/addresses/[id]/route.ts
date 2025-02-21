import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Adresse aktualisieren
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const data = await req.json()

    // Prüfen ob Adresse dem Benutzer gehört
    const address = await prisma.address.findUnique({
      where: { id: params.id },
    })

    if (!address || address.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      )
    }

    // Wenn als Standardadresse markiert, alle anderen auf false setzen
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: session.user.id,
          NOT: { id: params.id },
        },
        data: { isDefault: false },
      })
    }

    const updatedAddress = await prisma.address.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(updatedAddress)
  } catch (error) {
    console.error('Address update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// Adresse löschen
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Prüfen ob Adresse dem Benutzer gehört
    const address = await prisma.address.findUnique({
      where: { id: params.id },
    })

    if (!address || address.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      )
    }

    await prisma.address.delete({
      where: { id: params.id },
    })

    // Wenn gelöschte Adresse Standard war, älteste verbleibende als Standard setzen
    if (address.isDefault) {
      const oldestAddress = await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      })

      if (oldestAddress) {
        await prisma.address.update({
          where: { id: oldestAddress.id },
          data: { isDefault: true },
        })
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Address deletion error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 