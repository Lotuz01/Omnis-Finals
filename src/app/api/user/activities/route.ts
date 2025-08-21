import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../../database.js';
import { cookies } from 'next/headers';
import { logger } from '../../../../utils/logger';
// Remove unused import since database pool is handled by executeQuery
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../../lib/cache';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      logger.info('Tentativa de acesso não autorizado a atividades');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    let page = 1;
    let limit = 50;

    if (pageParam) {
      const parsedPage = parseInt(pageParam);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }

    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        a.id,
        a.action,
        a.details,
        a.created_at
      FROM user_activities a
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [user.id, limit, offset];

    const rows = await executeQuery(query, params);

    const countQuery = 'SELECT COUNT(*) as total FROM user_activities WHERE user_id = ?';
    const countParams = [user.id];
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    const totalPages = Math.ceil(total / limit);

    logger.info('Atividades do usuário buscadas com sucesso', { userId: user.id, count: rows.length });

    return NextResponse.json({
      activities: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar atividades do usuário', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}