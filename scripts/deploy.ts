import { DeploymentService } from '@/lib/deployment'

const deployment = new DeploymentService()

async function main() {
  const [environment, version] = process.argv.slice(2)
  
  if (!environment || !version) {
    console.error('Usage: deploy.ts <environment> <version>')
    process.exit(1)
  }

  try {
    await deployment.deploy({
      environment,
      version,
      type: 'kubernetes',
      canary: environment === 'production',
      config: {
        namespace: 'default',
        deployment: {
          metadata: { name: 'app' },
          spec: {
            replicas: 3,
            template: {
              spec: {
                containers: [{
                  name: 'app',
                  image: `registry/app:${version}`
                }]
              }
            }
          }
        }
      }
    })
    
    console.log('Deployment successful!')
    process.exit(0)
  } catch (error) {
    console.error('Deployment failed:', error)
    process.exit(1)
  }
}

main() 