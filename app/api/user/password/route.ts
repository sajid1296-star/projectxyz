import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash, compare } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Passwort ändern
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user?.password) {
      return NextResponse.json(
        { error: 'Benutzer hat kein Passwort gesetzt' },
        { status: 400 }
      )
    }

    // Aktuelles Passwort überprüfen
    const isValid = await compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Aktuelles Passwort ist falsch' },
        { status: 400 }
      )
    }

    // Neues Passwort hashen und speichern
    const hashedPassword = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: 'Passwort erfolgreich geändert' })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 