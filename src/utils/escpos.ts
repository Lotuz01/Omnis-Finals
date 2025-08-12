// Utilitários para comandos ESC/POS para impressoras térmicas

export interface ESCPOSCommands {
  // Comandos básicos
  INIT: string;
  RESET: string;
  
  // Formatação de texto
  BOLD_ON: string;
  BOLD_OFF: string;
  UNDERLINE_ON: string;
  UNDERLINE_OFF: string;
  DOUBLE_HEIGHT_ON: string;
  DOUBLE_HEIGHT_OFF: string;
  DOUBLE_WIDTH_ON: string;
  DOUBLE_WIDTH_OFF: string;
  
  // Alinhamento
  ALIGN_LEFT: string;
  ALIGN_CENTER: string;
  ALIGN_RIGHT: string;
  
  // Corte e gaveta
  CUT_PAPER: string;
  PARTIAL_CUT: string;
  OPEN_DRAWER: string;
  
  // Alimentação de papel
  FEED_LINE: string;
  FEED_LINES: (lines: number) => string;
  
  // Códigos de barras
  BARCODE_HEIGHT: (height: number) => string;
  BARCODE_WIDTH: (width: number) => string;
  BARCODE_CODE128: (data: string) => string;
  BARCODE_EAN13: (data: string) => string;
  
  // QR Code
  QR_CODE: (data: string, size?: number) => string;
}

// Comandos ESC/POS padrão
export const ESCPOS: ESCPOSCommands = {
  // Comandos básicos
  INIT: '\x1B\x40',
  RESET: '\x1B\x40',
  
  // Formatação de texto
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  DOUBLE_HEIGHT_ON: '\x1B\x21\x10',
  DOUBLE_HEIGHT_OFF: '\x1B\x21\x00',
  DOUBLE_WIDTH_ON: '\x1B\x21\x20',
  DOUBLE_WIDTH_OFF: '\x1B\x21\x00',
  
  // Alinhamento
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  
  // Corte e gaveta
  CUT_PAPER: '\x1D\x56\x00',
  PARTIAL_CUT: '\x1D\x56\x01',
  OPEN_DRAWER: '\x1B\x70\x00\x19\xFA',
  
  // Alimentação de papel
  FEED_LINE: '\x0A',
  FEED_LINES: (lines: number) => '\x1B\x64' + String.fromCharCode(lines),
  
  // Códigos de barras
  BARCODE_HEIGHT: (height: number) => '\x1D\x68' + String.fromCharCode(height),
  BARCODE_WIDTH: (width: number) => '\x1D\x77' + String.fromCharCode(width),
  BARCODE_CODE128: (data: string) => {
    const length = data.length;
    return '\x1D\x6B\x49' + String.fromCharCode(length) + data;
  },
  BARCODE_EAN13: (data: string) => {
    return '\x1D\x6B\x02' + data + '\x00';
  },
  
  // QR Code
  QR_CODE: (data: string, size: number = 3) => {
    const dataLength = data.length;
    const pL = dataLength % 256;
    const pH = Math.floor(dataLength / 256);
    
    return (
      '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00' + // Função QR Code
      '\x1D\x28\x6B\x03\x00\x31\x43' + String.fromCharCode(size) + // Tamanho
      '\x1D\x28\x6B\x03\x00\x31\x45\x30' + // Correção de erro
      '\x1D\x28\x6B' + String.fromCharCode(pL + 3, pH) + '\x31\x50\x30' + data + // Dados
      '\x1D\x28\x6B\x03\x00\x31\x51\x30' // Imprimir
    );
  }
};

// Classe para construir comandos ESC/POS
export class ESCPOSBuilder {
  private commands: string[] = [];
  
  constructor() {
    this.init();
  }
  
  init(): ESCPOSBuilder {
    this.commands.push(ESCPOS.INIT);
    return this;
  }
  
  reset(): ESCPOSBuilder {
    this.commands.push(ESCPOS.RESET);
    return this;
  }
  
