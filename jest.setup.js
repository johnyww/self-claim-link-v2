import '@testing-library/jest-dom'

// Provide fetch and Request/Response in Node test env
import 'whatwg-fetch'

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

// Mock logger module
jest.mock('./lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    logBusinessEvent: jest.fn(),
    logPerformance: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logApiRequest: jest.fn(),
    logApiResponse: jest.fn(),
    logSecurityEvent: jest.fn(),
    logAuth: jest.fn(),
    logClaimOperation: jest.fn(),
    logProductOperation: jest.fn(),
    logOrderOperation: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-request-id'),
  measurePerformance: jest.fn((operation, fn) => fn()),
}))

// Mock database module
jest.mock('./lib/database', () => ({
  getDatabase: jest.fn(),
  getAdminByUsername: jest.fn(),
  updateAdminPassword: jest.fn(),
  recordFailedLogin: jest.fn(),
  isAdminLocked: jest.fn(),
  resetFailedLogins: jest.fn(),
  getOrderById: jest.fn(),
  updateOrderClaimStatus: jest.fn(),
  getOrderProducts: jest.fn(),
}))

// Mock config module
jest.mock('./lib/config', () => ({
  default: {
    isDevelopment: jest.fn(() => true),
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '1h',
    },
    bcrypt: {
      rounds: 10,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      strictWindowMs: 15 * 60 * 1000,
      strictMaxRequests: 5,
    },
  },
}))
