import { ComplianceService } from '@/lib/compliance'

const compliance = new ComplianceService()

async function main() {
  try {
    // GDPR Audit
    const gdprResults = await compliance.audit({
      framework: 'gdpr',
      scope: ['data-processing', 'user-consent', 'data-protection'],
      detailed: true,
      evidence: true,
      report: true
    })

    // PCI DSS Audit
    const pciResults = await compliance.audit({
      framework: 'pci',
      scope: ['data-security', 'payment-processing'],
      detailed: true,
      evidence: true,
      report: true
    })

    // HIPAA Audit (falls relevant)
    if (process.env.HANDLE_HEALTH_DATA === 'true') {
      await compliance.audit({
        framework: 'hipaa',
        scope: ['data-privacy', 'security'],
        detailed: true,
        evidence: true,
        report: true
      })
    }

    console.log('Compliance checks completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Compliance checks failed:', error)
    process.exit(1)
  }
}

main() 