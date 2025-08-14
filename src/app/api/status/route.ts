import { NextResponse } from 'next/server';
import { dbPool } from '../../../utils/database-pool';

export async function GET() {
  try {
    // Teste de conectividade com o banco de dados
    let dbStatus = 'disconnected';
    let dbError = null;
    
    try {
      await dbPool.execute('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }
    
    const apiRoutes = {
      public: [
        { path: '/api/health', method: 'GET', description: 'Health check da API', status: 'active' },
        { path: '/api/status', method: 'GET', description: 'Status detalhado da API', status: 'active' },
        { path: '/api/auth', method: 'POST', description: 'Autenticação de usuários', status: 'active' }
      ],
      protected: [
        { path: '/api/users', method: 'GET', description: 'Listar usuários (requer auth)', status: 'active' },
        { path: '/api/user', method: 'GET', description: 'Dados do usuário logado (requer auth)', status: 'active' },
        { path: '/api/backup', method: 'POST', description: 'Backup do sistema (requer auth)', status: 'active' },
        { path: '/api/certificado', method: 'GET/POST', description: 'Gestão de certificados (requer auth)', status: 'active' },
        { path: '/api/nfe', method: 'GET/POST', description: 'Gestão de NFe (requer auth)', status: 'active' },
        { path: '/api/printers', method: 'GET/POST', description: 'Gestão de impressoras (requer auth)', status: 'active' },
        { path: '/api/print', method: 'POST', description: 'Impressão de documentos (requer auth)', status: 'active' }
      ]
    };
    
    return NextResponse.json({
      status: 'operational',
      message: 'Sistema funcionando corretamente',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        error: dbError
      },
      api: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        routes: apiRoutes
      },
      authentication: {
        middleware: 'active',
        description: 'Rotas protegidas retornam 401 para requisições não autenticadas (comportamento esperado)'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Erro na verificação de status',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}