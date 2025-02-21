import { OrderStatus } from '@prisma/client';

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: {
    label: 'Ausstehend',
    color: 'bg-yellow-100 text-yellow-800',
  },
  processing: {
    label: 'In Bearbeitung',
    color: 'bg-blue-100 text-blue-800',
  },
  shipped: {
    label: 'Versendet',
    color: 'bg-purple-100 text-purple-800',
  },
  delivered: {
    label: 'Geliefert',
    color: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Storniert',
    color: 'bg-red-100 text-red-800',
  },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
} 