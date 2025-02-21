import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggingService } from '../logger'
import { PerformanceService } from '../performance'
import { ErrorService } from '../errors'
import { RabbitMQ } from 'amqplib'
import { SQS, Lambda } from 'aws-sdk'
import { Kafka } from 'kafkajs'
import { nanoid } from 'nanoid'
import { Worker } from 'worker_threads'
import { cpus } from 'os'

const logger = new LoggingService()
const performance = new PerformanceService()
const errors = new ErrorService()
const redis = new Redis(process.env.REDIS_URL!)

// Message Brokers
const sqs = new SQS({ region: process.env.AWS_REGION })
const lambda = new Lambda({ region: process.env.AWS_REGION })
const kafka = new Kafka({
  clientId: 'queue-service',
  brokers: [process.env.KAFKA_BROKER!]
})

// Worker Pool
const workerPool = new Map<string, Worker>()
const CPU_COUNT = cpus().length

export class QueueService {
  private rabbitmq: RabbitMQ.Connection | null = null
  private channel: RabbitMQ.Channel | null = null
  private producer = kafka.producer()
  private consumer = kafka.consumer({ groupId: 'queue-service' })

  constructor() {
    this.initializeWorkerPool()
    this.setupMessageBrokers()
  }

  async addJob(
    type: string,
    data: any,
    options: {
      priority?: 'high' | 'normal' | 'low'
      delay?: number
      retries?: number
      timeout?: number
      broker?: 'redis' | 'rabbitmq' | 'sqs' | 'kafka'
      batch?: boolean
      idempotencyKey?: string
    } = {}
  ) {
    try {
      const {
        priority = 'normal',
        delay = 0,
        retries = 3,
        timeout = 30000,
        broker = 'redis',
        batch = false,
        idempotencyKey
      } = options

      // Job ID generieren
      const jobId = nanoid()

      // Job erstellen
      const job = {
        id: jobId,
        type,
        data,
        priority,
        retries,
        timeout,
        status: 'pending',
        createdAt: new Date(),
        idempotencyKey
      }

      // Idempotenz Check
      if (idempotencyKey) {
        const exists = await this.checkIdempotency(idempotencyKey)
        if (exists) return exists
      }

      // Job in DB speichern
      await prisma.job.create({ data: job })

      // Job an Broker senden
      if (delay > 0) {
        await this.scheduleDelayedJob(job, delay, broker)
      } else {
        await this.sendJob(job, broker, batch)
      }

      // Metriken tracken
      await performance.trackMetric({
        name: 'queue_job_added',
        value: 1,
        type: 'counter',
        labels: { jobType: type, priority }
      })

      return job
    } catch (error) {
      logger.log('error', 'Job addition failed', { error })
      throw error
    }
  }

  async processJob(jobId: string) {
    try {
      // Job laden
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      })

      if (!job) throw new Error('Job not found')

      // Job Status aktualisieren
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'processing' }
      })

      // Job ausführen
      const result = await this.executeJob(job)

      // Job abschließen
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result,
          completedAt: new Date()
        }
      })

      // Metriken tracken
      await performance.trackMetric({
        name: 'queue_job_completed',
        value: 1,
        type: 'counter',
        labels: { jobType: job.type }
      })

      return result
    } catch (error) {
      // Fehler behandeln
      await this.handleJobError(jobId, error)
      throw error
    }
  }

  async getJobStatus(jobId: string) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      })
      return job?.status || 'not_found'
    } catch (error) {
      logger.log('error', 'Job status check failed', { error })
      throw error
    }
  }

  async cancelJob(jobId: string) {
    try {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'cancelled' }
      })

      // Metriken tracken
      await performance.trackMetric({
        name: 'queue_job_cancelled',
        value: 1,
        type: 'counter'
      })
    } catch (error) {
      logger.log('error', 'Job cancellation failed', { error })
      throw error
    }
  }

  private async setupMessageBrokers() {
    try {
      // RabbitMQ
      this.rabbitmq = await RabbitMQ.connect(
        process.env.RABBITMQ_URL!
      )
      this.channel = await this.rabbitmq.createChannel()

      // Kafka
      await this.producer.connect()
      await this.consumer.connect()

      // Queues erstellen
      await this.setupQueues()
    } catch (error) {
      logger.log('error', 'Message broker setup failed', { error })
      throw error
    }
  }

  private async setupQueues() {
    // RabbitMQ Queues
    await this.channel?.assertQueue('high_priority', {
      durable: true
    })
    await this.channel?.assertQueue('normal_priority', {
      durable: true
    })
    await this.channel?.assertQueue('low_priority', {
      durable: true
    })

    // Kafka Topics
    await this.producer.createTopics({
      topics: [{
        topic: 'jobs',
        numPartitions: 3
      }]
    })
  }

  private initializeWorkerPool() {
    for (let i = 0; i < CPU_COUNT; i++) {
      const worker = new Worker(
        './workers/job.worker.ts'
      )
      workerPool.set(worker.threadId.toString(), worker)
    }
  }

  private async sendJob(
    job: any,
    broker: string,
    batch: boolean
  ) {
    switch (broker) {
      case 'redis':
        await redis.lpush(
          `queue:${job.priority}`,
          JSON.stringify(job)
        )
        break
      case 'rabbitmq':
        await this.channel?.sendToQueue(
          `${job.priority}_priority`,
          Buffer.from(JSON.stringify(job))
        )
        break
      case 'sqs':
        await sqs.sendMessage({
          QueueUrl: process.env.SQS_QUEUE_URL!,
          MessageBody: JSON.stringify(job),
          MessageAttributes: {
            priority: {
              DataType: 'String',
              StringValue: job.priority
            }
          }
        }).promise()
        break
      case 'kafka':
        await this.producer.send({
          topic: 'jobs',
          messages: [{
            key: job.type,
            value: JSON.stringify(job)
          }]
        })
        break
    }
  }

  private async scheduleDelayedJob(
    job: any,
    delay: number,
    broker: string
  ) {
    // Delayed Job in Redis speichern
    await redis.zadd(
      'delayed_jobs',
      Date.now() + delay,
      JSON.stringify({ job, broker })
    )
  }

  private async executeJob(job: any) {
    // Worker aus Pool holen
    const worker = this.getAvailableWorker()

    return new Promise((resolve, reject) => {
      worker.postMessage(job)

      worker.once('message', resolve)
      worker.once('error', reject)

      // Timeout
      setTimeout(() => {
        reject(new Error('Job timeout'))
      }, job.timeout)
    })
  }

  private getAvailableWorker(): Worker {
    // Round-Robin Worker Selection
    const workers = Array.from(workerPool.values())
    const worker = workers[Math.floor(Math.random() * workers.length)]
    return worker
  }

  private async handleJobError(jobId: string, error: any) {
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) return

    if (job.retries > 0) {
      // Retry
      await prisma.job.update({
        where: { id: jobId },
        data: {
          retries: job.retries - 1,
          status: 'pending'
        }
      })

      // Job neu einreihen
      await this.addJob(job.type, job.data, {
        priority: job.priority,
        retries: job.retries - 1
      })
    } else {
      // Job als fehlgeschlagen markieren
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        }
      })

      // Error tracken
      await errors.handleError(error, {
        type: 'JOB_FAILURE',
        severity: 'error',
        metadata: { jobId, type: job.type }
      })
    }
  }

  private async checkIdempotency(
    key: string
  ): Promise<any | null> {
    const existing = await prisma.job.findFirst({
      where: {
        idempotencyKey: key,
        status: {
          in: ['completed', 'processing']
        }
      }
    })
    return existing
  }
} 