  text(text: string): ESCPOSBuilder {
    this.commands.push(text);
    return this;
  }
  
  line(text: string = ''): ESCPOSBuilder {
    this.commands.push(text + ESCPOS.FEED_LINE);
    return this;
  }
  
  bold(enabled: boolean = true): ESCPOSBuilder {
    this.commands.push(enabled ? ESCPOS.BOLD_ON : ESCPOS.BOLD_OFF);
    return this;
  }
  
  underline(enabled: boolean = true): ESCPOSBuilder {
    this.commands.push(enabled ? ESCPOS.UNDERLINE_ON : ESCPOS.UNDERLINE_OFF);
    return this;
  }
  
  doubleHeight(enabled: boolean = true): ESCPOSBuilder {
    this.commands.push(enabled ? ESCPOS.DOUBLE_HEIGHT_ON : ESCPOS.DOUBLE_HEIGHT_OFF);
    return this;
  }
  
  doubleWidth(enabled: boolean = true): ESCPOSBuilder {
    this.commands.push(enabled ? ESCPOS.DOUBLE_WIDTH_ON : ESCPOS.DOUBLE_WIDTH_OFF);
    return this;
  }
  
  align(alignment: 'left' | 'center' | 'right'): ESCPOSBuilder {
    switch (alignment) {
      case 'left':
        this.commands.push(ESCPOS.ALIGN_LEFT);
        break;
      case 'center':
        this.commands.push(ESCPOS.ALIGN_CENTER);
        break;
      case 'right':
        this.commands.push(ESCPOS.ALIGN_RIGHT);
        break;
    }
    return this;
  }
  
  feed(lines: number = 1): ESCPOSBuilder {
    if (lines === 1) {
      this.commands.push(ESCPOS.FEED_LINE);
    } else {
      this.commands.push(ESCPOS.FEED_LINES(lines));
    }
    return this;
  }
  
  separator(char: string = '-', length: number = 48): ESCPOSBuilder {
    this.commands.push(char.repeat(length) + ESCPOS.FEED_LINE);
    return this;
  }
  
  barcode(data: string, type: 'CODE128' | 'EAN13' = 'CODE128', height: number = 50): ESCPOSBuilder {
    this.commands.push(ESCPOS.BARCODE_HEIGHT(height));
    
    if (type === 'CODE128') {
      this.commands.push(ESCPOS.BARCODE_CODE128(data));
    } else if (type === 'EAN13') {
      this.commands.push(ESCPOS.BARCODE_EAN13(data));
    }
    
    this.commands.push(ESCPOS.FEED_LINE);
    return this;
  }
  
  qrCode(data: string, size: number = 3): ESCPOSBuilder {
    this.commands.push(ESCPOS.QR_CODE(data, size));
    this.commands.push(ESCPOS.FEED_LINE);
    return this;
  }
  
  cut(partial: boolean = false): ESCPOSBuilder {
    this.commands.push(partial ? ESCPOS.PARTIAL_CUT : ESCPOS.CUT_PAPER);
    return this;
  }
  
  openDrawer(): ESCPOSBuilder {
    this.commands.push(ESCPOS.OPEN_DRAWER);
    return this;
  }
  
  // Método para formatar texto em colunas
  columns(columns: { text: string; width: number; align?: 'left' | 'center' | 'right' }[]): ESCPOSBuilder {
    let line = '';
    
    columns.forEach(column => {
      const { text, width, align = 'left' } = column;
      let formattedText = text.substring(0, width);
      
      if (align === 'center') {
        const padding = Math.max(0, width - formattedText.length);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        formattedText = ' '.repeat(leftPad) + formattedText + ' '.repeat(rightPad);
      } else if (align === 'right') {
        formattedText = formattedText.padStart(width, ' ');
      } else {
        formattedText = formattedText.padEnd(width, ' ');
      }
      
      line += formattedText;
    });
    
    this.commands.push(line + ESCPOS.FEED_LINE);
    return this;
  }
  
