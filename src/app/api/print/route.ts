import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';

// Interface para dados de impressão
interface PrintData {
  printer_id?: number;
  document_type: 'cupom' | 'nfe' | 'relatorio' | 'etiqueta' | 'custom';
  content: string | object;
  copies?: number;
  options?: {
    cut_paper?: boolean;
    open_drawer?: boolean;
    print_logo?: boolean;
    font_size?: 'small' | 'medium' | 'large';
    alignment?: 'left' | 'center' | 'right';
    bold?: boolean;
    underline?: boolean;
  };
}

// Interface para resposta de impressão
interface PrintResponse {
  success: boolean;
  message: string;
  print_job_id?: string;
  error?: string;
}

// Função para gerar comandos ESC/POS para impressoras térmicas
function generateESCPOSCommands(content: string, options: { cut_paper?: boolean; open_drawer?: boolean; print_logo?: boolean; font_size?: string; alignment?: string; bold?: boolean; underline?: boolean } = {}, printerConfig: { settings?: Record<string, unknown> }): string {
  let commands = '';
  
  // Inicializar impressora
  commands += '\x1B\x40'; // ESC @ - Inicializar
  
  // Configurar codificação
  if (printerConfig.settings?.encoding === 'utf8') {
    commands += '\x1B\x74\x20'; // Selecionar página de código UTF-8
  }
  
  // Logo da empresa (se configurado)
  if (options.print_logo && printerConfig.settings?.logo_path) {
    // Aqui você implementaria a lógica para imprimir logo
    // commands += logoCommands;
  }
  
  // Cabeçalho personalizado
  if (printerConfig.settings?.header_text) {
    commands += '\x1B\x61\x01'; // Centralizar
    commands += '\x1B\x21\x10'; // Texto duplo
    commands += printerConfig.settings.header_text + '\n\n';
    commands += '\x1B\x21\x00'; // Resetar formatação
  }
  
  // Configurar alinhamento
  switch (options.alignment) {
    case 'center':
      commands += '\x1B\x61\x01';
      break;
    case 'right':
      commands += '\x1B\x61\x02';
      break;
    default:
      commands += '\x1B\x61\x00'; // left
  }
  
  // Configurar tamanho da fonte
  switch (options.font_size) {
    case 'small':
      commands += '\x1B\x21\x01';
      break;
    case 'large':
      commands += '\x1B\x21\x10';
      break;
    default:
      commands += '\x1B\x21\x00'; // medium
  }
  
  // Negrito
  if (options.bold) {
    commands += '\x1B\x45\x01';
  }
  
  // Sublinhado
  if (options.underline) {
    commands += '\x1B\x2D\x01';
  }
  
  // Conteúdo principal
  commands += content;
  
  // Resetar formatação
  commands += '\x1B\x21\x00';
  commands += '\x1B\x45\x00';
  commands += '\x1B\x2D\x00';
  
  // Rodapé personalizado
  if (printerConfig.settings?.footer_text) {
    commands += '\n\n';
    commands += '\x1B\x61\x01'; // Centralizar
    commands += printerConfig.settings.footer_text;
  }
  
  // Cortar papel (se configurado)
  if (options.cut_paper && printerConfig.settings?.cut_paper) {
    commands += '\n\n\n';
    commands += '\x1D\x56\x00'; // Corte total
  }
  
  // Abrir gaveta (se configurado)
  if (options.open_drawer && printerConfig.settings?.open_drawer) {
    commands += '\x1B\x70\x00\x19\xFA'; // Abrir gaveta
  }
  
  return commands;
}

