'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const timeframes = [
  { label: 'Letzte Stunde', value: '1h' },
  { label: 'Heute', value: '24h' },
  { label: 'Diese Woche', value: '7d' },
  { label: 'Dieser Monat', value: '30d' }
]

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [timeframe, setTimeframe] = useState('24h')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Auto-refresh
    return () => clearInterval(interval)
  }, [timeframe])

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/analytics/metrics?timeframe=${timeframe}`
      )
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Lädt...</div>
  if (!metrics) return <div>Keine Daten verfügbar</div>

  return (
    <div className="space-y-6">
      {/* Zeitauswahl */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm"
        >
          {timeframes.map(tf => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>

      {/* Metrikkarten */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Aktive Benutzer
          </h3>
          <p className="mt-2 text-3xl font-bold">
            {metrics.activeUsers}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Seitenaufrufe
          </h3>
          <p className="mt-2 text-3xl font-bold">
            {metrics.pageviews}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Conversions
          </h3>
          <p className="mt-2 text-3xl font-bold">
            {metrics.conversions}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Umsatz
          </h3>
          <p className="mt-2 text-3xl font-bold">
            {new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: 'EUR'
            }).format(metrics.revenue)}
          </p>
        </div>
      </div>

      {/* Grafiken */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            Besucher-Verlauf
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.visitorTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) =>
                  format(new Date(ts), 'HH:mm', { locale: de })
                }
              />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">
            Top Seiten
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topPages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="path" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weitere Analysen */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">
          Conversion-Trichter
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={metrics.funnel}
            layout="vertical"
            margin={{ left: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="stage"
              width={100}
            />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 