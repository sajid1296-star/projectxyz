import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Bitte alle Felder ausfüllen' },
        { status: 400 }
      );
    }

    // Email-Format überprüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige Email-Adresse' },
        { status: 400 }
      );
    }

    // Überprüfen ob Benutzer bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email bereits registriert' },
        { status: 400 }
      );
    }

    // Passwort-Validierung
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 12);

    // Benutzer erstellen
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Sensible Daten entfernen
    const { password: _, ...userWithoutPassword } = user;

    // Willkommens-E-Mail senden
    await sendEmail({
      to: email,
      subject: 'Willkommen bei unserem Shop',
      html: `
        <div>
          <h1>Willkommen ${name}!</h1>
          <p>Vielen Dank für Ihre Registrierung.</p>
          <p>Sie können sich jetzt mit Ihrer E-Mail-Adresse anmelden.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { 
        message: 'Registrierung erfolgreich', 
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist bei der Registrierung aufgetreten' },
      { status: 500 }
    );
  }
} 