import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggingService } from '../logger'
import { PerformanceService } from '../performance'
import { ErrorService } from '../errors'
import { CacheService } from '../cache'
import { ABAC } from '@aserto/aserto-node'
import { RBAC } from '@permify/permify'
import { OPA } from '@open-policy-agent/opa-wasm'
import { Casbin } from 'casbin'
import { GraphQLSchema } from 'graphql'
import { createHash } from 'crypto'

const logger = new LoggerService()
const performance = new PerformanceService()
const errors = new ErrorService()
const cache = new CacheService()
const redis = new Redis(process.env.REDIS_URL!)

// Policy Engines
const abac = new ABAC({
  tenantId: process.env.ASERTO_TENANT_ID,
  authorizer: process.env.ASERTO_AUTHORIZER_URL
})
const rbac = new RBAC({
  url: process.env.PERMIFY_URL,
  token: process.env.PERMIFY_TOKEN
})
const opa = new OPA()
const casbin = new Casbin()

export class AuthorizationService {
  async authorize(request: {
    subject: {
      id: string
      role: string
      attributes?: Record<string, any>
    }
    resource: {
      type: string
      id: string
      attributes?: Record<string, any>
    }
    action: string
    context?: Record<string, any>
    engine?: 'abac' | 'rbac' | 'opa' | 'casbin'
  }) {
    try {
      const {
        subject,
        resource,
        action,
        context = {},
        engine = 'rbac'
      } = request

      // Cache-Key generieren
      const cacheKey = this.generateCacheKey(request)

      // Cache prüfen
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)

      // Basis-Checks
      await this.validateRequest(request)

      let allowed = false
      let reason = ''

      switch (engine) {
        case 'abac':
          ({ allowed, reason } = await this.checkABAC(
            subject,
            resource,
            action,
            context
          ))
          break

        case 'rbac':
          ({ allowed, reason } = await this.checkRBAC(
            subject,
            resource,
            action
          ))
          break

        case 'opa':
          ({ allowed, reason } = await this.checkOPA(
            subject,
            resource,
            action,
            context
          ))
          break

        case 'casbin':
          ({ allowed, reason } = await this.checkCasbin(
            subject,
            resource,
            action
          ))
          break
      }

      // Entscheidung cachen
      const decision = { allowed, reason }
      await redis.set(
        cacheKey,
        JSON.stringify(decision),
        'EX',
        300
      )

      // Metriken tracken
      await this.trackDecision(request, allowed)

      // Audit Log
      await this.logDecision(request, decision)

      return decision
    } catch (error) {
      await this.handleError(error, request)
      throw error
    }
  }

  async grantAccess(grant: {
    subject: {
      id: string
      role: string
    }
    resource: {
      type: string
      id: string
    }
    permissions: string[]
    conditions?: Record<string, any>
  }) {
    try {
      const {
        subject,
        resource,
        permissions,
        conditions
      } = grant

      // Grant in DB speichern
      await prisma.permission.createMany({
        data: permissions.map(permission => ({
          subjectId: subject.id,
          subjectRole: subject.role,
          resourceType: resource.type,
          resourceId: resource.id,
          permission,
          conditions
        }))
      })

      // Cache invalidieren
      await this.invalidateCache(subject.id)

      // Audit Log
      await this.logGrant(grant)

      return true
    } catch (error) {
      logger.log('error', 'Grant failed', { error })
      throw error
    }
  }

  async revokeAccess(revoke: {
    subject: {
      id: string
      role: string
    }
    resource: {
      type: string
      id: string
    }
    permissions: string[]
  }) {
    try {
      const { subject, resource, permissions } = revoke

      // Permissions löschen
      await prisma.permission.deleteMany({
        where: {
          subjectId: subject.id,
          resourceType: resource.type,
          resourceId: resource.id,
          permission: {
            in: permissions
          }
        }
      })

      // Cache invalidieren
      await this.invalidateCache(subject.id)

      // Audit Log
      await this.logRevoke(revoke)

      return true
    } catch (error) {
      logger.log('error', 'Revoke failed', { error })
      throw error
    }
  }

  async getRolePermissions(role: string) {
    try {
      // Permissions aus DB laden
      const permissions = await prisma.rolePermission.findMany({
        where: { role }
      })

      return permissions.reduce((acc, p) => ({
        ...acc,
        [p.resourceType]: p.permissions
      }), {})
    } catch (error) {
      logger.log('error', 'Get permissions failed', { error })
      throw error
    }
  }

  private async checkABAC(
    subject: any,
    resource: any,
    action: string,
    context: any
  ) {
    const decision = await abac.is({
      subject,
      resource,
      action,
      context
    })
    return {
      allowed: decision.allowed,
      reason: decision.reason
    }
  }

  private async checkRBAC(
    subject: any,
    resource: any,
    action: string
  ) {
    const allowed = await rbac.check({
      subject: subject.id,
      resource: `${resource.type}:${resource.id}`,
      action
    })
    return {
      allowed,
      reason: allowed ? 'ROLE_ALLOWED' : 'ROLE_DENIED'
    }
  }

  private async checkOPA(
    subject: any,
    resource: any,
    action: string,
    context: any
  ) {
    const input = {
      subject,
      resource,
      action,
      context
    }
    const allowed = await opa.evaluate(
      'authz/policy',
      input
    )
    return {
      allowed,
      reason: allowed ? 'POLICY_ALLOWED' : 'POLICY_DENIED'
    }
  }

  private async checkCasbin(
    subject: any,
    resource: any,
    action: string
  ) {
    const allowed = await casbin.enforce(
      subject.id,
      `${resource.type}:${resource.id}`,
      action
    )
    return {
      allowed,
      reason: allowed ? 'CASBIN_ALLOWED' : 'CASBIN_DENIED'
    }
  }

  private generateCacheKey(request: any): string {
    return createHash('md5')
      .update(JSON.stringify(request))
      .digest('hex')
  }

  private async invalidateCache(subjectId: string) {
    const keys = await redis.keys(`authz:${subjectId}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  private async validateRequest(request: any) {
    // Request Validierung implementieren
  }

  private async trackDecision(
    request: any,
    allowed: boolean
  ) {
    await performance.trackMetric({
      name: 'authorization_decision',
      value: 1,
      type: 'counter',
      labels: {
        allowed: allowed.toString(),
        resource: request.resource.type,
        action: request.action
      }
    })
  }

  private async logDecision(
    request: any,
    decision: any
  ) {
    await prisma.authorizationLog.create({
      data: {
        subjectId: request.subject.id,
        resourceType: request.resource.type,
        resourceId: request.resource.id,
        action: request.action,
        allowed: decision.allowed,
        reason: decision.reason,
        timestamp: new Date()
      }
    })
  }

  private async logGrant(grant: any) {
    await prisma.authorizationLog.create({
      data: {
        type: 'GRANT',
        subjectId: grant.subject.id,
        resourceType: grant.resource.type,
        resourceId: grant.resource.id,
        permissions: grant.permissions,
        timestamp: new Date()
      }
    })
  }

  private async logRevoke(revoke: any) {
    await prisma.authorizationLog.create({
      data: {
        type: 'REVOKE',
        subjectId: revoke.subject.id,
        resourceType: revoke.resource.type,
        resourceId: revoke.resource.id,
        permissions: revoke.permissions,
        timestamp: new Date()
      }
    })
  }

  private async handleError(error: any, request: any) {
    await errors.handleError(error, {
      type: 'AUTHORIZATION_ERROR',
      severity: 'error',
      metadata: request
    })
  }
} 