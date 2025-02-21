import { TradeInStatus } from '@prisma/client';

const statusConfig: Record<TradeInStatus, { label: string; color: string }> = {
  pending: {
    label: 'Ausstehend',
    color: 'bg-yellow-100 text-yellow-800',
  },
  reviewing: {
    label: 'In Prüfung',
    color: 'bg-blue-100 text-blue-800',
  },
  offerMade: {
    label: 'Angebot erstellt',
    color: 'bg-green-100 text-green-800',
  },
  accepted: {
    label: 'Angenommen',
    color: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Abgelehnt',
    color: 'bg-red-100 text-red-800',
  },
  deviceReceived: {
    label: 'Gerät erhalten',
    color: 'bg-purple-100 text-purple-800',
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'bg-gray-100 text-gray-800',
  },
  cancelled: {
    label: 'Storniert',
    color: 'bg-gray-100 text-gray-800',
  },
};

export default function StatusBadge({ status }: { status: TradeInStatus }) {
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
} 