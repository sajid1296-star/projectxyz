import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new NextResponse('E-Mail-Adresse erforderlich', { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Aus Sicherheitsgründen geben wir die gleiche Erfolgsmeldung zurück
      return NextResponse.json({
        message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet',
      });
    }

    // Reset-Token generieren
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden

    // Token in der Datenbank speichern
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Reset-Link generieren
    const resetUrl = `${process.env.NEXT_PUBLIC_URL}/auth/reset-password/${resetToken}`;

    // Reset-E-Mail senden
    await sendEmail({
      to: email,
      subject: 'Passwort zurücksetzen',
      html: `
        <div>
          <h1>Passwort zurücksetzen</h1>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Der Link ist 24 Stunden gültig.</p>
          <p>Falls Sie keine Anfrage gestellt haben, können Sie diese E-Mail ignorieren.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet',
    });
  } catch (error) {
    console.error('Password Reset Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return new NextResponse('Token und Passwort erforderlich', { status: 400 });
    }

    // Benutzer mit gültigem Token suchen
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return new NextResponse('Ungültiger oder abgelaufener Token', {
        status: 400,
      });
    }

    // Neues Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 12);

    // Passwort aktualisieren und Token zurücksetzen
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Bestätigungs-E-Mail senden
    await sendEmail({
      to: user.email,
      subject: 'Passwort erfolgreich geändert',
      html: `
        <div>
          <h1>Passwort geändert</h1>
          <p>Ihr Passwort wurde erfolgreich geändert.</p>
          <p>Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'Passwort erfolgreich zurückgesetzt',
    });
  } catch (error) {
    console.error('Password Reset Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 