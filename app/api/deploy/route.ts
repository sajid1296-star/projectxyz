import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DeploymentService } from '@/lib/deploy'
import { WebhookService } from '@/lib/webhooks'

const deploymentService = new DeploymentService()
const webhookService = new WebhookService()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { version, environment, type, config } = await req.json()

    // GitHub Webhook validieren
    if (req.headers.get('x-github-event')) {
      await webhookService.verifyGithubWebhook(req)
    }

    await deploymentService.deploy({
      version,
      environment,
      type,
      config
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const deployments = await prisma.deployment.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10
    })
    return NextResponse.json(deployments)
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 