import { NextResponse } from 'next/server';

// Rota para interceptar requisições /@vite/client e evitar erros 404
export async function GET() {
  // Retorna uma resposta JavaScript vazia para evitar erros no console
  return new NextResponse('// Vite client stub for Next.js Turbopack compatibility', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST() {
  return new NextResponse('', { status: 200 });
}

export async function PUT() {
  return new NextResponse('', { status: 200 });
}

export async function DELETE() {
  return new NextResponse('', { status: 200 });
}