import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BackupService } from '@/lib/backup'

const backupService = new BackupService()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { type } = await req.json()
    await backupService.createBackup(type)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backup error:', error)
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

  try {
    const { searchParams } = new URL(req.url)
    const backups = await backupService.listBackups({
      type: searchParams.get('type') as any,
      status: searchParams.get('status') || undefined,
      limit: parseInt(searchParams.get('limit') || '10'),
      offset: parseInt(searchParams.get('offset') || '0')
    })
    return NextResponse.json(backups)
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 