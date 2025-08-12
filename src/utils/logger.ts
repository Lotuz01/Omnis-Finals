// Sistema de logging avançado para produção
import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

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
  file: boolean;
  filePath?: string;
  errorFilePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  format?: 'json' | 'text';
}

class Logger {
  private config: LoggerConfig;
  private fileStream?: WriteStream;
  private errorFileStream?: WriteStream;
  private currentFileSize: number = 0;
  private currentErrorFileSize: number = 0;
  private logs: LogEntry[] = [];
  private maxMemoryLogs = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO,
      console: true,
      file: process.env.LOG_FILE ? true : false,
      filePath: process.env.LOG_FILE || './logs/app.log',
      errorFilePath: process.env.LOG_ERROR_FILE || './logs/error.log',
      maxFileSize: this.parseSize(process.env.LOG_MAX_SIZE) || 100 * 1024 * 1024, // 100MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
      format: 'json',
      ...config
    };

    if (this.config.file && this.config.filePath) {
      this.initFileLogging();
    }
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

  private parseSize(size?: string): number | undefined {
    if (!size) return undefined;
    
    const match = size.match(/^(\d+)(\w+)?$/);
    if (!match) return undefined;
    
    const value = parseInt(match[1]);
    const unit = (match[2] || '').toLowerCase();
    
    switch (unit) {
      case 'kb': return value * 1024;
      case 'mb': return value * 1024 * 1024;
      case 'gb': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  private initFileLogging() {
    if (!this.config.filePath) return;
    
    const logDir = path.dirname(this.config.filePath);
    const errorLogDir = path.dirname(this.config.errorFilePath!);
    
    // Criar diretórios se não existirem
    [logDir, errorLogDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Inicializar streams
    this.fileStream = createWriteStream(this.config.filePath, { flags: 'a' });
    this.errorFileStream = createWriteStream(this.config.errorFilePath!, { flags: 'a' });
    
    // Verificar tamanhos atuais
    if (fs.existsSync(this.config.filePath)) {
      this.currentFileSize = fs.statSync(this.config.filePath).size;
    }
    if (fs.existsSync(this.config.errorFilePath!)) {
      this.currentErrorFileSize = fs.statSync(this.config.errorFilePath!).size;
    }
  }

  private rotateLogFile(filePath: string, isError = false) {
    const stream = isError ? this.errorFileStream : this.fileStream;
    
    if (stream) {
      stream.end();
    }
    
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    
    // Rotacionar arquivos
    for (let i = this.config.maxFiles! - 1; i > 0; i--) {
      const oldFile = path.join(dir, `${base}.${i}${ext}`);
      const newFile = path.join(dir, `${base}.${i + 1}${ext}`);
      
      if (fs.existsSync(oldFile)) {
        if (i === this.config.maxFiles! - 1) {
          fs.unlinkSync(oldFile);
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }
    
    const rotatedFile = path.join(dir, `${base}.1${ext}`);
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, rotatedFile);
    }
    
    // Criar novo stream
    const newStream = createWriteStream(filePath, { flags: 'a' });
    
    if (isError) {
      this.errorFileStream = newStream;
      this.currentErrorFileSize = 0;
    } else {
      this.fileStream = newStream;
      this.currentFileSize = 0;
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

  private writeToFile(entry: LogEntry) {
    if (!this.config.file) return;
    
    const logLine = this.config.format === 'json' 
      ? JSON.stringify(entry) + '\n'
      : `${entry.timestamp} [${entry.level}] ${entry.message}${entry.data ? ' ' + JSON.stringify(entry.data) : ''}\n`;
    
    const isError = entry.level === 'ERROR';
    const stream = isError ? this.errorFileStream : this.fileStream;
    const filePath = isError ? this.config.errorFilePath! : this.config.filePath!;
    
    if (stream) {
      stream.write(logLine);
      
      const lineSize = Buffer.byteLength(logLine);
      if (isError) {
        this.currentErrorFileSize += lineSize;
        if (this.currentErrorFileSize >= this.config.maxFileSize!) {
          this.rotateLogFile(filePath, true);
        }
      } else {
        this.currentFileSize += lineSize;
        if (this.currentFileSize >= this.config.maxFileSize!) {
          this.rotateLogFile(filePath, false);
        }
      }
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

  private log(level: LogLevel, message: string, data?: any, stack?: string, context?: any) {
    if (!this.shouldLog(level)) return;
    
    const entry = this.formatMessage(level, message, data, stack, context);
    
    this.addToMemory(entry);
    this.writeToConsole(entry);
    this.writeToFile(entry);
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
    if (this.fileStream) {
      this.fileStream.end();
    }
    if (this.errorFileStream) {
      this.errorFileStream.end();
    }
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