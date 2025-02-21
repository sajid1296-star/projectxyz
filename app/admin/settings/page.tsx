'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface Settings {
  siteName: string;
  contactEmail: string;
  orderNotifications: boolean;
  tradeInNotifications: boolean;
  maintenanceMode: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: 'Mein Shop',
    contactEmail: 'kontakt@beispiel.de',
    orderNotifications: true,
    tradeInNotifications: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Fehler beim Speichern der Einstellungen');

      toast.success('Einstellungen erfolgreich gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Einstellungen</h1>
        <p className="mt-2 text-sm text-gray-700">
          Verwalten Sie die Systemeinstellungen
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Allgemeine Einstellungen
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Grundlegende Einstellungen für Ihren Shop
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-4">
                  <label
                    htmlFor="siteName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Shop-Name
                  </label>
                  <input
                    type="text"
                    name="siteName"
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) =>
                      setSettings({ ...settings, siteName: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <label
                    htmlFor="contactEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Kontakt-E-Mail
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    id="contactEmail"
                    value={settings.contactEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, contactEmail: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Benachrichtigungen
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Verwalten Sie E-Mail-Benachrichtigungen
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="orderNotifications"
                      name="orderNotifications"
                      type="checkbox"
                      checked={settings.orderNotifications}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          orderNotifications: e.target.checked,
                        })
                      }
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor="orderNotifications"
                      className="font-medium text-gray-700"
                    >
                      Bestellbenachrichtigungen
                    </label>
                    <p className="text-gray-500">
                      Erhalten Sie E-Mails bei neuen Bestellungen
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="tradeInNotifications"
                      name="tradeInNotifications"
                      type="checkbox"
                      checked={settings.tradeInNotifications}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          tradeInNotifications: e.target.checked,
                        })
                      }
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor="tradeInNotifications"
                      className="font-medium text-gray-700"
                    >
                      Ankaufsbenachrichtigungen
                    </label>
                    <p className="text-gray-500">
                      Erhalten Sie E-Mails bei neuen Ankaufsanfragen
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                System
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Systemeinstellungen und Wartung
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="maintenanceMode"
                    name="maintenanceMode"
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maintenanceMode: e.target.checked,
                      })
                    }
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="maintenanceMode"
                    className="font-medium text-gray-700"
                  >
                    Wartungsmodus
                  </label>
                  <p className="text-gray-500">
                    Aktivieren Sie den Wartungsmodus für Systemarbeiten
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {loading ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
} 