import { z } from 'zod'
import { Ajv } from 'ajv'
import { Yup } from 'yup'
import { ClassValidator } from 'class-validator'
import { LoggerService } from '../logger'
import { ErrorService } from '../errors'

const logger = new LoggerService()
const errors = new ErrorService()
const ajv = new Ajv({ allErrors: true })

export class ValidationService {
  async validate(data: any, schema: any, options: {
    type?: 'zod' | 'ajv' | 'yup' | 'class-validator'
    strict?: boolean
    context?: any
  } = {}) {
    try {
      const { type = 'zod', strict = true } = options

      switch (type) {
        case 'zod':
          return schema.parse(data)
        case 'ajv':
          const validate = ajv.compile(schema)
          const valid = validate(data)
          if (!valid) throw validate.errors
          return data
        case 'yup':
          return schema.validate(data, { strict })
        case 'class-validator':
          return ClassValidator.validate(data, { strict })
        default:
          throw new Error(`Unknown validator: ${type}`)
      }
    } catch (error) {
      await this.handleError(error, data)
      throw error
    }
  }

  // Vordefinierte Schemas
  schemas = {
    user: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string()
    }),
    product: z.object({
      name: z.string(),
      price: z.number().positive(),
      stock: z.number().int().min(0)
    }),
    order: z.object({
      userId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      }))
    })
  }

  private async handleError(error: any, data: any) {
    await errors.handleError(error, {
      type: 'VALIDATION_ERROR',
      severity: 'warn',
      metadata: { data }
    })
  }
} 