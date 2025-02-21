'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  orders: {
    id: string;
    totalAmount: number;
  }[];
  tradeInRequests: {
    id: string;
    status: string;
  }[];
}

interface UserListProps {
  users: User[];
  onUserDeleted: (userId: string) => void;
}

export default function UserList({ users, onUserDeleted }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;

    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Fehler beim Löschen des Benutzers');

      toast.success('Benutzer erfolgreich gelöscht');
      onUserDeleted(userId);
    } catch (error) {
      toast.error('Fehler beim Löschen des Benutzers');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Benutzer suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.role === 'ADMIN' ? 'Administrator' : 'Benutzer'}
                    </span>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loading === user.id || user.role === 'ADMIN'}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      {loading === user.id ? 'Wird gelöscht...' : 'Löschen'}
                    </button>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Bestellungen: {user.orders.length}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Ankaufsanfragen: {user.tradeInRequests.length}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>Registriert am: {formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 