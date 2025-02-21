'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DatePicker from 'react-datepicker'
import { de } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

interface ReportBuilderProps {
  onGenerate: (config: any) => void
  onSchedule: (config: any) => void
  onExport: (format: string) => void
}

export default function ReportBuilder({
  onGenerate,
  onSchedule,
  onExport
}: ReportBuilderProps) {
  const [reportData, setReportData] = useState<any>(null)
  const { register, handleSubmit, watch } = useForm()

  const reportType = watch('type')

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen des Reports')

      const result = await response.json()
      setReportData(result)
      onGenerate(result)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Report-Typ
            </label>
            <select
              {...register('type')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="SALES">Verkäufe</option>
              <option value="INVENTORY">Lagerbestand</option>
              <option value="CUSTOMERS">Kunden</option>
              <option value="PRODUCTS">Produkte</option>
              <option value="FINANCIAL">Finanzen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Zeitraum
            </label>
            <div className="mt-1 flex space-x-4">
              <DatePicker
                {...register('startDate')}
                locale={de}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholderText="Von"
              />
              <DatePicker
                {...register('endDate')}
                locale={de}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholderText="Bis"
              />
            </div>
          </div>

          {/* Weitere Filter basierend auf Report-Typ */}
          {reportType === 'SALES' && (
            <div className="sm:col-span-2">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Filter
                </legend>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <input
                      {...register('filters.excludeDiscounts')}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label className="ml-2 text-sm text-gray-600">
                      Rabatte ausschließen
                    </label>
                  </div>
                  {/* Weitere Filter */}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => onExport('excel')}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Excel Export
          </button>
          <button
            type="button"
            onClick={() => onSchedule(watch())}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Zeitplan
          </button>
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            Report generieren
          </button>
        </div>
      </form>

      {reportData && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">
            Report Ergebnisse
          </h3>
          
          <div className="mt-4">
            <BarChart width={800} height={400} data={reportData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#4F46E5" name="Umsatz" />
              <Bar dataKey="orders" fill="#10B981" name="Bestellungen" />
            </BarChart>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reportData.metrics.map((metric: any) => (
              <div
                key={metric.label}
                className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:pt-6"
              >
                <dt className="truncate text-sm font-medium text-gray-500">
                  {metric.label}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {metric.value}
                </dd>
                {metric.change && (
                  <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="text-sm">
                      <span className={
                        metric.change >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }>
                        {metric.change >= 0 ? '+' : ''}{metric.change}%
                      </span>
                      {' '}vs. Vorperiode
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 