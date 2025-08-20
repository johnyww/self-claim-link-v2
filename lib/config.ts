/**
 * Configuration utility for environment variables
 * Provides type-safe access to environment configuration
 */

export interface AppConfig {
  jwtSecret: string;
  databaseUrl: string;
  postgresConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  forceAdminPasswordChange: boolean;
  defaultAdminUsername: string;
  defaultAdminPassword: string;
  passwordMinLength: number;
  passwordMaxLength: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  strictRateLimitWindowMs: number;
  strictRateLimitMaxRequests: number;
  nodeEnv: string;
  port: number;
  bcryptRounds: number;
  sessionTimeoutHours: number;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      jwtSecret: process.env.JWT_SECRET || this.getDefaultJwtSecret(),
      databaseUrl: this.getDatabaseUrl(),
      postgresConfig: this.getPostgresConfig(),
      forceAdminPasswordChange: process.env.FORCE_ADMIN_PASSWORD_CHANGE === 'true',
      defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'password',
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      strictRateLimitWindowMs: parseInt(process.env.STRICT_RATE_LIMIT_WINDOW_MS || '900000'),
      strictRateLimitMaxRequests: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS || '10'),
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000'),
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24')
    };
  }

  private getDefaultJwtSecret(): string {
    if (this.isProduction()) {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Generate a secure secret using: openssl rand -base64 32'
      );
    }
    console.warn('⚠️  Using default JWT secret for development. Set JWT_SECRET in production!');
    return 'dev-jwt-secret-change-for-production-use';
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate JWT secret strength
    if (this.config.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (this.isProduction() && this.config.jwtSecret.includes('dev-') || 
        this.config.jwtSecret.includes('change-') ||
        this.config.jwtSecret === 'your-secret-key') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }

    // Validate numeric values
    if (this.config.rateLimitWindowMs < 60000) {
      errors.push('RATE_LIMIT_WINDOW_MS must be at least 60000 (1 minute)');
    }

    if (this.config.rateLimitMaxRequests < 10) {
      errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 10');
    }

    if (this.config.bcryptRounds < 10 || this.config.bcryptRounds > 15) {
      errors.push('BCRYPT_ROUNDS must be between 10 and 15');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public get(): AppConfig {
    return { ...this.config };
  }

  public getJwtSecret(): string {
    return this.config.jwtSecret;
  }



  public getDatabaseUrl(): string {
    return process.env.DATABASE_URL || '';
  }

  public getPostgresConfig() {
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'selfclaimlink',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || ''
    };
  }

  public shouldForceAdminPasswordChange(): boolean {
    return this.config.forceAdminPasswordChange;
  }

  public getRateLimitConfig(): { windowMs: number; max: number } {
    return {
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMaxRequests,
    };
  }

  public getBcryptRounds(): number {
    return this.config.bcryptRounds;
  }

  public getSessionTimeoutMs(): number {
    return this.config.sessionTimeoutHours * 60 * 60 * 1000;
  }

  public getDefaultAdminUsername(): string {
    return this.config.defaultAdminUsername;
  }

  public getDefaultAdminPassword(): string {
    return this.config.defaultAdminPassword;
  }

  public getPasswordMinLength(): number {
    return this.config.passwordMinLength;
  }

  public getPasswordMaxLength(): number {
    return this.config.passwordMaxLength;
  }

  public getStrictRateLimitConfig(): { windowMs: number; max: number } {
    return {
      windowMs: this.config.strictRateLimitWindowMs,
      max: this.config.strictRateLimitMaxRequests,
    };
  }
}

// Export singleton instance
export const config = new ConfigManager();
export default config;
