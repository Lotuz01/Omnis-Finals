import { NextRequest, NextResponse } from 'next/server';
import { dbPool, withTransaction } from '../../../utils/database-pool';
import { cookies } from 'next/headers';
import { logger } from '../../../utils/logger';
import { validator, schemas } from '../../../utils/validation';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../lib/redis';
import { invalidateCacheByRoute } from '../../../middleware/cache';


// GET - Listar todas as movimentações
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 [MOVEMENTS API] Iniciando GET request...');
    const cookieStore = await cookies();
    console.log('🔍 [MOVEMENTS API] Cookie store obtido');
    const userCookie = cookieStore.get('user');
    console.log('🔍 [MOVEMENTS API] User cookie:', userCookie ? 'encontrado' : 'não encontrado');

    if (!userCookie) {
      logger.info('Tentativa de acesso não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    // Parâmetros de paginação e filtros com validação rigorosa
    const url = new URL(request.url);
    
    // Validar e sanitizar parâmetros de entrada
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const type = url.searchParams.get('type');
    const productIdParam = url.searchParams.get('product_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    
    // Detectar e bloquear tentativas de SQL injection nos parâmetros
    const sqlInjectionPatterns = [
      /('|(\-\-)|;|\||\*|%|<|>|\[|\]|\{|\}|`|\\|\^|~)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /(or|and)\s+(\d+\s*=\s*\d+|'\d+'\s*=\s*'\d+')/i
    ];
    
    const allParams = [pageParam, limitParam, type, productIdParam, startDate, endDate].filter(Boolean);
    
    for (const param of allParams) {
      if (typeof param === 'string') {
        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(param)) {
          logger.warn('Tentativa de SQL injection detectada', {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent'),
            payload: param,
            url: request.url
          });
          return NextResponse.json({ error: 'Parâmetros inválidos detectados' }, { status: 400 });
          }
        }
      }
    }
    
    // Validação rigorosa de paginação
    let page = 1;
    let limit = 50;
    
    if (pageParam) {
      const parsedPage = parseInt(pageParam);
      if (isNaN(parsedPage) || parsedPage < 1 || parsedPage > 10000) {
        return NextResponse.json({ error: 'Parâmetro page inválido' }, { status: 400 });
      }
      page = parsedPage;
    }
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json({ error: 'Parâmetro limit inválido' }, { status: 400 });
      }
      limit = parsedLimit;
    }
    
    // Validar tipo com whitelist rigorosa
    if (type && !['entrada', 'saida'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    
    // Validar product_id
    let productId: number | null = null;
    if (productIdParam) {
      const parsed = parseInt(productIdParam);
      if (isNaN(parsed) || parsed < 1 || parsed > 2147483647) {
        return NextResponse.json({ error: 'ID do produto inválido' }, { status: 400 });
      }
      productId = parsed;
    }
    
    // Validar datas com regex rigorosa
    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return NextResponse.json({ error: 'Data de início inválida' }, { status: 400 });
      }
      // Validar se é uma data válida
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime()) || startDateObj.toISOString().slice(0, 10) !== startDate) {
        return NextResponse.json({ error: 'Data de início inválida' }, { status: 400 });
      }
    }
    
    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'Data de fim inválida' }, { status: 400 });
      }
      // Validar se é uma data válida
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime()) || endDateObj.toISOString().slice(0, 10) !== endDate) {
        return NextResponse.json({ error: 'Data de fim inválida' }, { status: 400 });
      }
    }
    
    // Validar se startDate não é posterior a endDate
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: 'Data de início não pode ser posterior à data de fim' }, { status: 400 });
    }
    
    const offset = (page - 1) * limit;
    
    // Gerar chave de cache baseada nos parâmetros
    const cacheKey = `${CACHE_KEYS.MOVEMENTS}:${user.id}:${page}:${limit}:${type || 'all'}:${productId || 'all'}:${startDate || 'all'}:${endDate || 'all'}`;
    
    // Verificar cache primeiro
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      logger.info('Cache hit para movimentações', { userId: user.id, cacheKey });
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=60',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }
    
    // Construir query com filtros usando prepared statements seguros
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    
    // Filtrar por usuário (não-admin vê apenas suas movimentações)
    if (!user.is_admin) {
      whereConditions.push('m.user_id = ?');
      queryParams.push(Number(user.id));
    }
    
    if (type) {
      whereConditions.push('m.type = ?');
      queryParams.push(String(type));
    }
    
    if (productId !== null) {
      whereConditions.push('m.product_id = ?');
      queryParams.push(productId);
    }
    
    if (startDate) {
      whereConditions.push('DATE(m.created_at) >= ?');
      queryParams.push(String(startDate));
    }
    
    if (endDate) {
      whereConditions.push('DATE(m.created_at) <= ?');
      queryParams.push(String(endDate));
    }
    
    // Construir WHERE clause segura
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Queries otimizadas com índices - usando idx_movements_main e idx_movements_date_filter
    const countQuery = `SELECT COUNT(*) as total FROM movements m ${whereClause}`;
    const mainQuery = `
      SELECT 
        m.id,
        m.type,
        m.quantity,
        m.reason,
        m.created_at,
        m.product_id,
        p.name as product_name
      FROM movements m
      LEFT JOIN products p ON m.product_id = p.id AND p.user_id = m.user_id
      ${whereClause}
      ORDER BY m.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    // Adicionar parâmetros de paginação
    const countParams = [...queryParams];
    const mainParams = [...queryParams, String(limit), String(offset)];
    
    const [countResult] = await dbPool.execute(countQuery, countParams);
    const total = (countResult as { total: number }[])[0].total;
    
    const [rows] = await dbPool.execute(mainQuery, mainParams);
    
    const totalPages = Math.ceil(total / limit);
    
    const responseData = {
      movements: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
    
    // Cachear resultado por 1 minuto (dados dinâmicos)
    await cache.set(cacheKey, responseData, CACHE_TTL.SHORT);
    
    logger.info('Movimentações buscadas com sucesso', {
      count: (rows as unknown[]).length,
      total,
      page,
      totalPages,
      filters: { type, productId, startDate, endDate },
      duration: Date.now() - startTime
    });
    
    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=60',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
    
  } catch (error) {
    console.error('❌ [MOVEMENTS API] Erro detalhado:', error);
    console.error('❌ [MOVEMENTS API] Stack trace:', (error as any).stack);
    logger.error('Erro ao buscar movimentações', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}



// POST - Criar nova movimentação
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');

    if (!userCookie) {
      logger.info('Tentativa de criação de movimentação não autorizada');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    
    const { product_id, type, quantity, reason } = requestData;
    
    // Validação rigorosa dos dados de entrada
    if (!product_id || typeof product_id !== 'number' || product_id < 1 || product_id > 2147483647) {
      return NextResponse.json({ error: 'ID do produto inválido' }, { status: 400 });
    }
    
    if (!type || !['entrada', 'saida'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de movimentação inválido' }, { status: 400 });
    }
    
    if (!quantity || typeof quantity !== 'number' || quantity <= 0 || quantity > 1000000 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }
    
    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      return NextResponse.json({ error: 'Motivo inválido' }, { status: 400 });
    }
    
    // Sanitizar reason se fornecido
    const sanitizedReason = reason ? reason.trim().substring(0, 500) : null;

    const result = await withTransaction(async (connection) => {
      // Verificar se o produto existe e obter estoque atual - query otimizada
      const [productRows] = await connection.execute(
        'SELECT id, name, stock_quantity as stock FROM products WHERE id = ? LIMIT 1',
        [product_id]
      );

      if ((productRows as { id: number; name: string; stock: number }[]).length === 0) {
        throw new Error('Produto não encontrado');
      }

      const product = (productRows as { id: number; name: string; stock: number }[])[0];
      const currentStock = product.stock;

      // Se for saída, verificar se há estoque suficiente
      if (type === 'saida' && currentStock < quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${currentStock}, Solicitado: ${quantity}`);
      }

      // Inserir a movimentação com dados sanitizados - campos ordenados para melhor performance
      const [movementResult] = await connection.execute(
        'INSERT INTO movements (user_id, product_id, type, quantity, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [user.id, product_id, type, quantity, sanitizedReason]
      );

      // Calcular novo estoque
      const newStock = type === 'entrada' 
        ? currentStock + quantity 
        : currentStock - quantity;

      // Atualizar o estoque do produto - query otimizada usando PRIMARY KEY
      await connection.execute(
        'UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?',
        [newStock, product_id]
      );

      // Verificação de estoque baixo removida (coluna min_stock não existe)
      const isLowStock = false;

      return {
        movementId: (movementResult as { insertId: number }).insertId,
        newStock,
        isLowStock,
        product: {
          id: product.id,
          name: product.name
        }
      };
    });

    // Invalidar cache de movimentações após criação
    const cachePattern = `${CACHE_KEYS.MOVEMENTS}:${user.id}:*`;
    await cache.del(cachePattern);
    
    // Invalidar cache geral de movimentações
    await invalidateCacheByRoute('/api/movements');
    
    // Invalidar cache de produtos também (estoque foi alterado)
    const productCacheKey = `${CACHE_KEYS.PRODUCTS}:${user.id}`;
    await cache.del(productCacheKey);
    await invalidateCacheByRoute('/api/products');

    logger.info('Movimentação criada com sucesso', {
      movementId: result.movementId,
      productId: product_id,
      type,
      quantity,
      newStock: result.newStock,
      userId: user.id,
      isLowStock: result.isLowStock,
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      message: 'Movimentação criada com sucesso',
      movementId: result.movementId,
      newStock: result.newStock,
      product: result.product,
      ...(result.isLowStock && {
        warning: 'Atenção: Estoque abaixo do mínimo!',
        isLowStock: true
      })
    }, { status: 201 });
    
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    if (errorMessage === 'Produto não encontrado') {
      logger.warn('Tentativa de movimentação com produto inexistente', { product_id: (await request.json()).product_id });
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    
    if (errorMessage.includes('Estoque insuficiente')) {
      logger.warn('Tentativa de saída com estoque insuficiente', { 
        error: errorMessage
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    logger.error('Erro ao criar movimentação', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}