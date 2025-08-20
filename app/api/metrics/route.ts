/**
 * Metrics endpoint for application monitoring and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/middleware';

interface ApplicationMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  database: {
    connectionCount: number;
    responseTime: number;
  };
  business: {
    totalOrders: number;
    totalProducts: number;
    totalClaims: number;
    claimsToday: number;
    successfulClaims: number;
    failedClaims: number;
    claimSuccessRate: number;
  };
}

async function metricsHandler(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  logger.info('Metrics requested');
  
  try {
    const pool = await getDatabase();
    
    // System metrics
    const memUsage = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    
    // Database metrics
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;
    
    // Business metrics queries
    const [
      ordersResult,
      productsResult,
      claimsResult,
      claimsTodayResult,
      successfulClaimsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM orders'),
      pool.query('SELECT COUNT(*) as count FROM products'),
      pool.query('SELECT COUNT(*) as count FROM orders WHERE claim_count > 0'),
      pool.query(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE claim_count > 0 
        AND claimed_at >= CURRENT_DATE
      `),
      pool.query(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE claim_count > 0 
        AND claimed_at IS NOT NULL
      `)
    ]);
    
    const totalOrders = parseInt(ordersResult.rows[0].count);
    const totalProducts = parseInt(productsResult.rows[0].count);
    const totalClaims = parseInt(claimsResult.rows[0].count);
    const claimsToday = parseInt(claimsTodayResult.rows[0].count);
    const successfulClaims = parseInt(successfulClaimsResult.rows[0].count);
    const failedClaims = totalClaims - successfulClaims;
    const claimSuccessRate = totalClaims > 0 ? (successfulClaims / totalClaims) * 100 : 0;
    
    const metrics: ApplicationMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime,
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100
        },
        cpu: {
          usage: 0 // CPU usage would require additional monitoring
        }
      },
      database: {
        connectionCount: pool.totalCount || 0,
        responseTime: dbResponseTime
      },
      business: {
        totalOrders,
        totalProducts,
        totalClaims,
        claimsToday,
        successfulClaims,
        failedClaims,
        claimSuccessRate: Math.round(claimSuccessRate * 100) / 100
      }
    };
    
    const responseTime = Date.now() - startTime;
    
    logger.info('Metrics collected successfully', {
      responseTime,
      metrics: {
        totalOrders,
        totalProducts,
        totalClaims,
        claimsToday,
        claimSuccessRate
      }
    });
    
    return NextResponse.json(metrics);
    
  } catch (error) {
    logger.error('Failed to collect metrics', { error });
    
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

export const GET = withRequestLogging(metricsHandler);
