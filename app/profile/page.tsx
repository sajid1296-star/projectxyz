import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ProfileForm from '@/components/profile/ProfileForm';
import AddressForm from '@/components/profile/AddressForm';
import PasswordForm from '@/components/profile/PasswordForm';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      addresses: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="py-10">
        <div className="space-y-10 divide-y divide-gray-900/10">
          {/* Profildaten */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
            <div className="px-4 sm:px-0">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Profil
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Aktualisieren Sie Ihre persönlichen Informationen.
              </p>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
              <ProfileForm user={user} />
            </div>
          </div>

          {/* Adressen */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
            <div className="px-4 sm:px-0">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Adressen
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Verwalten Sie Ihre Lieferadressen.
              </p>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
              <AddressForm addresses={user.addresses} />
            </div>
          </div>

          {/* Passwort */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
            <div className="px-4 sm:px-0">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Passwort
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Ändern Sie Ihr Passwort.
              </p>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
              <PasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 