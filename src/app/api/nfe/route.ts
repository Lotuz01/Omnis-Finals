import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';
import { obterCertificadoService } from '../certificado/route';

// Interface para dados da NFe
interface NFEData {
  client_id: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    cfop: string;
    ncm: string;
    unit: string;
  }>;
  total_amount: number;
  operation_type: string;
  notes?: string;
}

// Interface para resposta da API de NFe
interface NFEResponse {
  success: boolean;
  nfe_number?: string;
  access_key?: string;
  xml_url?: string;
  pdf_url?: string;
  error?: string;
  xml_assinado?: string;
  certificado_usado?: boolean;
}

// Função para emitir NFe via API externa (exemplo com Focus NFe)
async function emitNFE(nfeData: NFEData, clientData: { name: string; email?: string; phone?: string; address?: string; }): Promise<NFEResponse> {
  let xmlAssinado: string | undefined;
  let certificadoUsado = false;
  
  // Verificar se há certificado digital configurado
  const certificadoService = obterCertificadoService();
  if (certificadoService) {
    console.log('[NFe API] Certificado digital disponível - preparando assinatura');
    certificadoUsado = true;
  } else {
    console.log('[NFe API] Certificado digital não configurado - emissão sem assinatura local');
  }
  try {
    // Configurações da API (em produção, usar variáveis de ambiente)
    const API_TOKEN = process.env.NFE_API_TOKEN || 'seu_token_aqui';
    const API_URL = process.env.NFE_API_URL || 'https://homologacao.focusnfe.com.br/v2/nfe';
    
    // Montar dados da NFe conforme layout da API
    const nfePayload = {
      natureza_operacao: nfeData.operation_type,
      data_emissao: new Date().toISOString(),
      data_entrada_saida: new Date().toISOString(),
      tipo_documento: "1",
      finalidade_emissao: "1",
      
      // Dados do emitente (empresa) - em produção, buscar do banco
      cnpj_emitente: process.env.COMPANY_CNPJ || "00000000000000",
      nome_emitente: process.env.COMPANY_NAME || "Sua Empresa LTDA",
      nome_fantasia_emitente: process.env.COMPANY_FANTASY_NAME || "Sua Empresa",
      logradouro_emitente: process.env.COMPANY_ADDRESS || "Rua Exemplo, 123",
      numero_emitente: process.env.COMPANY_NUMBER || "123",
      bairro_emitente: process.env.COMPANY_DISTRICT || "Centro",
      municipio_emitente: process.env.COMPANY_CITY || "São Paulo",
      uf_emitente: process.env.COMPANY_STATE || "SP",
      cep_emitente: process.env.COMPANY_ZIP || "00000000",
      inscricao_estadual_emitente: process.env.COMPANY_IE || "123456789",
      
      // Dados do destinatário (cliente)
      nome_destinatario: clientData.name,
      cnpj_destinatario: "00000000000000", // CNPJ padrão para teste
      logradouro_destinatario: clientData.address || "Endereço não informado",
      numero_destinatario: "S/N",
      bairro_destinatario: "Centro",
      municipio_destinatario: "São Paulo",
      uf_destinatario: "SP",
      cep_destinatario: "00000000",
      
      valor_total: nfeData.total_amount.toFixed(2),
      valor_produtos: nfeData.total_amount.toFixed(2),
      modalidade_frete: "0", // Sem frete
      
      // Itens da nota
      items: nfeData.items.map((item, index) => ({
        numero_item: (index + 1).toString(),
        codigo_produto: `PROD${index + 1}`,
        descricao: item.description,
        cfop: item.cfop,
        unidade_comercial: item.unit,
        quantidade_comercial: item.quantity.toString(),
        valor_unitario_comercial: item.unit_price.toFixed(4),
        valor_unitario_tributavel: item.unit_price.toFixed(4),
        unidade_tributavel: item.unit,
        codigo_ncm: item.ncm,
        quantidade_tributavel: item.quantity.toString(),
        valor_bruto: item.total_price.toFixed(2),
        icms_situacao_tributaria: "102", // Simples Nacional
        icms_origem: "0",
        pis_situacao_tributaria: "49",
        cofins_situacao_tributaria: "49"
      }))
    };

    // Fazer requisição para API de NFe
    const response = await fetch(`${API_URL}?ref=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(API_TOKEN + ':').toString('base64')}`
      },
      body: JSON.stringify(nfePayload)
    });

    const result = await response.json();

    if (response.ok) {
      // Se temos certificado e a API retornou XML, assinar localmente
      if (certificadoService && result.caminho_xml_nota_fiscal) {
        try {
          console.log('[NFe API] Baixando XML para assinatura...');
          
          // Baixar XML da API
          const xmlResponse = await fetch(result.caminho_xml_nota_fiscal);
          if (xmlResponse.ok) {
            const xmlContent = await xmlResponse.text();
            
            // Assinar XML com certificado digital
            const resultadoAssinatura = await certificadoService.assinarXMLNFe(
              xmlContent, 
              result.chave_nfe || result.numero
            );
            
            if (resultadoAssinatura.sucesso && resultadoAssinatura.xmlAssinado) {
              xmlAssinado = resultadoAssinatura.xmlAssinado;
              console.log('[NFe API] XML assinado com sucesso');
            } else {
              console.error('[NFe API] Falha na assinatura do XML:', resultadoAssinatura.erro);
            }
          } else {
            console.error('[NFe API] Falha ao baixar XML para assinatura');
          }
        } catch (error) {
          console.error('[NFe API] Erro durante assinatura do XML:', error);
        }
      }
      
      return {
        success: true,
        nfe_number: result.numero,
        access_key: result.chave_nfe,
        xml_url: result.caminho_xml_nota_fiscal,
        pdf_url: result.caminho_danfe,
        xml_assinado: xmlAssinado,
        certificado_usado: certificadoUsado
      };
    } else {
      return {
        success: false,
        error: result.erros ? result.erros.join(', ') : 'Erro na emissão da NFe',
        certificado_usado: certificadoUsado
      };
    }
  } catch (error) {
    console.error('Erro ao emitir NFe:', error);
    return {
      success: false,
      error: `Erro na comunicação com a API: ${(error as Error).message}`
    };
  }
}

