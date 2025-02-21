'use client';

import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface AnalyticsData {
  dailyOrders: {
    date: string;
    count: number;
    revenue: number;
  }[];
  topProducts: {
    productId: string;
    _sum: {
      quantity: number;
      price: number;
    };
  }[];
  topCustomers: {
    userId: string;
    _sum: {
      totalAmount: number;
    };
    _count: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/admin/analytics?start=${dateRange.start}&end=${dateRange.end}`
      );
      if (!response.ok) throw new Error('Fehler beim Laden der Analysen');
      const data = await response.json();
      setData(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Analysedaten');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analysen</h1>
        <p className="mt-2 text-sm text-gray-700">
          Detaillierte Einblicke in Ihre Geschäftszahlen
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) =>
            setDateRange({ ...dateRange, start: e.target.value })
          }
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Tägliche Bestellungen und Umsatz
            </h3>
            <div className="mt-4 h-72">
              <Line
                data={{
                  labels: data.dailyOrders.map((d) => d.date),
                  datasets: [
                    {
                      label: 'Bestellungen',
                      data: data.dailyOrders.map((d) => d.count),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      yAxisID: 'y',
                    },
                    {
                      label: 'Umsatz',
                      data: data.dailyOrders.map((d) => d.revenue),
                      borderColor: 'rgb(16, 185, 129)',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Top-Produkte
            </h3>
            <div className="mt-4">
              <Bar
                data={{
                  labels: data.topProducts.map((p) => `Produkt ${p.productId}`),
                  datasets: [
                    {
                      label: 'Verkaufte Menge',
                      data: data.topProducts.map((p) => p._sum.quantity),
                      backgroundColor: 'rgb(59, 130, 246)',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Top-Kunden nach Umsatz
            </h3>
            <div className="mt-4">
              <Bar
                data={{
                  labels: data.topCustomers.map((c) => `Kunde ${c.userId}`),
                  datasets: [
                    {
                      label: 'Gesamtumsatz',
                      data: data.topCustomers.map((c) => c._sum.totalAmount),
                      backgroundColor: 'rgb(16, 185, 129)',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 