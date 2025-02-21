import { prisma } from './prisma'

interface CartItem {
  weight: number
  dimensions: {
    length: number
    width: number
    height: number
  }
  quantity: number
}

export async function calculateShippingOptions(
  countryCode: string,
  items: CartItem[],
  cartTotal: number
) {
  // Finde passende Versandzone
  const zone = await prisma.shippingZone.findFirst({
    where: {
      countries: {
        has: countryCode
      }
    },
    include: {
      methods: {
        where: {
          active: true
        }
      }
    }
  })

  if (!zone) {
    throw new Error('Keine Versandoptionen für dieses Land verfügbar')
  }

  // Berechne Paketdetails
  const packageDetails = calculatePackageDetails(items)

  // Filtere und berechne verfügbare Versandmethoden
  return zone.methods
    .filter(method => {
      const conditions = method.conditions as any
      // Prüfe Gewichts- und Größenlimits
      if (conditions?.maxWeight && packageDetails.weight > conditions.maxWeight) {
        return false
      }
      if (conditions?.maxSize && 
          (packageDetails.length > conditions.maxSize ||
           packageDetails.width > conditions.maxSize ||
           packageDetails.height > conditions.maxSize)) {
        return false
      }
      return true
    })
    .map(method => ({
      id: method.id,
      name: method.name,
      price: method.freeAbove && cartTotal >= method.freeAbove ? 0 : method.price,
      estimatedDays: {
        min: method.minDays,
        max: method.maxDays
      }
    }))
}

function calculatePackageDetails(items: CartItem[]) {
  let totalWeight = 0
  let maxDimensions = { length: 0, width: 0, height: 0 }

  for (const item of items) {
    totalWeight += item.weight * item.quantity

    // Einfache Approximation für Paketgröße
    maxDimensions.length = Math.max(maxDimensions.length, item.dimensions.length)
    maxDimensions.width = Math.max(maxDimensions.width, item.dimensions.width)
    maxDimensions.height += item.dimensions.height * item.quantity
  }

  return {
    weight: totalWeight,
    ...maxDimensions
  }
}

export async function createShipment(orderId: string, methodId: string) {
  const method = await prisma.shippingMethod.findUnique({
    where: { id: methodId }
  })

  if (!method) throw new Error('Versandmethode nicht gefunden')

  const estimatedDelivery = new Date()
  estimatedDelivery.setDate(estimatedDelivery.getDate() + method.maxDays)

  return prisma.shipment.create({
    data: {
      orderId,
      carrier: method.name,
      estimatedDelivery,
      status: 'PENDING'
    }
  })
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  details: {
    location?: string
    description?: string
    trackingCode?: string
  }
) {
  return prisma.$transaction([
    prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status,
        trackingCode: details.trackingCode,
        actualDelivery: status === 'DELIVERED' ? new Date() : undefined
      }
    }),
    prisma.shipmentEvent.create({
      data: {
        shipmentId,
        status,
        location: details.location,
        description: details.description
      }
    })
  ])
} 