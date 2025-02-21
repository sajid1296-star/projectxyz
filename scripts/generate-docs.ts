import { DocumentationService } from '@/lib/documentation'

const documentation = new DocumentationService()

async function main() {
  try {
    // API Dokumentation
    await documentation.generate({
      type: 'api',
      output: './docs/api',
      format: 'html'
    })

    // Code Dokumentation
    await documentation.generate({
      type: 'code',
      output: './docs/code',
      format: 'html'
    })

    // Architektur Dokumentation
    await documentation.generate({
      type: 'architecture',
      output: './docs/architecture',
      format: 'markdown',
      diagrams: true
    })

    // Benutzer Dokumentation
    await documentation.generate({
      type: 'user',
      output: './docs/user',
      format: 'html',
      templates: './templates'
    })

    console.log('Documentation generated successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Documentation generation failed:', error)
    process.exit(1)
  }
}

main() 