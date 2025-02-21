'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/orders/StatusBadge';
import { OrderStatus, Order, User } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExtendedOrder extends Order {
  user: {
    name: string | null;
    email: string | null;
  };
}

interface RecentOrdersProps {
  orders: ExtendedOrder[];
}

export default function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="p-6">
        <h2 className="text-base font-medium text-gray-900">
          Letzte Bestellungen
        </h2>
        <div className="mt-6 flow-root">
          <ul role="list" className="-my-5 divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="py-5">
                <div className="relative focus-within:ring-2 focus-within:ring-primary-500">
                  <h3 className="text-sm font-semibold text-gray-800">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Bestellung #{order.id}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {order.user.name || order.user.email} - {order.total.toFixed(2)} €
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {format(new Date(order.createdAt), 'PPP', { locale: de })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 