'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TradeInStatus } from '@prisma/client';
import StatusBadge from '@/components/trade-in/StatusBadge';
import { toast } from 'react-hot-toast';

interface TradeInRequest {
  id: string;
  status: TradeInStatus;
  deviceType: string;
  brand: string;
  model: string;
  createdAt: string;
  offeredPrice: number;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminTradeInPage() {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TradeInStatus | 'all'>('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/trade-in');
      if (!response.ok) throw new Error('Fehler beim Laden der Anfragen');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Ankaufsanfragen');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(request => request.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Ankaufsanfragen
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Übersicht aller Ankaufsanfragen und deren Status
          </p>
        </div>
      </div>

      <div className="mt-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as TradeInStatus | 'all')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="all">Alle Status</option>
          <option value="pending">Ausstehend</option>
          <option value="reviewing">In Prüfung</option>
          <option value="offerMade">Angebot erstellt</option>
          <option value="accepted">Angenommen</option>
          <option value="rejected">Abgelehnt</option>
          <option value="deviceReceived">Gerät erhalten</option>
          <option value="completed">Abgeschlossen</option>
          <option value="cancelled">Storniert</option>
        </select>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Gerät
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Kunde
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Angebotspreis
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Datum
                    </th>
                    <th className="relative px-3 py-3.5">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {request.brand} {request.model}
                        <div className="text-gray-500">{request.deviceType}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {request.user.name}
                        <div className="text-gray-500">{request.user.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {formatCurrency(request.offeredPrice)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="relative whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/trade-in/${request.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 