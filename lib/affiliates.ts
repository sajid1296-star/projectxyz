import { prisma } from './prisma'
import { createHash } from 'crypto'
import { sendEmail } from './email'

export class AffiliateService {
  async createAffiliate(userId: string, data: any) {
    // Generiere einzigartigen Affiliate-Code
    const code = await this.generateAffiliateCode(data.name || userId)

    return prisma.affiliate.create({
      data: {
        userId,
        code,
        commission: data.commission || 10, // Standard 10%
        ...data
      }
    })
  }

  async trackReferral(orderId: string, affiliateCode: string) {
    const affiliate = await prisma.affiliate.findFirst({
      where: { code: affiliateCode, status: 'ACTIVE' }
    })

    if (!affiliate) return null

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    })

    if (!order) return null

    // Berechne Provision
    const commission = this.calculateCommission(
      order.total,
      affiliate.commission
    )

    // Erstelle Referral
    const referral = await prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        orderId,
        commission
      }
    })

    // Aktualisiere Affiliate-Guthaben
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        balance: { increment: commission }
      }
    })

    return referral
  }

  async processPayout(affiliateId: string, method: PayoutMethod) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        referrals: {
          where: { status: 'APPROVED', paidAt: null }
        }
      }
    })

    if (!affiliate || affiliate.balance <= 0) return null

    // Erstelle Auszahlung
    const payout = await prisma.payout.create({
      data: {
        affiliateId,
        amount: affiliate.balance,
        method,
        status: 'PENDING'
      }
    })

    // Aktualisiere Referrals
    await prisma.referral.updateMany({
      where: {
        affiliateId,
        status: 'APPROVED',
        paidAt: null
      },
      data: {
        payoutId: payout.id,
        status: 'PAID',
        paidAt: new Date()
      }
    })

    // Setze Guthaben zurück
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { balance: 0 }
    })

    // Sende Benachrichtigung
    await sendEmail({
      to: affiliate.user.email,
      subject: 'Affiliate-Auszahlung initiiert',
      template: 'affiliate-payout',
      data: { payout, affiliate }
    })

    return payout
  }

  private calculateCommission(orderTotal: number, rate: number): number {
    return (orderTotal * rate) / 100
  }

  private async generateAffiliateCode(seed: string): Promise<string> {
    const hash = createHash('md5')
      .update(seed + Date.now().toString())
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()

    // Prüfe auf Eindeutigkeit
    const existing = await prisma.affiliate.findUnique({
      where: { code: hash }
    })

    if (existing) {
      return this.generateAffiliateCode(seed)
    }

    return hash
  }
} 