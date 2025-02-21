import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkStock, updateStock } from '@/lib/inventory'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const warehouseId = searchParams.get('warehouseId')
  const lowStock = searchParams.get('lowStock') === 'true'

  const inventory = await prisma.inventoryItem.findMany({
    where: {
      warehouseId: warehouseId || undefined,
      ...(lowStock && {
        quantity: {
          lte: prisma.inventoryItem.fields.minQuantity
        }
      })
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true
        }
      },
      warehouse: true,
      movements: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return NextResponse.json(inventory)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  const { productId, warehouseId, quantity, type, reference } = await req.json()

  try {
    await updateStock(productId, quantity, type, reference)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
} 