import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { getServerSession } from 'next-auth';

// Berechtigungsprüfung
export async function checkPermission(userId: string, permission: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true }
  });

  if (user?.role === 'ADMIN') return true;
  return user?.permissions.some(p => p.name === permission) ?? false;
}

// NextAuth Konfiguration mit Rollen und Berechtigungen
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user?.password) {
          throw new Error('Invalid credentials');
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials');
        }

        return user;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: 'USER', // Google-Anmeldungen sind standardmäßig normale Benutzer
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        include: { permissions: true }
      });

      if (user) {
        token.role = user.role;
        token.permissions = user.permissions.map(p => p.name);
      }

      return token;
    }
  },
};

// Middleware für Routenschutz
export function withAuth(handler: any, requiredPermissions: string[] = []) {
  return async (req: Request, context: any) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (requiredPermissions.length > 0) {
      const hasPermission = await Promise.all(
        requiredPermissions.map(perm => 
          checkPermission(session.user.id, perm)
        )
      );

      if (!hasPermission.every(Boolean)) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    return handler(req, context);
  };
} 