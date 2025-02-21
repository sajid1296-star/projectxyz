'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

interface MessageThreadProps {
  requestId: string;
  messages: Message[];
  onNewMessage: () => void;
}

export default function MessageThread({ requestId, messages, onNewMessage }: MessageThreadProps) {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/trade-in/${requestId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) throw new Error('Nachricht konnte nicht gesendet werden');

      setNewMessage('');
      onNewMessage();
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Kommunikation
        </h2>
      </div>

      <div className="p-4 h-96 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Noch keine Nachrichten vorhanden
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isAdmin ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[75%] ${
                  message.isAdmin
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${
                  message.isAdmin ? 'text-gray-500' : 'text-blue-100'
                }`}>
                  {formatDate(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ihre Nachricht..."
            className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Senden
          </button>
        </div>
      </form>
    </div>
  );
} 