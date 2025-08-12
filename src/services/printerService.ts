// Serviço para integração com diferentes tipos de impressoras

import { createESCPOSBuilder } from '../utils/escpos';

export interface PrinterConfig {
  id: number;
  name: string;
  type: 'termica' | 'matricial' | 'laser' | 'jato_tinta';
  connection_type: 'usb' | 'rede' | 'serial' | 'bluetooth';
  ip_address?: string;
  port?: number;
  device_path?: string;
  paper_width: number;
  paper_height?: number;
  characters_per_line?: number;
  font_size?: number;
  is_default: boolean;
  is_active: boolean;
  settings: {
    cut_paper?: boolean;
    open_drawer?: boolean;
    print_logo?: boolean;
    logo_path?: string;
    header_text?: string;
    footer_text?: string;
    encoding?: string;
    baud_rate?: number;
    data_bits?: number;
    stop_bits?: number;
    parity?: string;
  };
}

export interface PrintJob {
  printer_id?: number;
  document_type: 'cupom' | 'nfe' | 'relatorio' | 'etiqueta' | 'custom';
  content: any;
  copies?: number;
  options?: {
    cut_paper?: boolean;
    open_drawer?: boolean;
    font_size?: number;
  };
}

export interface PrintResult {
  success: boolean;
  message: string;
  job_id?: string;
  printer_used?: string;
}

// Classe base para impressoras
abstract class BasePrinter {
  protected config: PrinterConfig;
  
  constructor(config: PrinterConfig) {
    this.config = config;
  }
  
  abstract print(job: PrintJob): Promise<PrintResult>;
  
  protected formatContent(job: PrintJob): string {
    switch (job.document_type) {
      case 'cupom':
        return this.formatReceipt(job.content);
      case 'etiqueta':
        return this.formatLabel(job.content);
      case 'nfe':
        return this.formatNFe(job.content);
      case 'relatorio':
        return this.formatReport(job.content);
      case 'custom':
        return typeof job.content === 'string' ? job.content : JSON.stringify(job.content);
      default:
        return 'Documento não suportado';
    }
  }
  