  // Método para criar um cupom fiscal básico
  receipt(data: {
    company: {
      name: string;
      cnpj?: string;
      address?: string;
      phone?: string;
    };
    customer?: {
      name?: string;
      cpf?: string;
    };
    items: {
      description: string;
      quantity: number;
      price: number;
      total: number;
    }[];
    total: number;
    payment?: {
      method: string;
      received?: number;
      change?: number;
    };
    date?: Date;
  }): ESCPOSBuilder {
    const date = data.date || new Date();
    
    // Cabeçalho
    this.align('center')
        .bold(true)
        .doubleHeight(true)
        .line(data.company.name)
        .bold(false)
        .doubleHeight(false);
    
    if (data.company.cnpj) {
      this.line(`CNPJ: ${data.company.cnpj}`);
    }
    
    if (data.company.address) {
      this.line(data.company.address);
    }
    
    if (data.company.phone) {
      this.line(`Tel: ${data.company.phone}`);
    }
    
    this.separator('=', 48)
        .align('left')
        .line(`Data: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`);
    
    if (data.customer) {
      this.line(`Cliente: ${data.customer.name || 'Não informado'}`);
      if (data.customer.cpf) {
        this.line(`CPF: ${data.customer.cpf}`);
      }
    }
    
    this.separator('-', 48);
    
    // Itens
    this.columns([
      { text: 'ITEM', width: 20, align: 'left' },
      { text: 'QTD', width: 6, align: 'center' },
      { text: 'VL.UNIT', width: 10, align: 'right' },
      { text: 'TOTAL', width: 12, align: 'right' }
    ]);
    
    this.separator('-', 48);
    
    data.items.forEach(item => {
      this.columns([
        { text: item.description, width: 20, align: 'left' },
        { text: item.quantity.toString(), width: 6, align: 'center' },
        { text: item.price.toFixed(2), width: 10, align: 'right' },
        { text: item.total.toFixed(2), width: 12, align: 'right' }
      ]);
    });
    
    this.separator('=', 48);
    
    // Total
    this.bold(true)
        .columns([
          { text: 'TOTAL GERAL:', width: 36, align: 'right' },
          { text: `R$ ${data.total.toFixed(2)}`, width: 12, align: 'right' }
        ])
        .bold(false);
    
    // Pagamento
    if (data.payment) {
      this.separator('-', 48)
          .line(`Forma de Pagamento: ${data.payment.method}`);
      
      if (data.payment.received) {
        this.line(`Valor Recebido: R$ ${data.payment.received.toFixed(2)}`);
      }
      
      if (data.payment.change) {
        this.line(`Troco: R$ ${data.payment.change.toFixed(2)}`);
      }
    }
    
    // Rodapé
    this.separator('=', 48)
        .align('center')
        .line('Obrigado pela preferência!')
        .line('Volte sempre!')
        .feed(3);
    
    return this;
  }
  
  build(): string {
    return this.commands.join('');
  }
  
  // Método para obter os comandos como buffer
  buildBuffer(): Buffer {
    return Buffer.from(this.build(), 'binary');
  }
}

// Função utilitária para criar um builder
export function createESCPOSBuilder(): ESCPOSBuilder {
  return new ESCPOSBuilder();
}

// Função para formatar texto para impressora térmica
export function formatThermalText(text: string, maxWidth: number = 48): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Função para centralizar texto
export function centerText(text: string, width: number = 48): string {
  if (text.length >= width) {
    return text.substring(0, width);
  }
  
  const padding = width - text.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

// Função para alinhar texto à direita
export function rightAlignText(text: string, width: number = 48): string {
  if (text.length >= width) {
    return text.substring(0, width);
  }
  
  return text.padStart(width, ' ');
}

// Função para criar linha de separação
export function createSeparator(char: string = '-', width: number = 48): string {
  return char.repeat(width);
}