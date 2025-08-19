import { NextResponse, NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';


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
  console.log('[NFe API] Modo de teste ativado - simulando emissão de NFe');
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Gerar dados mock
  const mockNfeNumber = `TEST-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  const mockAccessKey = Array(44).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  
  return {
    success: true,
    nfe_number: mockNfeNumber,
    access_key: mockAccessKey,
    xml_url: 'http://localhost:3000/mock/xml',
    pdf_url: 'http://localhost:3000/mock/pdf',
    certificado_usado: false,
  };
}

// GET - Listar NFes emitidas
export async function GET(request: NextRequest) {
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
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    // Modify the query to add LIMIT and OFFSET
    const [rows] = await connection.execute(`
      SELECT n.*, c.name as client_name, c.email, c.phone 
      FROM nfe n 
      JOIN clients c ON n.client_id = c.id 
      WHERE n.user_id = ? 
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit.toString(), offset.toString()]);
    // Add count query
    const [countRows] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM nfe WHERE user_id = ?', [userId]);
    const total = (countRows[0] as { total: number }).total;
    const responseData = {
      nfes: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
    return NextResponse.json(responseData);
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