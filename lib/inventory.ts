import { prisma } from './prisma'
import { sendNotification } from './notifications'

interface StockCheck {
  productId: string
  quantity: number
}

export async function checkStock(items: StockCheck[]) {
  const stockLevels = await Promise.all(
    items.map(async (item) => {
      const inventory = await prisma.inventoryItem.findMany({
        where: { productId: item.productId },
        include: { warehouse: { select: { active: true } } }
      })

      const availableStock = inventory
        .filter(i => i.warehouse.active)
        .reduce((sum, i) => sum + i.quantity, 0)

      return {
        productId: item.productId,
        requested: item.quantity,
        available: availableStock,
        sufficient: availableStock >= item.quantity
      }
    })
  )

  return {
    success: stockLevels.every(item => item.sufficient),
    items: stockLevels
  }
}

export async function updateStock(
  productId: string,
  quantity: number,
  type: MovementType,
  reference?: string
) {
  // Optimale Warehouse-Auswahl basierend auf Verfügbarkeit und Standort
  const warehouses = await prisma.inventoryItem.findMany({
    where: {
      productId,
      warehouse: { active: true },
      quantity: { gte: quantity }
    },
    orderBy: { quantity: 'desc' },
    include: { warehouse: true }
  })

  if (!warehouses.length) {
    throw new Error('Nicht genügend Lagerbestand verfügbar')
  }

  // Update Lagerbestand und erstelle Bewegung
  await prisma.$transaction(async (tx) => {
    const item = warehouses[0]
    
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } }
    })

    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        quantity: -quantity,
        type,
        reference
      }
    })

    // Prüfe Mindestbestand und erstelle ggf. Bestellung
    if (item.quantity - quantity <= item.minQuantity) {
      await createRestockOrder(tx, item)
    }
  })
}

async function createRestockOrder(tx: any, item: any) {
  const product = await tx.product.findUnique({
    where: { id: item.productId },
    include: { suppliers: true }
  })

  if (!product.suppliers.length) return

  const supplier = product.suppliers[0]
  const orderQuantity = item.maxQuantity || item.minQuantity * 2

  await tx.purchaseOrder.create({
    data: {
      supplierId: supplier.id,
      status: 'DRAFT',
      total: orderQuantity * product.price,
      items: {
        create: {
          productId: product.id,
          quantity: orderQuantity,
          price: product.price
        }
      }
    }
  })

  await sendNotification({
    type: 'LOW_STOCK',
    message: `Niedriger Lagerbestand für ${product.name} in ${item.warehouse.name}`,
    metadata: {
      productId: product.id,
      warehouseId: item.warehouseId,
      currentStock: item.quantity
    }
  })
} 