// Função para formatar cupom fiscal
function formatCupom(data: { company?: { name: string; cnpj: string; address: string; phone: string }; customer?: { name: string; cpf?: string }; items?: Array<{ description: string; quantity: number; price: number }>; payment?: { method: string; change: number } }): string {
  let content = '';
  
  // Cabeçalho do cupom
  content += '================================\n';
  content += '           CUPOM FISCAL          \n';
  content += '================================\n\n';
  
  // Dados da empresa
  if (data.company) {
    content += `${data.company.name}\n`;
    content += `CNPJ: ${data.company.cnpj}\n`;
    content += `${data.company.address}\n`;
    content += `Tel: ${data.company.phone}\n\n`;
  }
  
  // Dados do cliente (se houver)
  if (data.customer) {
    content += `Cliente: ${data.customer.name}\n`;
    if (data.customer.cpf) {
      content += `CPF: ${data.customer.cpf}\n`;
    }
    content += '\n';
  }
  
  // Itens
  content += 'ITEM  DESCRICAO         QTD  VL.UNIT  VL.TOTAL\n';
  content += '----------------------------------------\n';
  
  let total = 0;
  data.items?.forEach((item: { description: string; quantity: number; price: number }, index: number) => {
    const itemTotal = item.quantity * item.price;
    total += itemTotal;
    
    content += `${String(index + 1).padStart(3, '0')}   `;
    content += `${item.description.substring(0, 15).padEnd(15)} `;
    content += `${String(item.quantity).padStart(3)} `;
    content += `${item.price.toFixed(2).padStart(7)} `;
    content += `${itemTotal.toFixed(2).padStart(8)}\n`;
  });
  
  content += '----------------------------------------\n';
  content += `TOTAL: R$ ${total.toFixed(2).padStart(20)}\n\n`;
  
  // Forma de pagamento
  if (data.payment) {
    content += `Pagamento: ${data.payment.method}\n`;
    if (data.payment.change > 0) {
      content += `Troco: R$ ${data.payment.change.toFixed(2)}\n`;
    }
  }
  
  // Rodapé
  content += '\n================================\n';
  content += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
  content += 'Obrigado pela preferencia!\n';
  content += '================================\n';
  
  return content;
}

