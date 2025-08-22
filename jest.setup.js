import '@testing-library/jest-dom'

// Polyfill fetch for Node.js test environment
if (!global.fetch) {
  global.fetch = require('whatwg-fetch').fetch
  global.Request = require('whatwg-fetch').Request
  global.Response = require('whatwg-fetch').Response
  global.Headers = require('whatwg-fetch').Headers
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-1234567890-abcdefghijkl'
process.env.NODE_ENV = 'test'
process.env.POSTGRES_HOST = 'localhost'
process.env.POSTGRES_PORT = '5432'
process.env.POSTGRES_DB = 'test_db'
process.env.POSTGRES_USER = 'test_user'
process.env.POSTGRES_PASSWORD = 'test_password'

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks()
})

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Note: Logger mocks are handled in individual test files

// Note: Database mocks are handled in individual test files

// Note: Config mocks are handled in individual test files
