'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function AffiliateDashboard() {
  const { data: session } = useSession()
  const [affiliate, setAffiliate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('month')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/affiliates')
        const data = await response.json()
        setAffiliate(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchData()
    }
  }, [session])

  if (loading) return <div>Lädt...</div>
  if (!affiliate) return <div>Keine Affiliate-Daten gefunden</div>

  const stats = {
    totalEarnings: affiliate.referrals.reduce(
      (sum: number, ref: any) => sum + ref.commission,
      0
    ),
    pendingBalance: affiliate.balance,
    totalReferrals: affiliate.referrals.length,
    conversionRate: (
      (affiliate.referrals.filter((r: any) => r.status === 'APPROVED').length /
        affiliate.referrals.length) *
      100
    ).toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Gesamtverdienst
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalEarnings.toFixed(2)} €
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Offenes Guthaben
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.pendingBalance.toFixed(2)} €
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Referrals
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalReferrals}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Conversion Rate
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.conversionRate}%
          </p>
        </div>
      </div>

      {/* Affiliate-Link */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">
          Ihr Affiliate-Link
        </h3>
        <div className="mt-2 flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={`${window.location.origin}?ref=${affiliate.code}`}
            className="flex-1 rounded-md border-gray-300 shadow-sm"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}?ref=${affiliate.code}`
              )
            }}
            className="rounded-md bg-primary-600 px-4 py-2 text-white"
          >
            Kopieren
          </button>
        </div>
      </div>

      {/* Verlaufsgrafik */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Verdienst-Verlauf
          </h3>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="week">Woche</option>
            <option value="month">Monat</option>
            <option value="year">Jahr</option>
          </select>
        </div>
        <div className="mt-4 h-80">
          <LineChart
            width={800}
            height={300}
            data={affiliate.referrals}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="createdAt"
              tickFormatter={(date) =>
                format(new Date(date), 'P', { locale: de })
              }
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="commission"
              stroke="#8884d8"
              name="Provision"
            />
          </LineChart>
        </div>
      </div>

      {/* Letzte Referrals */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">
          Letzte Referrals
        </h3>
        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Datum
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Bestellung
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Provision
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {affiliate.referrals.map((referral: any) => (
                    <tr key={referral.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(
                          new Date(referral.createdAt),
                          'PPp',
                          { locale: de }
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {referral.order.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {referral.commission.toFixed(2)} €
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {referral.status}
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
  )
} 