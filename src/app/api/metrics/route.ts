import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import os from 'os';

interface Metrics {
  timestamp: string;
  system: {
    uptime: number;
    loadAverage: number[];
    cpuUsage: number;
    memoryUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
    diskUsage: {
      available: boolean;
      error?: string;
    };
  };
  application: {
    version: string;
    environment: string;
    nodeVersion: string;
    processUptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    error?: string;
  };
  api: {
    totalRequests: number;
    activeConnections: number;
    averageResponseTime: number;
  };
}

// Simples contador de requisições (em produção, usar Redis ou banco)
let requestCount = 0;
let totalResponseTime = 0;
let activeConnections = 0;

// Middleware para contar requisições (seria implementado globalmente)
export function trackRequest(responseTime: number) {
  requestCount++;
  totalResponseTime += responseTime;
}

export function incrementActiveConnections() {
  activeConnections++;
}

export function decrementActiveConnections() {
  activeConnections--;
}

async function getDatabaseMetrics() {
  const start = Date.now();
  try {
    const connection = await connectToDatabase();
    await connection.execute('SELECT 1');
    await connection.end();
    
    return {
      status: 'connected' as const,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'disconnected' as const,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

function getSystemMetrics() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
    cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
    memoryUsage: {
      total: Math.round((totalMemory / 1024 / 1024 / 1024) * 100) / 100, // GB
      used: Math.round((usedMemory / 1024 / 1024 / 1024) * 100) / 100, // GB
      free: Math.round((freeMemory / 1024 / 1024 / 1024) * 100) / 100, // GB
      percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100
    },
    diskUsage: {
      available: true // Simplificado - em produção, verificar espaço em disco
    }
  };
}

function getApplicationMetrics() {
  const memUsage = process.memoryUsage();
  
  return {
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    processUptime: Math.round(process.uptime()),
    memoryUsage: {
      rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100, // MB
      heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
      heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100 // MB
    }
  };
}

function getApiMetrics() {
  return {
    totalRequests: requestCount,
    activeConnections: Math.max(0, activeConnections),
    averageResponseTime: requestCount > 0 ? Math.round((totalResponseTime / requestCount) * 100) / 100 : 0
  };
}

export async function GET() {
  try {
    const [database, system, application, api] = await Promise.all([
      getDatabaseMetrics(),
      Promise.resolve(getSystemMetrics()),
      Promise.resolve(getApplicationMetrics()),
      Promise.resolve(getApiMetrics())
    ]);
    
    const metrics: Metrics = {
      timestamp: new Date().toISOString(),
      system,
      application,
      database,
      api
    };
    
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}