import { prisma } from './prisma'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { sendEmail } from './email'

interface ReportConfig {
  type: ReportType
  startDate: Date
  endDate: Date
  filters?: any
}

export async function generateReport(config: ReportConfig) {
  const data = await fetchReportData(config)
  const metrics = calculateMetrics(data)
  const charts = generateCharts(data)
  
  return {
    data,
    metrics,
    charts,
    summary: generateSummary(metrics)
  }
}

async function fetchReportData(config: ReportConfig) {
  switch (config.type) {
    case 'SALES':
      return prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', o."createdAt") as date,
          COUNT(*) as orders,
          SUM(o.total) as revenue,
          SUM(o."discountAmount") as discounts,
          COUNT(DISTINCT o."userId") as unique_customers
        FROM "Order" o
        WHERE 
          o."createdAt" BETWEEN ${config.startDate} AND ${config.endDate}
          AND o.status = 'COMPLETED'
        GROUP BY DATE_TRUNC('day', o."createdAt")
        ORDER BY date
      `

    case 'INVENTORY':
      return prisma.$queryRaw`
        SELECT 
          p.name,
          p.sku,
          w.name as warehouse,
          i.quantity,
          i."minQuantity",
          COUNT(sm.id) as movements,
          SUM(CASE WHEN sm.type = 'SALE' THEN sm.quantity ELSE 0 END) as sales
        FROM "InventoryItem" i
        JOIN "Product" p ON i."productId" = p.id
        JOIN "Warehouse" w ON i."warehouseId" = w.id
        LEFT JOIN "StockMovement" sm ON i.id = sm."itemId"
        GROUP BY p.id, w.id, i.id
      `

    // Weitere Report-Typen...
    default:
      throw new Error('Unbekannter Report-Typ')
  }
}

export async function exportToExcel(data: any[], type: ReportType) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Report')

  // Formatierung und Styling
  worksheet.columns = getColumnsForType(type)
  
  // Daten einfügen
  worksheet.addRows(data)

  // Summenzeile
  worksheet.addRow({
    date: 'Gesamt',
    orders: data.reduce((sum, row) => sum + row.orders, 0),
    revenue: data.reduce((sum, row) => sum + row.revenue, 0),
    // ...weitere Summen
  })

  // Buffer erstellen
  return await workbook.xlsx.writeBuffer()
}

export async function scheduleReport(report: Report) {
  // Prüfe bestehende Zeitpläne
  const existingSchedule = await prisma.schedule.findUnique({
    where: { reportId: report.id }
  })

  if (existingSchedule) {
    return prisma.schedule.update({
      where: { id: existingSchedule.id },
      data: {
        frequency: report.schedule?.frequency,
        dayOfWeek: report.schedule?.dayOfWeek,
        dayOfMonth: report.schedule?.dayOfMonth,
        time: report.schedule?.time,
        active: true
      }
    })
  }

  return prisma.schedule.create({
    data: {
      reportId: report.id,
      frequency: report.schedule!.frequency,
      dayOfWeek: report.schedule?.dayOfWeek,
      dayOfMonth: report.schedule?.dayOfMonth,
      time: report.schedule!.time
    }
  })
}

export async function sendScheduledReport(report: Report) {
  const data = await generateReport({
    type: report.type,
    startDate: getReportStartDate(report),
    endDate: new Date(),
    filters: report.filters
  })

  const excel = await exportToExcel(data.data, report.type)
  
  // E-Mail mit Bericht senden
  await Promise.all(report.recipients.map(recipient =>
    sendEmail({
      to: recipient,
      subject: `${report.name} - ${format(new Date(), 'PPP', { locale: de })}`,
      html: generateReportEmail(data),
      attachments: [{
        filename: `${report.name}.xlsx`,
        content: excel
      }]
    })
  ))

  // Update lastRun
  await prisma.report.update({
    where: { id: report.id },
    data: { lastRun: new Date() }
  })
} 