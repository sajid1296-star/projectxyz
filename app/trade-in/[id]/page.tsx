'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TradeInStatus, DeviceCondition } from '@prisma/client';
import StatusBadge from '@/components/trade-in/StatusBadge';
import MessageThread from '@/components/trade-in/MessageThread';
import { toast } from 'react-hot-toast';

interface TradeInRequest {
  id: string;
  status: TradeInStatus;
  deviceType: string;
  brand: string;
  model: string;
  condition: DeviceCondition;
  storage?: string;
  color?: string;
  description?: string;
  images: { url: string }[];
  originalPrice: number;
  offeredPrice: number;
  finalPrice?: number;
  createdAt: string;
  messages: Array<{
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

export default function TradeInDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [request, setRequest] = useState<TradeInRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradeInRequest();
  }, []);

  const fetchTradeInRequest = async () => {
    try {
      const response = await fetch(`/api/trade-in/${params.id}`);
      if (!response.ok) throw new Error('Anfrage konnte nicht geladen werden');
      const data = await response.json();
      setRequest(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Anfrage');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TradeInStatus) => {
    try {
      const response = await fetch(`/api/trade-in/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Status konnte nicht aktualisiert werden');
      
      await fetchTradeInRequest();
      toast.success('Status erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Anfrage nicht gefunden
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
        {/* Linke Spalte - Geräteinformationen */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Ankaufsanfrage: {request.brand} {request.model}
          </h1>
          
          <div className="mt-6">
            <StatusBadge status={request.status} />
          </div>

          <dl className="mt-6 space-y-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <dt className="text-sm font-medium text-gray-500">Gerätetyp</dt>
              <dd className="text-sm text-gray-900">{request.deviceType}</dd>
              
              <dt className="text-sm font-medium text-gray-500">Zustand</dt>
              <dd className="text-sm text-gray-900">{request.condition}</dd>
              
              {request.storage && (
                <>
                  <dt className="text-sm font-medium text-gray-500">Speicher</dt>
                  <dd className="text-sm text-gray-900">{request.storage}</dd>
                </>
              )}
              
              {request.color && (
                <>
                  <dt className="text-sm font-medium text-gray-500">Farbe</dt>
                  <dd className="text-sm text-gray-900">{request.color}</dd>
                </>
              )}
              
              <dt className="text-sm font-medium text-gray-500">Erstellt am</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(request.createdAt)}
              </dd>
            </div>

            {request.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Beschreibung</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {request.description}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Bilder</dt>
              <dd className="mt-2 grid grid-cols-2 gap-4">
                {request.images.map((image, index) => (
                  <div key={index} className="relative aspect-w-3 aspect-h-2">
                    <Image
                      src={image.url}
                      alt={`Bild ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Geschätzter Preis</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(request.originalPrice)}
                </p>
              </div>
              {request.finalPrice && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Finaler Preis</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(request.finalPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rechte Spalte - Nachrichten und Aktionen */}
        <div className="mt-8 lg:mt-0">
          <MessageThread
            requestId={request.id}
            messages={request.messages}
            onNewMessage={fetchTradeInRequest}
          />

          {session?.user?.role === 'ADMIN' && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">
                Admin-Aktionen
              </h3>
              <div className="mt-4 space-y-4">
                <button
                  onClick={() => handleStatusUpdate('reviewing')}
                  disabled={request.status !== 'pending'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  Prüfung beginnen
                </button>
                
                <button
                  onClick={() => handleStatusUpdate('offerMade')}
                  disabled={request.status !== 'reviewing'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                >
                  Angebot erstellen
                </button>
                
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={request.status === 'completed' || request.status === 'cancelled'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
                >
                  Anfrage ablehnen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 