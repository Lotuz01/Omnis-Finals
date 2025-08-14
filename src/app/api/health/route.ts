import { NextResponse } from 'next/server';
import { dbPool } from '../../../utils/database-pool';
import fs from 'fs';
import os from 'os';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    filesystem: {
      status: 'healthy' | 'unhealthy';
      writable: boolean;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: number;
      free: number;
      total: number;
    };
  };
}

async function checkDatabase(): Promise<HealthCheck['checks']['database']> {
  const start = Date.now();
  try {
    await dbPool.execute('SELECT 1');
    
    const responseTime = Date.now() - start;
    return {
      status: 'healthy',
      responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

function checkFilesystem(): HealthCheck['checks']['filesystem'] {
  try {
    // Tenta escrever um arquivo temporário
    const testFile = './temp_health_check.txt';
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    return {
      status: 'healthy',
      writable: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      writable: false,
      error: error instanceof Error ? error.message : 'Filesystem check failed'
    };
  }
}

function checkMemory(): HealthCheck['checks']['memory'] {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usage = (usedMemory / totalMemory) * 100;
  
  return {
    status: usage > 90 ? 'unhealthy' : 'healthy',
    usage: Math.round(usage * 100) / 100,
    free: Math.round((freeMemory / 1024 / 1024 / 1024) * 100) / 100, // GB
    total: Math.round((totalMemory / 1024 / 1024 / 1024) * 100) / 100 // GB
  };
}

export async function GET() {
  try {
    const [database, filesystem, memory] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkFilesystem()),
      Promise.resolve(checkMemory())
    ]);
    
    const allHealthy = database.status === 'healthy' && 
                      filesystem.status === 'healthy' && 
                      memory.status === 'healthy';
    
    const healthCheck: HealthCheck = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.round(process.uptime()),
      checks: {
        database,
        filesystem,
        memory
      }
    };
    
    const statusCode = allHealthy ? 200 : 503;
    
    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    );
  }
}