// GET - Listar NFes emitidas
export async function GET() {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    connection = await connectToDatabase();
    
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Buscar NFes do usuário
    const [rows] = await connection.execute(`
      SELECT n.*, c.name as client_name, c.email, c.phone 
      FROM nfe n 
      JOIN clients c ON n.client_id = c.id 
      WHERE n.user_id = ? 
      ORDER BY n.created_at DESC
    `, [userId]);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching NFes:', error);
    return NextResponse.json({ message: 'Error fetching NFes', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

// POST - Emitir nova NFe
export async function POST(request: Request) {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    connection = await connectToDatabase();
    
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    const nfeData: NFEData = await request.json();

    // Validações
    if (!nfeData.client_id || !nfeData.items || nfeData.items.length === 0) {
      return NextResponse.json({ message: 'Client ID and items are required' }, { status: 400 });
    }

    // Buscar dados do cliente
    const [clientRows] = await connection.execute(
      'SELECT * FROM clients WHERE id = ?',
      [nfeData.client_id]
    ) as [{ name: string; email?: string; phone?: string; address?: string; }[], unknown];

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    const clientData = clientRows[0];

    // Emitir NFe via API externa
    const nfeResult = await emitNFE(nfeData, clientData);

    if (nfeResult.success) {
      // Preparar dados adicionais sobre certificado
      const certificadoInfo = nfeResult.certificado_usado ? {
        certificado_usado: true,
        xml_assinado_localmente: !!nfeResult.xml_assinado,
        timestamp_assinatura: new Date().toISOString()
      } : {
        certificado_usado: false,
        xml_assinado_localmente: false
      };

      // Salvar NFe no banco de dados
      const [result] = await connection.execute(`
        INSERT INTO nfe (
          client_id, user_id, nfe_number, access_key, 
          total_amount, operation_type, status, 
          xml_url, pdf_url, items_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nfeData.client_id,
        userId,
        nfeResult.nfe_number,
        nfeResult.access_key,
        nfeData.total_amount,
        nfeData.operation_type,
        'emitida',
        nfeResult.xml_url,
        nfeResult.pdf_url,
        JSON.stringify(nfeData.items),
        nfeData.notes
      ]) as [{ insertId: number }, unknown];

      // Log da emissão com informações do certificado
      console.log(`[NFe API] NFe ${nfeResult.nfe_number} emitida com sucesso`, {
        id: result.insertId,
        certificado_usado: certificadoInfo.certificado_usado,
        xml_assinado: certificadoInfo.xml_assinado_localmente
      });

      return NextResponse.json({
        message: 'NFe emitida com sucesso',
        id: result.insertId,
        nfe_number: nfeResult.nfe_number,
        access_key: nfeResult.access_key,
        pdf_url: nfeResult.pdf_url,
        certificado: certificadoInfo
      }, { status: 201 });
    } else {
      return NextResponse.json({
        message: 'Erro na emissão da NFe',
        error: nfeResult.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating NFe:', error);
    return NextResponse.json({ message: 'Error creating NFe', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}