  protected formatReceipt(data: any): string {
    const builder = createESCPOSBuilder();
    
    if (typeof data === 'object' && data.company) {
      builder.receipt(data);
    } else {
      builder.align('center')
             .bold(true)
             .line('CUPOM FISCAL')
             .bold(false)
             .separator('=', this.config.characters_per_line || 48)
             .align('left')
             .line(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
             .separator('=', this.config.characters_per_line || 48)
             .align('center')
             .line('Obrigado pela preferência!')
             .feed(3);
    }
    
    if (this.config.settings.cut_paper) {
      builder.cut();
    }
    
    if (this.config.settings.open_drawer) {
      builder.openDrawer();
    }
    
    return builder.build();
  }
  
  protected formatLabel(data: any): string {
    const builder = createESCPOSBuilder();
    
    if (typeof data === 'object' && data.product) {
      const product = data.product;
      
      builder.align('center')
             .bold(true)
             .line(product.name || 'Produto')
             .bold(false)
             .line(`Código: ${product.code || 'N/A'}`)
             .line(`Preço: R$ ${product.price || '0,00'}`)
             .feed(1);
      
      if (product.barcode) {
        builder.barcode(product.barcode, 'CODE128', 50);
      }
      
      builder.feed(2);
    } else {
      builder.align('center')
             .line('ETIQUETA')
             .separator('-', this.config.characters_per_line || 48)
             .line(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
             .feed(2);
    }
    
    if (this.config.settings.cut_paper) {
      builder.cut();
    }
    
    return builder.build();
  }
  
  protected formatNFe(data: any): string {
    const builder = createESCPOSBuilder();
    
    // Cabeçalho
    builder.align('center')
           .bold(true)
           .line('NOTA FISCAL ELETRÔNICA')
           .bold(false)
           .separator('=', this.config.characters_per_line || 48)
           .align('left');
    
    if (typeof data === 'object') {
      // Informações da NFe
      if (data.nfe_number) {
        builder.line(`NFe: ${data.nfe_number}`);
      }
      
      if (data.access_key) {
        builder.line(`Chave de Acesso:`);
        // Quebrar a chave em linhas menores para melhor visualização
        const key = data.access_key;
        const lineLength = this.config.characters_per_line || 48;
        for (let i = 0; i < key.length; i += lineLength - 4) {
          builder.line(`  ${key.substring(i, i + lineLength - 4)}`);
        }
      }
      
      builder.separator('-', this.config.characters_per_line || 48);
      
      // Dados do cliente
      if (data.client_name) {
        builder.line(`Cliente: ${data.client_name}`);
      }
      if (data.cnpj) {
        builder.line(`CNPJ: ${data.cnpj}`);
      }
      
      builder.separator('-', this.config.characters_per_line || 48);
      
      // Informações da operação
      if (data.operation_type) {
        builder.line(`Operação: ${data.operation_type}`);
      }
      
      if (data.created_at) {
        const date = new Date(data.created_at).toLocaleString('pt-BR');
        builder.line(`Data/Hora: ${date}`);
      }
      
      if (data.total_amount) {
        builder.separator('-', this.config.characters_per_line || 48)
               .bold(true)
               .line(`VALOR TOTAL: R$ ${parseFloat(data.total_amount).toFixed(2).replace('.', ',')}`)
               .bold(false);
      }
      
      if (data.status) {
        builder.line(`Status: ${data.status.toUpperCase()}`);
      }
    } else {
      builder.line(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    }
    
    builder.separator('=', this.config.characters_per_line || 48)
           .align('center')
           .line('VIA DO CLIENTE')
           .line('')
           .line('Esta é uma representação simplificada')
           .line('da Nota Fiscal Eletrônica.')
           .line('Consulte o arquivo PDF ou XML')
           .line('para informações completas.')
           .feed(3);
    
    if (this.config.settings.cut_paper) {
      builder.cut();
    }
    
    return builder.build();
  }
  
  protected formatReport(data: any): string {
    const builder = createESCPOSBuilder();
    
    builder.align('center')
           .bold(true)
           .line('RELATÓRIO')
           .bold(false)
           .separator('=', this.config.characters_per_line || 48)
           .align('left')
           .line(`Data: ${new Date().toLocaleString('pt-BR')}`)
           .separator('-', this.config.characters_per_line || 48)
           .line(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
           .separator('=', this.config.characters_per_line || 48)
           .feed(3);
    
    if (this.config.settings.cut_paper) {
      builder.cut();
    }
    
    return builder.build();
  }
}

// Impressora Térmica
class ThermalPrinter extends BasePrinter {
  async print(job: PrintJob): Promise<PrintResult> {
    try {
      const content = this.formatContent(job);
      const copies = job.copies || 1;
      
      // Simular envio para impressora térmica
      for (let i = 0; i < copies; i++) {
        await this.sendToThermalPrinter(content);
      }
      
      return {
        success: true,
        message: `Documento enviado para impressora térmica ${this.config.name}`,
        job_id: this.generateJobId(),
        printer_used: this.config.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  private async sendToThermalPrinter(content: string): Promise<void> {
    // Aqui seria implementada a comunicação real com a impressora
    // Por exemplo, usando bibliotecas como node-escpos, node-printer, etc.
    
    if (this.config.connection_type === 'rede') {
      await this.sendViaNetwork(content);
    } else if (this.config.connection_type === 'usb') {
      await this.sendViaUSB(content);
    } else if (this.config.connection_type === 'serial') {
      await this.sendViaSerial(content);
    } else {
      throw new Error('Tipo de conexão não suportado para impressora térmica');
    }
  }
  
  private async sendViaNetwork(content: string): Promise<void> {
    // Implementação para envio via rede TCP/IP
    console.log(`[THERMAL NETWORK] Enviando para ${this.config.ip_address}:${this.config.port}`);
    console.log(`[THERMAL NETWORK] Conteúdo: ${content.substring(0, 100)}...`);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  private async sendViaUSB(content: string): Promise<void> {
    // Implementação para envio via USB
    console.log(`[THERMAL USB] Enviando para ${this.config.device_path}`);
    console.log(`[THERMAL USB] Conteúdo: ${content.substring(0, 100)}...`);
    
    // Simular delay de USB
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  private async sendViaSerial(content: string): Promise<void> {
    // Implementação para envio via Serial
    console.log(`[THERMAL SERIAL] Enviando para ${this.config.device_path}`);
    console.log(`[THERMAL SERIAL] Configuração: ${this.config.settings.baud_rate} baud`);
    console.log(`[THERMAL SERIAL] Conteúdo: ${content.substring(0, 100)}...`);
    
    // Simular delay de serial
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  private generateJobId(): string {
    return `thermal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Impressora Matricial
class DotMatrixPrinter extends BasePrinter {
  async print(job: PrintJob): Promise<PrintResult> {
    try {
      const content = this.formatContentForDotMatrix(job);
      const copies = job.copies || 1;
      
      for (let i = 0; i < copies; i++) {
        await this.sendToDotMatrixPrinter(content);
      }
      
      return {
        success: true,
        message: `Documento enviado para impressora matricial ${this.config.name}`,
        job_id: this.generateJobId(),
        printer_used: this.config.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  private formatContentForDotMatrix(job: PrintJob): string {
    // Formatação específica para impressora matricial
    const content = this.formatContent(job);
    
    // Remover comandos ESC/POS específicos de impressora térmica
    // e adaptar para comandos de impressora matricial
    return content.replace(/\x1B[\x40\x45\x2D\x21\x61]/g, '')
                  .replace(/\x1D[\x56\x68\x77\x6B]/g, '')
                  .replace(/\x0A/g, '\r\n'); // Usar CRLF para matricial
  }
  
  private async sendToDotMatrixPrinter(content: string): Promise<void> {
    console.log(`[DOT MATRIX] Enviando para ${this.config.device_path || this.config.ip_address}`);
    console.log(`[DOT MATRIX] Conteúdo: ${content.substring(0, 100)}...`);
    
    // Simular delay de impressora matricial (mais lenta)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  private generateJobId(): string {
    return `dotmatrix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Impressora Laser/Jato de Tinta
class StandardPrinter extends BasePrinter {
  async print(job: PrintJob): Promise<PrintResult> {
    try {
      const content = this.formatContentForStandardPrinter(job);
      const copies = job.copies || 1;
      
      for (let i = 0; i < copies; i++) {
        await this.sendToStandardPrinter(content);
      }
      
      return {
        success: true,
        message: `Documento enviado para impressora ${this.config.type} ${this.config.name}`,
        job_id: this.generateJobId(),
        printer_used: this.config.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  private formatContentForStandardPrinter(job: PrintJob): string {
    // Para impressoras laser/jato de tinta, converter para texto simples
    const content = this.formatContent(job);
    
    // Remover todos os comandos ESC/POS e manter apenas o texto
    return content.replace(/\x1B[\x00-\x1F\x7F-\xFF]/g, '')
                  .replace(/\x1D[\x00-\x1F\x7F-\xFF]/g, '')
                  .replace(/\x0A/g, '\r\n');
  }
  
  private async sendToStandardPrinter(content: string): Promise<void> {
    console.log(`[${this.config.type.toUpperCase()}] Enviando para ${this.config.name}`);
    console.log(`[${this.config.type.toUpperCase()}] Conteúdo: ${content.substring(0, 100)}...`);
    
    // Simular delay de impressora padrão
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  private generateJobId(): string {
    return `${this.config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory para criar impressoras
export class PrinterFactory {
  static createPrinter(config: PrinterConfig): BasePrinter {
    switch (config.type) {
      case 'termica':
        return new ThermalPrinter(config);
      case 'matricial':
        return new DotMatrixPrinter(config);
      case 'laser':
      case 'jato_tinta':
        return new StandardPrinter(config);
      default:
        throw new Error(`Tipo de impressora não suportado: ${config.type}`);
    }
  }
}

// Serviço principal de impressão
export class PrinterService {
  private printers: Map<number, BasePrinter> = new Map();
  private defaultPrinter: BasePrinter | null = null;
  
  // Registrar uma impressora
  registerPrinter(config: PrinterConfig): void {
    const printer = PrinterFactory.createPrinter(config);
    this.printers.set(config.id, printer);
    
    if (config.is_default) {
      this.defaultPrinter = printer;
    }
  }
  
  // Remover uma impressora
  unregisterPrinter(printerId: number): void {
    const printer = this.printers.get(printerId);
    if (printer === this.defaultPrinter) {
      this.defaultPrinter = null;
    }
    this.printers.delete(printerId);
  }
  
  // Imprimir documento
  async print(job: PrintJob): Promise<PrintResult> {
    let printer: BasePrinter | null = null;
    
    if (job.printer_id) {
      printer = this.printers.get(job.printer_id) || null;
      if (!printer) {
        return {
          success: false,
          message: `Impressora com ID ${job.printer_id} não encontrada`
        };
      }
    } else {
      printer = this.defaultPrinter;
      if (!printer) {
        return {
          success: false,
          message: 'Nenhuma impressora padrão configurada'
        };
      }
    }
    
    return await printer.print(job);
  }
  
  // Listar impressoras registradas
  getRegisteredPrinters(): number[] {
    return Array.from(this.printers.keys());
  }
  
  // Verificar se uma impressora está registrada
  isPrinterRegistered(printerId: number): boolean {
    return this.printers.has(printerId);
  }
  
  // Definir impressora padrão
  setDefaultPrinter(printerId: number): boolean {
    const printer = this.printers.get(printerId);
    if (printer) {
      this.defaultPrinter = printer;
      return true;
    }
    return false;
  }
}

// Instância singleton do serviço de impressão
export const printerService = new PrinterService();

// Função utilitária para testar impressora
export async function testPrinter(config: PrinterConfig): Promise<PrintResult> {
  const printer = PrinterFactory.createPrinter(config);
  
  const testJob: PrintJob = {
    document_type: 'custom',
    content: `Teste de impressão\nImpressora: ${config.name}\nTipo: ${config.type}\nData: ${new Date().toLocaleString('pt-BR')}\n\nSe você está vendo esta mensagem,\na impressora está funcionando corretamente!`,
    copies: 1
  };
  
  return await printer.print(testJob);
}