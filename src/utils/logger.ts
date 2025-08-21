// Sistema de logging avançado para produção
import * as db from '../database.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  stack?: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  operation?: string;
  duration?: number;
}

interface LoggerConfig {
  level: LogLevel;
  console: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private maxMemoryLogs = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO,
      console: true,
      ...config
    };
  }

  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;
    
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return undefined;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, stack?: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...(data && { data }),
      ...(stack && { stack }),
      ...(context && context)
    };
  }

  private addToMemory(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }
  }

  private writeToConsole(entry: LogEntry) {
    if (!this.config.console) return;
    
    const colors = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      DEBUG: '\x1b[37m'
    };
    
    const color = colors[entry.level as keyof typeof colors] || '';
    const reset = '\x1b[0m';
    const message = `${color}${entry.timestamp} [${entry.level}] ${entry.message}${reset}`;
    
    switch (entry.level) {
      case 'ERROR':
        console.error(message, entry.data || '', entry.stack || '');
        break;
      case 'WARN':
        console.warn(message, entry.data || '');
        break;
      case 'INFO':
        console.info(message, entry.data || '');
        break;
      case 'DEBUG':
        console.debug(message, entry.data || '');
        break;
    }
  }

  private async writeToDatabase(entry: LogEntry) {
    if (!db.connection()) {
      await db.connectToDatabase();
    }
    const connection = await db.connection().getConnection();
    try {
      await connection.execute(
        `INSERT INTO logs (level, message, data, stack, request_id, user_id, ip, user_agent, operation, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          entry.level,
          entry.message,
          entry.data ? JSON.stringify(entry.data) : null,
          entry.stack || null,
          entry.requestId || null,
          entry.userId || null,
          entry.ip || null,
          entry.userAgent || null,
          entry.operation || null,
          entry.duration || null
        ]
      );
    } finally {
      connection.release();
    }
  }

  private async log(level: LogLevel, message: string, data?: any, stack?: string, context?: any) {
    if (!this.shouldLog(level)) return;
    
    const entry = this.formatMessage(level, message, data, stack, context);
    
    this.addToMemory(entry);
    this.writeToConsole(entry);
    await this.writeToDatabase(entry);
  }

  // Métodos públicos
  debug(message: string, data?: any, context?: any): void {
    this.log(LogLevel.DEBUG, message, data, undefined, context);
  }

  info(message: string, data?: any, context?: any): void {
    this.log(LogLevel.INFO, message, data, undefined, context);
  }

  warn(message: string, data?: any, context?: any): void {
    this.log(LogLevel.WARN, message, data, undefined, context);
  }

  error(message: string, error?: Error | any, context?: any): void {
    const stack = error instanceof Error ? error.stack : undefined;
    this.log(LogLevel.ERROR, message, error, stack, context);
  }

  // Métodos específicos para diferentes tipos de operações
  apiLog(method: string, url: string, statusCode: number, duration: number, context?: any): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `API ${method} ${url} - ${statusCode} (${duration}ms)`, {
      method,
      url,
      statusCode,
      duration,
      type: 'api_request'
    }, undefined, context);
  }

  // Logs de performance
  performance(operation: string, duration: number, data?: any, context?: any): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      type: 'performance',
      ...data
    }, undefined, context);
  }

  // Logs de segurança
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any, context?: any): void {
    const levelMap = {
      low: LogLevel.INFO,
      medium: LogLevel.WARN,
      high: LogLevel.ERROR,
      critical: LogLevel.ERROR
    };
    
    this.log(levelMap[severity], `Security Event: ${event}`, {
      event,
      severity,
      type: 'security',
      ...data
    }, undefined, context);
  }

  // Logs de banco de dados
  database(operation: string, table: string, duration: number, error?: Error, context?: any): void {
    if (error) {
      this.log(LogLevel.ERROR, `Database Error: ${operation} on ${table}`, {
        operation,
        table,
        duration,
        type: 'database'
      }, error.stack, context);
    } else {
      const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
      this.log(level, `Database: ${operation} on ${table} (${duration}ms)`, {
        operation,
        table,
        duration,
        type: 'database'
      }, undefined, context);
    }
  }

  // Logs de autenticação
  auth(action: string, userId?: string, success: boolean = true, context?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Auth ${action}: ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this.log(level, message, {
      action,
      userId,
      success,
      type: 'authentication'
    }, undefined, context);
  }

  // Logs de sistema
  system(event: string, data?: any, context?: any): void {
    this.log(LogLevel.INFO, `System: ${event}`, {
      event,
      type: 'system',
      ...data
    }, undefined, context);
  }

  // Método para criar timer de operações
  startTimer(operation: string, context?: any): () => number {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    this.debug(`Timer started: ${operation}`, {
      operation,
      requestId,
      type: 'timer_start'
    }, context);
    
    return () => {
      const duration = Date.now() - start;
      this.performance(operation, duration, { requestId }, context);
      return duration;
    };
  }

  // Métodos de consulta
  getLogs(level?: string, limit?: number, type?: string): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level.toUpperCase());
    }
    
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.data?.type === type);
    }
    
    if (limit) {
      return filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  getStats(): any {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      errors: this.logs.filter(log => log.level === 'ERROR').length,
      warnings: this.logs.filter(log => log.level === 'WARN').length
    };
    
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      if (log.data?.type) {
        stats.byType[log.data.type] = (stats.byType[log.data.type] || 0) + 1;
      }
    });
    
    return stats;
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Método para enviar logs para serviços de monitoramento externos
  async sendToMonitoringService(logs?: LogEntry[]): Promise<void> {
    const logsToSend = logs || this.logs.filter(log => log.level === 'ERROR' || log.level === 'WARN');
    
    if (process.env.MONITORING_ENDPOINT && logsToSend.length > 0) {
      try {
        const response = await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
            'User-Agent': 'Sistema-Gestao-Logger/1.0'
          },
          body: JSON.stringify({
            service: 'sistema-gestao',
            environment: process.env.NODE_ENV,
            logs: logsToSend
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        this.debug('Logs sent to monitoring service', {
          count: logsToSend.length,
          endpoint: process.env.MONITORING_ENDPOINT
        });
      } catch (error) {
        console.error('Failed to send logs to monitoring service:', error);
      }
    }
  }

  // Método para cleanup de recursos
  async close(): Promise<void> {
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Exportar tipos para uso em outros módulos
export type { LogEntry, LoggerConfig };

// Função helper para criar contexto de requisição
export function createRequestContext(request: Request): any {
  return {
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.headers.get('cf-connecting-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    url: request.url,
    requestId: request.headers.get('x-request-id') || Math.random().toString(36).substring(7)
  };
}

// Função helper para logs de API
export function logApiRequest(
  request: Request, 
  response: { status: number }, 
  duration: number,
  userId?: string
) {
  const context = createRequestContext(request);
  if (userId) {
    context.userId = userId;
  }
  
  logger.apiLog(
    request.method,
    new URL(request.url).pathname,
    response.status,
    duration,
    context
  );
}

// Middleware para logging automático
export function withLogging<T extends (...args: any[]) => any>(
  fn: T,
  operation: string
): T {
  return ((...args: any[]) => {
    const timer = logger.startTimer(operation);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            timer();
            return value;
          })
          .catch((error) => {
            timer();
            logger.error(`Error in ${operation}`, error);
            throw error;
          });
      }
      
      timer();
      return result;
    } catch (error) {
      timer();
      logger.error(`Error in ${operation}`, error);
      throw error;
    }
  }) as T;
}

// Middleware para APIs Next.js
export function withApiLogging<T extends (...args: any[]) => any>(handler: T, operationName: string): T {
  return (async (...args: any[]) => {
    const request = args[0] as Request;
    const endTimer = logger.startTimer(`API: ${operationName}`);
    
    try {
      logger.info(`API Request: ${operationName}`, { method: request.method, url: request.url });
      const result = await handler(...args);
      endTimer();
      logger.info(`API Success: ${operationName}`);
      return result;
    } catch (error) {
      endTimer();
      logger.error(`API Error: ${operationName}`, error);
      throw error;
    }
  }) as T;
}

// Hook para componentes React
export function useLogger() {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    startTimer: logger.startTimer.bind(logger)
  };
}