import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return session.user;
}

export function withAdminAuth<T extends object>(
  Component: React.ComponentType<T>
) {
  return function AdminProtectedComponent(props: T) {
    const session = getServerSession(authOptions);

    if (!session) {
      return redirect('/auth/login');
    }

    if (session.user?.role !== 'ADMIN') {
      return redirect('/');
    }

    return <Component {...props} />;
  };
} 