// Função para simular impressão (em produção, integrar com biblioteca real)
async function sendToPrinter(printerConfig: { name: string; type: string; connection_type: string; ip_address?: string; port?: number; device_path?: string; settings?: Record<string, unknown> }, commands: string, copies: number = 1): Promise<PrintResponse> {
  try {
    // Aqui você implementaria a integração real com a impressora
    // Exemplos de bibliotecas: node-escpos, qz-tray, etc.
    
    console.log('Enviando para impressora:', {
      printer: printerConfig.name,
      type: printerConfig.type,
      connection: printerConfig.connection_type,
      copies: copies
    });
    
    // Simular delay de impressão
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Para impressoras de rede
    if (printerConfig.connection_type === 'rede') {
      // Implementar envio via socket TCP/IP
      console.log(`Enviando via rede para ${printerConfig.ip_address}:${printerConfig.port}`);
    }
    
    // Para impressoras USB
    if (printerConfig.connection_type === 'usb') {
      // Implementar envio via USB
      console.log(`Enviando via USB para ${printerConfig.device_path}`);
    }
    
    // Para impressoras seriais
    if (printerConfig.connection_type === 'serial') {
      // Implementar envio via porta serial
      console.log(`Enviando via serial para ${printerConfig.device_path}`);
    }
    
    return {
      success: true,
      message: 'Documento enviado para impressão com sucesso',
      print_job_id: `job_${Date.now()}`
    };
    
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    return {
      success: false,
      message: 'Erro ao enviar documento para impressão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// POST - Imprimir documento
export async function POST(request: Request) {
  let connection;
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 });
    }

    connection = await connectToDatabase();
    
    // Buscar usuário pelo token
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [authToken.value]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    const user = userRows[0] as { id: number };
    const printData: PrintData = await request.json();

    // Validações
    if (!printData.document_type || !printData.content) {
      return NextResponse.json({ error: 'Tipo de documento e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Buscar configuração da impressora
    let printerQuery = 'SELECT * FROM printers WHERE user_id = ?';
    const printerParams = [user.id];
    
    if (printData.printer_id) {
      printerQuery += ' AND id = ?';
      printerParams.push(printData.printer_id);
    } else {
      printerQuery += ' AND is_default = TRUE';
    }
    
    const [printerRows] = await connection.execute(printerQuery, printerParams);
    
    if (!Array.isArray(printerRows) || printerRows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Impressora não encontrada ou não configurada' }, { status: 404 });
    }
    
    const printerConfig = printerRows[0] as { id: number; name: string; type: string; connection_type: string; ip_address?: string; port?: number; device_path?: string; settings?: Record<string, unknown>; is_active: boolean };
    
    // Parse seguro das configurações
    try {
      if (typeof printerConfig.settings === 'string') {
        printerConfig.settings = JSON.parse(printerConfig.settings);
      } else if (printerConfig.settings && typeof printerConfig.settings === 'object') {
        // Já é um objeto, manter como está
      } else {
        printerConfig.settings = {};
      }
    } catch (error) {
      console.error('Erro ao fazer parse das configurações da impressora:', error);
      printerConfig.settings = {};
    }
    
    if (!printerConfig.is_active) {
      await connection.end();
      return NextResponse.json({ error: 'Impressora está inativa' }, { status: 400 });
    }

    // Processar conteúdo baseado no tipo de documento
    let formattedContent = '';
    
    switch (printData.document_type) {
      case 'cupom':
        formattedContent = formatCupom(printData.content as object);
        break;
      case 'nfe':
        // Implementar formatação para NFe
        formattedContent = typeof printData.content === 'string' ? printData.content : JSON.stringify(printData.content);
        break;
      case 'relatorio':
        // Implementar formatação para relatórios
        formattedContent = typeof printData.content === 'string' ? printData.content : JSON.stringify(printData.content);
        break;
      case 'etiqueta':
        // Implementar formatação para etiquetas
        formattedContent = typeof printData.content === 'string' ? printData.content : JSON.stringify(printData.content);
        break;
      default:
        formattedContent = typeof printData.content === 'string' ? printData.content : JSON.stringify(printData.content);
    }
    
    // Gerar comandos de impressão baseado no tipo da impressora
    let printCommands = '';
    
    if (printerConfig.type === 'termica') {
      printCommands = generateESCPOSCommands(formattedContent, printData.options, printerConfig);
    } else {
      // Para impressoras não térmicas, usar texto simples
      printCommands = formattedContent;
    }
    
    // Enviar para impressão
    const printResult = await sendToPrinter(printerConfig, printCommands, printData.copies || 1);
    
    // Registrar log de impressão
    await connection.execute(
      `INSERT INTO print_logs (user_id, printer_id, document_type, content_preview, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        printerConfig.id,
        printData.document_type,
        formattedContent.substring(0, 500), // Preview do conteúdo
        printResult.success ? 'success' : 'error'
      ]
    );
    
    await connection.end();
    
    if (printResult.success) {
      return NextResponse.json(printResult);
    } else {
      return NextResponse.json(printResult, { status: 500 });
    }

  } catch (error) {
    console.error('Erro ao processar impressão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET - Listar logs de impressão
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');
    
    if (!authToken) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 });
    }

    const connection = await connectToDatabase();
    
    // Buscar usuário pelo token
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [authToken.value]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    const user = userRows[0] as { id: number };

    // Buscar logs de impressão
    const [logRows] = await connection.execute(
      `SELECT pl.*, p.name as printer_name, p.type as printer_type
       FROM print_logs pl
       LEFT JOIN printers p ON pl.printer_id = p.id
       WHERE pl.user_id = ?
       ORDER BY pl.created_at DESC
       LIMIT 100`,
      [user.id]
    );

    await connection.end();
    return NextResponse.json(logRows);

  } catch (error) {
    console.error('Erro ao buscar logs de impressão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}