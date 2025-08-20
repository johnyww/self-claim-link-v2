/**
 * Health check endpoint for monitoring application status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/middleware';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    uptime: {
      status: 'healthy' | 'unhealthy';
      seconds: number;
    };
  };
}

async function healthHandler(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  logger.info('Health check requested');
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'healthy' },
      memory: { status: 'healthy', usage: { used: 0, total: 0, percentage: 0 } },
      uptime: { status: 'healthy', seconds: 0 }
    }
  };

  // Database health check
  try {
    const dbStart = Date.now();
    const pool = await getDatabase();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;
    
    health.checks.database = {
      status: 'healthy',
      responseTime: dbResponseTime
    };
    
    logger.debug('Database health check passed', { responseTime: dbResponseTime });
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
    health.status = 'unhealthy';
    
    logger.error('Database health check failed', { error });
  }

  // Memory usage check
  try {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const percentage = (usedMem / totalMem) * 100;
    
    health.checks.memory = {
      status: percentage > 90 ? 'unhealthy' : 'healthy',
      usage: {
        used: usedMem,
        total: totalMem,
        percentage: Math.round(percentage * 100) / 100
      }
    };
    
    if (percentage > 90) {
      health.status = 'unhealthy';
      logger.warn('High memory usage detected', { percentage });
    }
  } catch (error) {
    health.checks.memory.status = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Memory check failed', { error });
  }

  // Uptime check
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    health.checks.uptime = {
      status: 'healthy',
      seconds: uptimeSeconds
    };
  } catch (error) {
    health.checks.uptime.status = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Uptime check failed', { error });
  }

  const totalResponseTime = Date.now() - startTime;
  
  logger.info('Health check completed', {
    status: health.status,
    responseTime: totalResponseTime,
    checks: health.checks
  });

  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}

export const GET = withRequestLogging(healthHandler);
