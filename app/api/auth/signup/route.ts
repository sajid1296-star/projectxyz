import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return new NextResponse('Fehlende Pflichtfelder', { status: 400 });
    }

    // E-Mail-Format überprüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new NextResponse('Ungültige E-Mail-Adresse', { status: 400 });
    }

    // Passwort-Anforderungen überprüfen
    if (password.length < 8) {
      return new NextResponse('Passwort muss mindestens 8 Zeichen lang sein', { status: 400 });
    }

    // Prüfen, ob die E-Mail bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse('E-Mail-Adresse bereits registriert', { status: 400 });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 12);

    // Benutzer erstellen
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: email === process.env.ADMIN_EMAIL ? 'ADMIN' : 'USER',
      },
    });

    // Willkommens-E-Mail senden
    await sendEmail({
      to: email,
      subject: 'Willkommen bei unserem Service',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Willkommen, ${name}!</h2>
          <p>Vielen Dank für Ihre Registrierung. Ihr Konto wurde erfolgreich erstellt.</p>
          <p>Sie können sich jetzt mit Ihrer E-Mail-Adresse und Ihrem Passwort anmelden.</p>
          <p>Mit freundlichen Grüßen<br>Ihr Support-Team</p>
        </div>
      `,
    });

    // Sensible Daten aus der Antwort entfernen
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Registration Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 