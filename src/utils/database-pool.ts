// Sistema de pool de conexões otimizado para MySQL

import mysql from 'mysql2/promise';
import { logger } from './logger';

interface PoolConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
  idleTimeout?: number;
  queueLimit?: number;
}

class DatabasePool {
  private static instance: DatabasePool;
  private pool: mysql.Pool | null = null;
  private config: PoolConfig;
  private isInitialized = false;

  private constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pdv_system',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
      reconnect: true,
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutos
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0') // 0 = sem limite
    };
  }

  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.pool) {
      return;
    }

    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: this.config.connectionLimit,
        queueLimit: this.config.queueLimit,
        // Configurações adicionais para otimização
        charset: 'utf8mb4',
        timezone: 'local',
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false,
        multipleStatements: false, // Segurança
        // Pool event handlers
        typeCast: function (field: unknown, next: () => unknown) {
          const fieldObj = field as { type: string; length: number; string: () => string };
          if (fieldObj.type === 'TINY' && fieldObj.length === 1) {
            return (fieldObj.string() === '1'); // Convert TINYINT(1) to boolean
          }
          return next();
        }
      });

      // Event listeners para monitoramento
      this.pool.on('connection', (connection) => {
        logger.debug('Nova conexão estabelecida', { connectionId: connection.threadId });
      });

      // Remover event listener 'error' pois não é suportado pelo tipo Pool

      this.pool.on('release', (connection) => {
        logger.debug('Conexão liberada', { connectionId: connection.threadId });
      });

      // Testar conexão inicial
      await this.testConnection();
      
      this.isInitialized = true;
      logger.info('Pool de conexões inicializado com sucesso', {
        host: this.config.host,
        database: this.config.database,
        connectionLimit: this.config.connectionLimit
      });

    } catch (error) {
      logger.error('Erro ao inicializar pool de conexões', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Pool não inicializado');
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.ping();
      logger.info('Teste de conexão bem-sucedido');
    } finally {
      connection.release();
    }
  }

  private handleDisconnect(): void {
    logger.warn('Conexão perdida, tentando reconectar...');
    
    setTimeout(async () => {
      try {
        await this.initialize();
        logger.info('Reconexão bem-sucedida');
      } catch (error) {
        logger.error('Falha na reconexão', error);
        this.handleDisconnect(); // Tentar novamente
      }
    }, 2000);
  }

  public async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.isInitialized || !this.pool) {
      await this.initialize();
    }

    if (!this.pool) {
      throw new Error('Pool de conexões não disponível');
    }

    const startTime = Date.now();
    try {
      const connection = await this.pool.getConnection();
      const duration = Date.now() - startTime;
      
      logger.debug('Conexão obtida do pool', { 
        duration: `${duration}ms`,
        connectionId: connection.threadId 
      });
      
      return connection;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erro ao obter conexão do pool', error);
      throw error;
    }
  }

  public async execute<T = any>(
    query: string, 
    params?: any[], 
    options?: { timeout?: number }
  ): Promise<[T, mysql.FieldPacket[]]> {
    const connection = await this.getConnection();
    const startTime = Date.now();
    
    try {
      // Configurar timeout se especificado
      if (options?.timeout) {
        await connection.query('SET SESSION wait_timeout = ?', [Math.ceil(options.timeout / 1000)]);
      }
      
      const result = await connection.execute(query, params) as [T, mysql.FieldPacket[]];
      const duration = Date.now() - startTime;
      
      logger.info('Database operation completed', { operation: 'execute', table: this.extractTableName(query), duration });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database operation failed', { operation: 'execute', table: this.extractTableName(query), duration, error: (error as Error).message });
      throw error;
    } finally {
      connection.release();
    }
  }

  public async query<T = any>(
    query: string, 
    params?: any[]
  ): Promise<[T, mysql.FieldPacket[]]> {
    const connection = await this.getConnection();
    const startTime = Date.now();
    
    try {
      const result = await connection.query(query, params) as [T, mysql.FieldPacket[]];
      const duration = Date.now() - startTime;
      
      logger.info('Database query completed', { operation: 'query', table: this.extractTableName(query), duration });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', { operation: 'query', table: this.extractTableName(query), duration, error: (error as Error).message });
      throw error;
    } finally {
      connection.release();
    }
  }

  // Transação com rollback automático em caso de erro
  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    const startTime = Date.now();
    
    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      
      const duration = Date.now() - startTime;
      logger.info('Database transaction completed', { operation: 'transaction', table: 'multiple', duration });
      
      return result;
    } catch (error) {
      await connection.rollback();
      
      const duration = Date.now() - startTime;
      logger.error('Database transaction failed', { operation: 'transaction', table: 'multiple', duration, error: (error as Error).message });
      
      throw error;
    } finally {
      connection.release();
    }
  }

  // Extrair nome da tabela da query para logs
  private extractTableName(query: string): string {
    const match = query.match(/(?:FROM|INTO|UPDATE|JOIN)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    return match ? match[1] : 'unknown';
  }

  // Obter estatísticas do pool
  public getPoolStats(): any {
    if (!this.pool) {
      return null;
    }

    return {
      connectionLimit: this.config.connectionLimit,
      acquireTimeout: this.config.acquireTimeout,
      // Estas propriedades podem não estar disponíveis em todas as versões
      // activeConnections: this.pool._allConnections?.length || 0,
      // freeConnections: this.pool._freeConnections?.length || 0,
      // queuedRequests: this.pool._connectionQueue?.length || 0
    };
  }

  // Fechar pool graciosamente
  public async close(): Promise<void> {
    if (this.pool) {
      logger.info('Fechando pool de conexões...');
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      logger.info('Pool de conexões fechado');
    }
  }

  // Health check
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const startTime = Date.now();
      await this.testConnection();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          poolStats: this.getPoolStats(),
          config: {
            host: this.config.host,
            database: this.config.database,
            connectionLimit: this.config.connectionLimit
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          poolStats: this.getPoolStats()
        }
      };
    }
  }
}

// Instância singleton
export const dbPool = DatabasePool.getInstance();

// Função de conveniência para manter compatibilidade
export async function connectToDatabase(): Promise<mysql.PoolConnection> {
  return await dbPool.getConnection();
}

// Função para executar queries com pool
export async function executeQuery<T = any>(
  query: string, 
  params?: any[]
): Promise<[T, mysql.FieldPacket[]]> {
  return await dbPool.execute(query, params);
}

// Função para transações
export async function withTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  return await dbPool.transaction(callback);
}

// Inicializar pool na importação (apenas em ambiente servidor)
if (typeof window === 'undefined') {
  dbPool.initialize().catch((error) => {
    logger.error('Falha ao inicializar pool de conexões na importação', error);
  });
}