import { LoggerService } from '../logger'
import { ConfigService } from '../config'
import { SecurityService } from '../security'
import { OpenAPI } from 'openapi-types'
import { Swagger } from 'swagger-jsdoc'
import { TypeDoc } from 'typedoc'
import { Markdown } from 'markdown-it'
import { Mermaid } from '@mermaid-js/mermaid'
import { JSDom } from 'jsdom'
import { GraphViz } from 'graphviz'
import { glob } from 'glob'
import { readFile, writeFile } from 'fs/promises'

const logger = new LoggerService()
const config = new ConfigService()
const security = new SecurityService()
const markdown = new Markdown()
const mermaid = new Mermaid()

export class DocumentationService {
  async generate(options: {
    type: 'api' | 'code' | 'architecture' | 'user'
    output?: string
    format?: 'html' | 'pdf' | 'markdown'
    version?: string
    templates?: string
    diagrams?: boolean
  }) {
    try {
      const {
        type,
        output = './docs',
        format = 'html',
        version = 'latest',
        templates = './templates',
        diagrams = true
      } = options

      switch (type) {
        case 'api':
          return this.generateAPIDoc(output, format)
        case 'code':
          return this.generateCodeDoc(output, format)
        case 'architecture':
          return this.generateArchitectureDoc(output, format, diagrams)
        case 'user':
          return this.generateUserDoc(output, format, templates)
      }
    } catch (error) {
      logger.log('error', 'Documentation generation failed', { error })
      throw error
    }
  }

  async generateAPIDoc(output: string, format: string) {
    // OpenAPI Spec generieren
    const spec: OpenAPI.Document = await Swagger({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'API Documentation',
          version: '1.0.0'
        },
        servers: [{
          url: process.env.API_URL
        }]
      },
      apis: ['./app/api/**/*.ts']
    })

    // Routes dokumentieren
    const routes = await glob('./app/api/**/*.ts')
    for (const route of routes) {
      const content = await readFile(route, 'utf-8')
      await this.documentRoute(spec, content)
    }

    // Schemas dokumentieren
    const schemas = await glob('./lib/validation/schemas/*.ts')
    for (const schema of schemas) {
      const content = await readFile(schema, 'utf-8')
      await this.documentSchema(spec, content)
    }

    // Dokumentation generieren
    switch (format) {
      case 'html':
        await this.generateSwaggerUI(spec, output)
        break
      case 'pdf':
        await this.generatePDFDoc(spec, output)
        break
      case 'markdown':
        await this.generateMarkdownDoc(spec, output)
        break
    }
  }

  async generateCodeDoc(output: string, format: string) {
    // TypeDoc Konfiguration
    const app = new TypeDoc.Application()
    app.options.addReader(new TypeDoc.TSConfigReader())
    
    // Projekt analysieren
    const project = await app.convert(['./lib/**/*.ts'])
    if (!project) {
      throw new Error('Failed to analyze project')
    }

    // Dokumentation generieren
    switch (format) {
      case 'html':
        await app.generateDocs(project, output)
        break
      case 'json':
        await app.generateJson(project, output + '/documentation.json')
        break
    }
  }

  async generateArchitectureDoc(
    output: string,
    format: string,
    diagrams: boolean
  ) {
    // System Architektur analysieren
    const architecture = await this.analyzeArchitecture()

    // Diagramme generieren
    if (diagrams) {
      await this.generateDiagrams(architecture, output)
    }

    // Dokumentation generieren
    const doc = await this.formatArchitectureDoc(architecture, format)
    await writeFile(`${output}/architecture.${format}`, doc)
  }

  async generateUserDoc(
    output: string,
    format: string,
    templates: string
  ) {
    // Templates laden
    const userDocs = await glob(`${templates}/user/**/*.md`)
    
    // Dokumentation zusammenstellen
    const docs = await Promise.all(
      userDocs.map(async doc => {
        const content = await readFile(doc, 'utf-8')
        return this.processUserDoc(content, format)
      })
    )

    // Dokumentation generieren
    switch (format) {
      case 'html':
        await this.generateHTMLUserDoc(docs, output)
        break
      case 'pdf':
        await this.generatePDFUserDoc(docs, output)
        break
      case 'markdown':
        await this.generateMarkdownUserDoc(docs, output)
        break
    }
  }

  private async documentRoute(spec: OpenAPI.Document, content: string) {
    // Route Metadaten extrahieren
    const metadata = this.extractRouteMetadata(content)
    
    // OpenAPI Spec erweitern
    spec.paths[metadata.path] = {
      [metadata.method]: {
        summary: metadata.summary,
        parameters: metadata.parameters,
        requestBody: metadata.requestBody,
        responses: metadata.responses
      }
    }
  }

  private async documentSchema(spec: OpenAPI.Document, content: string) {
    // Schema Definitionen extrahieren
    const schemas = this.extractSchemaDefinitions(content)
    
    // OpenAPI Spec erweitern
    spec.components = spec.components || {}
    spec.components.schemas = {
      ...spec.components.schemas,
      ...schemas
    }
  }

  private async generateDiagrams(architecture: any, output: string) {
    // System Diagramm
    const systemDiagram = mermaid.render('graph TD', architecture.system)
    await writeFile(`${output}/system.svg`, systemDiagram)

    // Komponenten Diagramm
    const componentDiagram = mermaid.render('graph TD', architecture.components)
    await writeFile(`${output}/components.svg`, componentDiagram)

    // Sequenz Diagramm
    const sequenceDiagram = mermaid.render('sequenceDiagram', architecture.sequences)
    await writeFile(`${output}/sequences.svg`, sequenceDiagram)
  }

  private async analyzeArchitecture() {
    // System Analyse
    const system = await this.analyzeSystemStructure()
    
    // Komponenten Analyse
    const components = await this.analyzeComponents()
    
    // Sequenz Analyse
    const sequences = await this.analyzeSequences()
    
    return { system, components, sequences }
  }

  private extractRouteMetadata(content: string) {
    // Route Metadaten aus Kommentaren extrahieren
    return {}
  }

  private extractSchemaDefinitions(content: string) {
    // Schema Definitionen aus Code extrahieren
    return {}
  }

  private async processUserDoc(content: string, format: string) {
    // Markdown verarbeiten
    const html = markdown.render(content)
    
    // Code Beispiele formatieren
    const formatted = await this.formatCodeExamples(html)
    
    // Diagramme rendern
    const withDiagrams = await this.renderDiagrams(formatted)
    
    return withDiagrams
  }
} 