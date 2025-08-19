import { NextRequest, NextResponse } from 'next/server';
import { CertificadoService, CertificadoConfig, CertificadoServiceFactory, CertificadoUtils } from '@/services/certificadoService';

// Instância global do serviço de certificado
let certificadoServiceInstance: CertificadoService | null = null;

/**
 * GET /api/certificado
 * Retorna informações e status do certificado digital
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await handleGetStatus();
      case 'info':
        return await handleGetInfo();
      case 'validar':
        return await handleValidarCertificado();
      default:
        return await handleGetStatus();
    }
  } catch (error) {
    console.error('[API Certificado] Erro no GET:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificado
 * Configura ou atualiza o certificado digital
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'configurar':
        return await handleConfigurarCertificado(body);
      case 'testar':
        return await handleTestarCertificado(body);
      case 'recarregar':
        return await handleRecarregarCertificado();
      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API Certificado] Erro no POST:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/certificado
 * Remove configuração do certificado
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    return await handleRemoverCertificado();
  } catch (error) {
    console.error('[API Certificado] Erro no DELETE:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula requisição de status do certificado
 */
async function handleGetStatus() {
  try {
    if (!certificadoServiceInstance) {
      return NextResponse.json({
        configurado: false,
        status: 'não_configurado',
        mensagem: 'Certificado digital não configurado'
      });
    }

    const statusCertificado = certificadoServiceInstance.verificarStatusCertificado();
    
    return NextResponse.json({
      configurado: true,
      status: statusCertificado.valido ? 'valido' : 'expirado',
      valido: statusCertificado.valido,
      diasRestantes: statusCertificado.diasRestantes,
      alertaVencimento: statusCertificado.alertaVencimento,
      detalhes: statusCertificado.detalhes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao obter status:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status do certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula requisição de informações do certificado
 */
async function handleGetInfo() {
  try {
    if (!certificadoServiceInstance) {
      return NextResponse.json({
        configurado: false,
        mensagem: 'Certificado digital não configurado'
      });
    }

    const info = certificadoServiceInstance.obterInformacoesCertificado();
    
    if (!info) {
      return NextResponse.json({
        configurado: false,
        mensagem: 'Informações do certificado não disponíveis'
      });
    }

    // Remover informações sensíveis
    const infoSegura = {
      tipo: info.tipo,
      cnpj: CertificadoUtils.formatarCNPJ(info.cnpj),
      validade: info.validade,
      ativo: info.ativo,
      carregado: info.carregado,
      arquivo: info.arquivo,
      diasRestantes: CertificadoUtils.calcularDiasVencimento(new Date(info.validade)),
      alertaVencimento: CertificadoUtils.precisaAlertarVencimento(new Date(info.validade))
    };

    return NextResponse.json({
      configurado: true,
      certificado: infoSegura,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao obter informações:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao obter informações do certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula validação do certificado
 */
async function handleValidarCertificado() {
  try {
    if (!certificadoServiceInstance) {
      return NextResponse.json({
        valido: false,
        erro: 'Certificado não configurado'
      });
    }

    const status = certificadoServiceInstance.verificarStatusCertificado();
    
    return NextResponse.json({
      valido: status.valido,
      diasRestantes: status.diasRestantes,
      alertaVencimento: status.alertaVencimento,
      detalhes: status.detalhes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao validar certificado:', error);
    return NextResponse.json(
      { 
        valido: false,
        erro: 'Erro ao validar certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula configuração do certificado
 */
async function handleConfigurarCertificado(body: { config: CertificadoConfig }) {
  try {
    const { config } = body;
    
    // Validar dados de entrada
    if (!config || !config.tipo || !config.nome || !config.senha || !config.cnpj) {
      return NextResponse.json(
        { 
          error: 'Dados de configuração incompletos',
          required: ['tipo', 'nome', 'senha', 'cnpj']
        },
        { status: 400 }
      );
    }

    // Validar tipo de certificado
    if (!['A1', 'A3'].includes(config.tipo)) {
      return NextResponse.json(
        { error: 'Tipo de certificado inválido. Use A1 ou A3' },
        { status: 400 }
      );
    }

    // Validar CNPJ
    if (!CertificadoUtils.validarCNPJ(config.cnpj)) {
      return NextResponse.json(
        { error: 'CNPJ inválido' },
        { status: 400 }
      );
    }

    // Criar configuração
    const certificadoConfig: CertificadoConfig = {
      tipo: config.tipo,
      nome: config.nome,
      senha: config.senha,
      cnpj: config.cnpj.replace(/[^\d]/g, ''), // Limpar formatação
      validade: new Date(config.validade || '2025-12-31'),
      ativo: config.ativo !== false
    };

    // Destruir instância anterior se existir
    if (certificadoServiceInstance) {
      certificadoServiceInstance.destruir();
    }

    // Criar nova instância
    certificadoServiceInstance = CertificadoServiceFactory.criarComConfig(certificadoConfig);
    
    // Inicializar certificado
    const inicializado = await certificadoServiceInstance.inicializar();
    
    if (!inicializado) {
      certificadoServiceInstance = null;
      return NextResponse.json(
        { 
          error: 'Falha ao inicializar certificado',
          details: 'Verifique o arquivo, senha e configurações'
        },
        { status: 400 }
      );
    }

    const info = certificadoServiceInstance.obterInformacoesCertificado();
    
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Certificado configurado com sucesso',
      certificado: {
        tipo: info?.tipo,
        cnpj: CertificadoUtils.formatarCNPJ(info?.cnpj || ''),
        validade: info?.validade,
        arquivo: info?.arquivo
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao configurar certificado:', error);
    
    // Limpar instância em caso de erro
    if (certificadoServiceInstance) {
      certificadoServiceInstance.destruir();
      certificadoServiceInstance = null;
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao configurar certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula teste do certificado
 */
async function handleTestarCertificado(body: { config?: CertificadoConfig; xmlTeste?: string }) {
  try {
    const { xmlTeste } = body;
    
    if (!certificadoServiceInstance) {
      return NextResponse.json(
        { error: 'Certificado não configurado' },
        { status: 400 }
      );
    }

    // XML de teste padrão se não fornecido
    const xmlParaTeste = xmlTeste || `
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35200714200166000166550010000000001123456789">
    <ide>
      <cUF>35</cUF>
      <cNF>12345678</cNF>
      <natOp>Venda</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>1</nNF>
      <dhEmi>2024-01-15T10:30:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>9</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
    </ide>
  </infNFe>
</NFe>`;

    // Testar assinatura
    const resultado = await certificadoServiceInstance.assinarXMLNFe(xmlParaTeste, 'TESTE');
    
    if (!resultado.sucesso) {
      return NextResponse.json(
        { 
          sucesso: false,
          erro: resultado.erro,
          detalhes: resultado.detalhes
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Teste de assinatura realizado com sucesso',
      detalhes: {
        algoritmo: resultado.detalhes?.algoritmo,
        referenceId: resultado.detalhes?.referenceId,
        timestamp: resultado.detalhes?.timestamp,
        tamanhoXmlOriginal: xmlParaTeste.length,
        tamanhoXmlAssinado: resultado.xmlAssinado?.length || 0
      }
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao testar certificado:', error);
    return NextResponse.json(
      { 
        sucesso: false,
        erro: 'Erro ao testar certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula recarregamento do certificado
 */
async function handleRecarregarCertificado() {
  try {
    if (!certificadoServiceInstance) {
      return NextResponse.json(
        { error: 'Certificado não configurado' },
        { status: 400 }
      );
    }

    // Destruir instância atual
    certificadoServiceInstance.destruir();
    
    // Recriar do environment
    certificadoServiceInstance = CertificadoServiceFactory.criarDoEnvironment();
    
    // Reinicializar
    const inicializado = await certificadoServiceInstance.inicializar();
    
    if (!inicializado) {
      certificadoServiceInstance = null;
      return NextResponse.json(
        { 
          error: 'Falha ao recarregar certificado',
          details: 'Verifique as variáveis de ambiente'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Certificado recarregado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao recarregar certificado:', error);
    
    // Limpar instância em caso de erro
    if (certificadoServiceInstance) {
      certificadoServiceInstance.destruir();
      certificadoServiceInstance = null;
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao recarregar certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Manipula remoção do certificado
 */
async function handleRemoverCertificado() {
  try {
    if (certificadoServiceInstance) {
      certificadoServiceInstance.destruir();
      certificadoServiceInstance = null;
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Configuração do certificado removida com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Certificado] Erro ao remover certificado:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao remover certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}



/**
 * Função para inicializar certificado do environment na inicialização do servidor
 */
async function inicializarCertificadoDoEnvironment(): Promise<boolean> {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.CERTIFICADO_NOME || !process.env.CERTIFICADO_SENHA) {
      console.log('[API Certificado] Variáveis de ambiente não configuradas - certificado não será inicializado');
      return false;
    }

    console.log('[API Certificado] Inicializando certificado do environment...');
    
    certificadoServiceInstance = CertificadoServiceFactory.criarDoEnvironment();
    const inicializado = await certificadoServiceInstance.inicializar();
    
    if (inicializado) {
      console.log('[API Certificado] Certificado inicializado com sucesso do environment');
      return true;
    } else {
      console.error('[API Certificado] Falha ao inicializar certificado do environment');
      certificadoServiceInstance = null;
      return false;
    }
  } catch (error) {
    console.error('[API Certificado] Erro ao inicializar certificado do environment:', error);
    certificadoServiceInstance = null;
    return false;
  }
}

// Inicializar certificado automaticamente se as variáveis estiverem configuradas
// COMENTADO: Causava erro na tela branca quando certificado não estava configurado
// if (typeof window === 'undefined') {
//   // Executar apenas no servidor
//   inicializarCertificadoDoEnvironment().catch(error => {
//     console.error('[API Certificado] Erro na inicialização automática:', error);
//   });
// }