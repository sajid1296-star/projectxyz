import { Discount, DiscountType } from '@prisma/client'

interface CartItem {
  productId: string
  quantity: number
  price: number
  categoryId?: string
}

export function validateDiscount(
  discount: Discount,
  cartTotal: number
): string | null {
  const now = new Date()

  if (discount.status !== 'ACTIVE') {
    return 'Dieser Gutschein ist nicht mehr gültig'
  }

  if (now < discount.startDate || now > discount.endDate) {
    return 'Dieser Gutschein ist abgelaufen'
  }

  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return 'Dieser Gutschein wurde bereits zu oft eingelöst'
  }

  if (discount.minPurchase && cartTotal < discount.minPurchase) {
    return `Mindestbestellwert von ${discount.minPurchase}€ nicht erreicht`
  }

  return null
}

export function calculateDiscount(
  discount: Discount,
  items: CartItem[],
  cartTotal: number
): number {
  switch (discount.type) {
    case 'PERCENTAGE':
      return (cartTotal * discount.value) / 100

    case 'FIXED_AMOUNT':
      return Math.min(discount.value, cartTotal)

    case 'FREE_SHIPPING':
      return 0 // Versandkosten werden separat behandelt

    case 'BUY_X_GET_Y':
      return calculateBuyXGetYDiscount(discount, items)

    default:
      return 0
  }
}

function calculateBuyXGetYDiscount(
  discount: Discount,
  items: CartItem[]
): number {
  const conditions = discount.conditions as {
    buyQuantity: number
    getQuantity: number
    productId?: string
    categoryId?: string
  }

  const eligibleItems = items.filter(item => {
    if (conditions.productId) {
      return item.productId === conditions.productId
    }
    if (conditions.categoryId) {
      return item.categoryId === conditions.categoryId
    }
    return true
  })

  let totalDiscount = 0
  for (const item of eligibleItems) {
    const sets = Math.floor(item.quantity / (conditions.buyQuantity + conditions.getQuantity))
    totalDiscount += sets * conditions.getQuantity * item.price
  }

  return totalDiscount
} 