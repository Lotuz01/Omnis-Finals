import { NextResponse } from 'next/server';
import { executeQuery } from '../../../database.js';
import { logger } from '../../../utils/logger';

export async function GET() {
  try {
    // Verificar conexão com banco de dados
    const rows = await executeQuery('SELECT 1 as test');
    const dbStatus = rows.length > 0 ? 'ok' : 'error';

    // Verificar cache (opcional, se aplicável)
    const cacheStatus = 'ok'; // Pode ser expandido se necessário

    // Verificar outros serviços se houver
    const servicesStatus = {
      database: dbStatus,
      cache: cacheStatus,
      // Adicione mais serviços aqui
    };

    return NextResponse.json({
      status: 'ok',
      services: servicesStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Erro no health check', error);
    return NextResponse.json({
      status: 'error',
      message: 'Falha no health check',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}