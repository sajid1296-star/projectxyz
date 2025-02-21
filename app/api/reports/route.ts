import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { 
  generateReport, 
  exportToExcel, 
  scheduleReport 
} from '@/lib/analytics'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const data = await req.json()
    
    const report = await prisma.report.create({
      data: {
        name: data.name,
        type: data.type,
        filters: data.filters,
        recipients: data.recipients,
        createdBy: session.user.id,
        schedule: data.schedule ? {
          create: data.schedule
        } : undefined
      }
    })

    if (data.schedule) {
      await scheduleReport(report)
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Report creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const format = searchParams.get('format')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const report = await generateReport({
      type: type as ReportType,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(),
      filters: JSON.parse(searchParams.get('filters') || '{}')
    })

    if (format === 'excel') {
      const buffer = await exportToExcel(report.data, type as ReportType)
      
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="report-${type}.xlsx"`
        }
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 