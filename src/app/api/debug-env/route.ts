import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      NODE_ENV: process.env.NODE_ENV,
      // Não mostrar a senha por segurança
      DB_PASSWORD_SET: !!process.env.DB_PASSWORD
    };
    
    console.log('🔍 [DEBUG-ENV] Variáveis de ambiente:', envVars);
    
    return NextResponse.json({
      message: 'Environment variables debug',
      env: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [DEBUG-ENV] Erro:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}