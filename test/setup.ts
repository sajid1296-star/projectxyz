import { TestingService } from '@/lib/testing'
import { expect, afterEach, beforeAll } from 'vitest'
import matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

const testing = new TestingService()

// Matcher erweitern
expect.extend(matchers)

// Globale Setup
beforeAll(async () => {
  await testing.setupTestEnvironment({
    type: 'unit',
    database: true,
    redis: true,
    api: true
  })
})

// Cleanup nach jedem Test
afterEach(async () => {
  cleanup()
  await testing.cleanup()
})

// Globale Test Utilities
global.expect = expect
global.testing = testing 