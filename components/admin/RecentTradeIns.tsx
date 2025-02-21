'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { TradeInStatus } from '@prisma/client';

interface TradeIn {
  id: string;
  createdAt: string;
  status: TradeInStatus;
  brand: string;
  model: string;
  condition: string;
  user: {
    name: string;
    email: string;
  };
}

interface RecentTradeInsProps {
  tradeIns: TradeIn[];
}

export default function RecentTradeIns({ tradeIns }: RecentTradeInsProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Aktuelle Ankaufsanfragen
        </h3>
        <Link
          href="/admin/trade-in"
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Alle anzeigen
        </Link>
      </div>
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Gerät
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Kunde
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Zustand
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Datum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tradeIns.map((tradeIn) => (
                    <tr key={tradeIn.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/admin/trade-in/${tradeIn.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {tradeIn.brand} {tradeIn.model}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{tradeIn.user.name}</div>
                        <div className="text-gray-400">{tradeIn.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            {
                              pending: 'bg-yellow-100 text-yellow-800',
                              approved: 'bg-green-100 text-green-800',
                              rejected: 'bg-red-100 text-red-800',
                              completed: 'bg-blue-100 text-blue-800',
                            }[tradeIn.status]
                          }`}
                        >
                          {
                            {
                              pending: 'Ausstehend',
                              approved: 'Genehmigt',
                              rejected: 'Abgelehnt',
                              completed: 'Abgeschlossen',
                            }[tradeIn.status]
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tradeIn.condition}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tradeIn.createdAt)}
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