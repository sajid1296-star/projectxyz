import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CDNManager } from '@/lib/cache'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const path = formData.get('path') as string
    const variants = formData.get('variants') as string

    if (!file || !path) {
      return NextResponse.json(
        { error: 'Datei und Pfad erforderlich' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cdn = new CDNManager()

    const asset = await cdn.uploadAsset(buffer, path, {
      variants: variants ? JSON.parse(variants) : undefined,
      metadata: {
        filename: file.name,
        type: file.type,
        size: file.size
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload fehlgeschlagen' },
      { status: 500 }
    )
  }
} 