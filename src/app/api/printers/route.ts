import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';

// Interface para configuração de impressora
interface PrinterConfig {
  id?: number;
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

// GET - Listar impressoras configuradas
export async function GET() {
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

    // Buscar impressoras do usuário
    const [printerRows] = await connection.execute(
      'SELECT * FROM printers WHERE user_id = ? ORDER BY is_default DESC, name ASC',
      [user.id]
    );

    const printers = (printerRows as Record<string, unknown>[]).map((printer) => {
      let settings = {};
      try {
        if (typeof printer.settings === 'string') {
          settings = JSON.parse(printer.settings);
        } else if (printer.settings && typeof printer.settings === 'object') {
          settings = printer.settings;
        }
      } catch (error) {
        console.error('Erro ao fazer parse das configurações da impressora:', error);
        settings = {};
      }
      
      return {
        ...printer,
        settings
      };
    });

    await connection.end();
    return NextResponse.json(printers);

  } catch (error) {
    console.error('Erro ao buscar impressoras:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova configuração de impressora
export async function POST(request: Request) {
  let connection;
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 });
    }

    const data: PrinterConfig = await request.json();

    // Validação básica
    if (!data.name || !data.type || !data.connection_type) {
      return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
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

    // Se esta impressora for marcada como padrão, desmarcar outras
    if (data.is_default) {
      await connection.execute(
        'UPDATE printers SET is_default = FALSE WHERE user_id = ?',
        [user.id]
      );
    }

    // Inserir nova impressora
    const [result] = await connection.execute(
      `INSERT INTO printers (
        user_id, name, type, connection_type, ip_address, port, device_path,
        paper_width, paper_height, characters_per_line, font_size,
        is_default, is_active, settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        data.name,
        data.type,
        data.connection_type,
        data.ip_address || null,
        data.port || null,
        data.device_path || null,
        data.paper_width,
        data.paper_height || null,
        data.characters_per_line || null,
        data.font_size || null,
        data.is_default,
        data.is_active,
        JSON.stringify(data.settings)
      ]
    );

    await connection.end();
    return NextResponse.json({ 
      message: 'Impressora configurada com sucesso',
      id: (result as { insertId: number }).insertId
    });

  } catch (error) {
    console.error('Erro ao criar impressora:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar configuração de impressora
export async function PUT(request: Request) {
  let connection;
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 });
    }

    const data: PrinterConfig = await request.json();

    // Validação básica
    if (!data.id || !data.name || !data.type || !data.connection_type) {
      return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
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

    // Verificar se a impressora pertence ao usuário
    const [printerRows] = await connection.execute(
      'SELECT id FROM printers WHERE id = ? AND user_id = ?',
      [data.id, user.id]
    );

    if (!Array.isArray(printerRows) || printerRows.length === 0) {
      return NextResponse.json({ error: 'Impressora não encontrada' }, { status: 404 });
    }

    // Se esta impressora for marcada como padrão, desmarcar outras
    if (data.is_default) {
      await connection.execute(
        'UPDATE printers SET is_default = FALSE WHERE user_id = ? AND id != ?',
        [user.id, data.id]
      );
    }

    // Atualizar impressora
    await connection.execute(
      `UPDATE printers SET 
        name = ?, type = ?, connection_type = ?, ip_address = ?, port = ?, device_path = ?,
        paper_width = ?, paper_height = ?, characters_per_line = ?, font_size = ?,
        is_default = ?, is_active = ?, settings = ?
      WHERE id = ? AND user_id = ?`,
      [
        data.name,
        data.type,
        data.connection_type,
        data.ip_address || null,
        data.port || null,
        data.device_path || null,
        data.paper_width,
        data.paper_height || null,
        data.characters_per_line || null,
        data.font_size || null,
        data.is_default,
        data.is_active,
        JSON.stringify(data.settings),
        data.id,
        user.id
      ]
    );

    await connection.end();
    return NextResponse.json({ message: 'Impressora atualizada com sucesso' });

  } catch (error) {
    console.error('Erro ao atualizar impressora:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Remover configuração de impressora
export async function DELETE(request: Request) {
  let connection;
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 });
    }

    const url = new URL(request.url);
    const printerId = url.searchParams.get('id');

    if (!printerId) {
      return NextResponse.json({ error: 'ID da impressora não fornecido' }, { status: 400 });
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

    // Verificar se a impressora pertence ao usuário
    const [printerRows] = await connection.execute(
      'SELECT id FROM printers WHERE id = ? AND user_id = ?',
      [printerId, user.id]
    );

    if (!Array.isArray(printerRows) || printerRows.length === 0) {
      return NextResponse.json({ error: 'Impressora não encontrada' }, { status: 404 });
    }

    // Remover impressora
    await connection.execute(
      'DELETE FROM printers WHERE id = ? AND user_id = ?',
      [printerId, user.id]
    );

    await connection.end();
    return NextResponse.json({ message: 'Impressora removida com sucesso' });

  } catch (error) {
    console.error('Erro ao remover impressora:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}