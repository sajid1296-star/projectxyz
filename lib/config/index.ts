import { Redis } from 'ioredis'
import { LoggerService } from '../logger'
import { SecurityService } from '../security'
import { Vault } from '@hashicorp/vault'
import { SSM } from '@aws-sdk/client-ssm'
import { Consul } from 'consul'
import { Etcd3 } from 'etcd3'
import { watch } from 'fs'

const logger = new LoggerService()
const security = new SecurityService()
const redis = new Redis(process.env.REDIS_URL!)

// Config Providers
const vault = new Vault()
const ssm = new SSM({ region: process.env.AWS_REGION })
const consul = new Consul()
const etcd = new Etcd3()

export class ConfigService {
  private config: Map<string, any>
  private watchers: Map<string, Function>

  constructor() {
    this.config = new Map()
    this.watchers = new Map()
    this.initialize()
  }

  async get<T>(key: string, options: {
    default?: T
    type?: 'string' | 'number' | 'boolean' | 'json'
    encrypted?: boolean
    required?: boolean
    source?: 'env' | 'vault' | 'ssm' | 'consul' | 'etcd'
  } = {}): Promise<T> {
    try {
      const {
        default: defaultValue,
        type = 'string',
        encrypted = false,
        required = false,
        source = 'env'
      } = options

      // Cache prüfen
      const cached = this.config.get(key)
      if (cached !== undefined) {
        return this.parseValue(cached, type)
      }

      // Wert laden
      let value: any

      switch (source) {
        case 'env':
          value = process.env[key]
          break
        case 'vault':
          value = await vault.get(`secret/data/${key}`)
          break
        case 'ssm':
          value = await ssm.getParameter({
            Name: key,
            WithDecryption: true
          })
          break
        case 'consul':
          value = await consul.kv.get(key)
          break
        case 'etcd':
          value = await etcd.get(key).string()
          break
      }

      // Validierung
      if (value === undefined) {
        if (required) {
          throw new Error(`Required config key missing: ${key}`)
        }
        value = defaultValue
      }

      // Entschlüsselung
      if (encrypted && value) {
        value = await security.decrypt(value)
      }

      // Parsing
      const parsed = this.parseValue(value, type)

      // Caching
      this.config.set(key, parsed)

      return parsed
    } catch (error) {
      logger.log('error', 'Config error', { error, key })
      throw error
    }
  }

  async set(key: string, value: any, options: {
    encrypted?: boolean
    source?: 'vault' | 'ssm' | 'consul' | 'etcd'
    ttl?: number
  } = {}) {
    const { encrypted = false, source = 'vault', ttl } = options

    // Verschlüsselung
    if (encrypted) {
      value = await security.encrypt(value)
    }

    // Speichern
    switch (source) {
      case 'vault':
        await vault.put(`secret/data/${key}`, { data: { value } })
        break
      case 'ssm':
        await ssm.putParameter({
          Name: key,
          Value: value,
          Type: encrypted ? 'SecureString' : 'String',
          Overwrite: true
        })
        break
      case 'consul':
        await consul.kv.set(key, value)
        break
      case 'etcd':
        await etcd.put(key).value(value)
        break
    }

    // Cache aktualisieren
    this.config.set(key, value)
    if (ttl) {
      setTimeout(() => this.config.delete(key), ttl * 1000)
    }

    // Watcher benachrichtigen
    this.notifyWatchers(key, value)
  }

  watch(key: string, callback: (value: any) => void) {
    this.watchers.set(key, callback)

    // Provider-spezifisches Watching
    switch (true) {
      case key.startsWith('vault:'):
        vault.watch(`secret/data/${key}`, callback)
        break
      case key.startsWith('consul:'):
        consul.watch({ key }, callback)
        break
      case key.startsWith('etcd:'):
        etcd.watch().key(key).create().then(watcher => {
          watcher.on('put', callback)
        })
        break
    }
  }

  private async initialize() {
    // Umgebungsvariablen laden
    Object.entries(process.env).forEach(([key, value]) => {
      this.config.set(key, value)
    })

    // Secrets laden
    await this.loadSecrets()

    // File Watching
    this.watchConfigFiles()
  }

  private async loadSecrets() {
    try {
      // Vault Secrets
      const vaultSecrets = await vault.list('secret/data')
      for (const key of vaultSecrets) {
        const value = await vault.get(`secret/data/${key}`)
        this.config.set(key, value)
      }

      // SSM Parameters
      const ssmParams = await ssm.getParametersByPath({
        Path: '/app/',
        Recursive: true,
        WithDecryption: true
      })
      ssmParams.Parameters?.forEach(param => {
        this.config.set(param.Name!, param.Value)
      })
    } catch (error) {
      logger.log('error', 'Failed to load secrets', { error })
    }
  }

  private watchConfigFiles() {
    watch('.env', (eventType, filename) => {
      if (eventType === 'change') {
        this.initialize()
      }
    })
  }

  private parseValue(value: any, type: string): any {
    if (value === undefined) return value
    
    switch (type) {
      case 'number':
        return Number(value)
      case 'boolean':
        return value === 'true' || value === '1'
      case 'json':
        return JSON.parse(value)
      default:
        return value
    }
  }

  private notifyWatchers(key: string, value: any) {
    const watcher = this.watchers.get(key)
    if (watcher) {
      watcher(value)
    }
  }
} 