// Sistema de pool de conexões otimizado para PostgreSQL com Supabase
import { Pool } from 'pg';
import { logger } from './logger';

class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;
  private isInitialized = false;

  private constructor() {
    const connectionString = process.env.DB_URL;
    if (!connectionString) {
      throw new Error('DB_URL não definida no ambiente');
    }
    logger.info('Inicializando pool com connectionString (sem senha):', connectionString.replace(/:\[.*\]@/, ':[hidden]@'));
    this.pool = new Pool({
      connectionString,
      max: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      min: 0,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
    });
    this.pool.on('connect', () => logger.debug('Nova conexão estabelecida'));
    this.pool.on('remove', () => logger.debug('Conexão liberada'));
  }

  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.testConnection();
    this.isInitialized = true;
    logger.info('Pool de conexões inicializado com sucesso');
  }

  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      logger.info('Teste de conexão bem-sucedido');
    } finally {
      client.release();
    }
  }

  public async getConnection() {
    if (!this.isInitialized) await this.initialize();
    return this.pool.connect();
  }

  public async execute<T = any>(
    query: string,
    params?: any[],
    options?: { timeout?: number }
  ): Promise<[T, any[]]> {
    const client = await this.getConnection();
    const startTime = Date.now();
    try {
      const result = await client.query({ text: query, values: params });
      const duration = Date.now() - startTime;
      logger.info('Operação execute concluída', { duration });
      return [result.rows as T, result.fields];
    } catch (error) {
      logger.error('Falha em execute', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  public async query<T = any>(
    query: string,
    params?: any[]
  ): Promise<[T, any[]]> {
    return this.execute(query, params);
  }

  public async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.getConnection();
    const startTime = Date.now();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      logger.info('Transação concluída', { duration });
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Falha na transação', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
    logger.info('Pool fechado');
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      await this.testConnection();
      return { status: 'healthy', details: {} };
    } catch (error) {
      return { status: 'unhealthy', details: (error as Error).message };
    }
  }
}

export const dbPool = DatabasePool.getInstance();

export async function connectToDatabase() {
  return dbPool.getConnection();
}

export async function executeQuery<T = any>(query: string, params?: any[]) {
  return dbPool.execute(query, params);
}

export async function withTransaction<T>(callback: (client: any) => Promise<T>) {
  return dbPool.transaction(callback);
}

export { DatabasePool };