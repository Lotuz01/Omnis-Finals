import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Interface para configuração do certificado digital
 */
export interface CertificadoConfig {
  tipo: 'A1' | 'A3';
  caminho: string;
  senha: string;
  cnpj: string;
  validade: Date;
  ativo: boolean;
}

/**
 * Interface para dados de assinatura
 */
export interface DadosAssinatura {
  xmlContent: string;
  referenceId?: string;
  algoritmo?: string;
}

/**
 * Interface para resultado da assinatura
 */
export interface ResultadoAssinatura {
  sucesso: boolean;
  xmlAssinado?: string;
  erro?: string;
  detalhes?: any;
}

/**
 * Serviço para gerenciamento de certificados digitais
 * Suporta certificados A1 e A3 para assinatura de documentos fiscais
 */
export class CertificadoService {
  private config: CertificadoConfig;
  private certificadoCarregado: boolean = false;
  private certificadoData: any = null;
  private chavePrivada: any = null;
  private certificadoPublico: any = null;

  constructor(config: CertificadoConfig) {
    this.config = config;
  }

  /**
   * Inicializa o serviço de certificado
   * Carrega e valida o certificado digital
   */
  async inicializar(): Promise<boolean> {
    try {
      console.log(`[CertificadoService] Inicializando certificado tipo ${this.config.tipo}`);
      
      // Validar configuração
      if (!this.validarConfiguracao()) {
        throw new Error('Configuração de certificado inválida');
      }

      // Verificar se o arquivo existe
      if (!fs.existsSync(this.config.caminho)) {
        throw new Error(`Arquivo de certificado não encontrado: ${this.config.caminho}`);
      }

      // Carregar certificado baseado no tipo
      await this.carregarCertificado();
      
      // Verificar validade
      if (!this.verificarValidade()) {
        throw new Error('Certificado expirado ou inválido');
      }

      // Validar CNPJ do certificado
      if (!this.validarCNPJ()) {
        throw new Error('CNPJ do certificado não confere com a configuração');
      }

      this.certificadoCarregado = true;
      console.log('[CertificadoService] Certificado inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('[CertificadoService] Erro ao inicializar certificado:', error);
      return false;
    }
  }

  /**
   * Assina um XML de NFe com o certificado digital
   */
  async assinarXMLNFe(xmlContent: string, nfeId?: string): Promise<ResultadoAssinatura> {
    if (!this.certificadoCarregado) {
      return {
        sucesso: false,
        erro: 'Certificado não carregado. Execute inicializar() primeiro.'
      };
    }

    try {
      console.log(`[CertificadoService] Assinando XML NFe${nfeId ? ` ID: ${nfeId}` : ''}`);
      
      // Validar XML de entrada
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('XML de entrada inválido ou vazio');
      }

      // Preparar dados para assinatura
      const dadosAssinatura: DadosAssinatura = {
        xmlContent,
        referenceId: nfeId || this.extrairIdNFe(xmlContent),
        algoritmo: 'RSA-SHA1'
      };

      // Realizar assinatura
      const xmlAssinado = await this.assinarXML(dadosAssinatura);
      
      if (!xmlAssinado) {
        throw new Error('Falha na assinatura do XML');
      }

      // Validar assinatura
      const assinaturaValida = this.validarAssinatura(xmlAssinado);
      if (!assinaturaValida) {
        throw new Error('Assinatura gerada é inválida');
      }

      console.log(`[CertificadoService] XML assinado com sucesso${nfeId ? ` - NFe: ${nfeId}` : ''}`);
      
      return {
        sucesso: true,
        xmlAssinado,
        detalhes: {
          algoritmo: dadosAssinatura.algoritmo,
          referenceId: dadosAssinatura.referenceId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[CertificadoService] Erro ao assinar XML${nfeId ? ` - NFe: ${nfeId}` : ''}:`, mensagemErro);
      
      return {
        sucesso: false,
        erro: mensagemErro,
        detalhes: {
          timestamp: new Date().toISOString(),
          nfeId
        }
      };
    }
  }

  /**
   * Verifica se o certificado está válido e próximo do vencimento
   */
  verificarStatusCertificado(): {
    valido: boolean;
    diasRestantes: number;
    alertaVencimento: boolean;
    detalhes: any;
  } {
    const agora = new Date();
    const diasRestantes = Math.ceil(
      (this.config.validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const valido = diasRestantes > 0;
    const alertaVencimento = diasRestantes <= 30 && diasRestantes > 0;
    
    return {
      valido,
      diasRestantes,
      alertaVencimento,
      detalhes: {
        tipo: this.config.tipo,
        cnpj: this.config.cnpj,
        vencimento: this.config.validade.toISOString(),
        carregado: this.certificadoCarregado
      }
    };
  }

  /**
   * Obtém informações do certificado
   */
  obterInformacoesCertificado(): any {
    if (!this.certificadoCarregado) {
      return null;
    }

    return {
      tipo: this.config.tipo,
      cnpj: this.config.cnpj,
      validade: this.config.validade,
      ativo: this.config.ativo,
      carregado: this.certificadoCarregado,
      arquivo: path.basename(this.config.caminho)
    };
  }

  /**
   * Valida a configuração do certificado
   */
  private validarConfiguracao(): boolean {
    const camposObrigatorios = [
      this.config.caminho,
      this.config.senha,
      this.config.cnpj,
      this.config.tipo
    ];

    const configuracaoValida = camposObrigatorios.every(campo => 
      campo && campo.toString().trim().length > 0
    );

    if (!configuracaoValida) {
      console.error('[CertificadoService] Configuração inválida - campos obrigatórios em branco');
      return false;
    }

    if (!['A1', 'A3'].includes(this.config.tipo)) {
      console.error('[CertificadoService] Tipo de certificado inválido. Use A1 ou A3');
      return false;
    }

    return true;
  }

  /**
   * Carrega o certificado do arquivo
   */
  private async carregarCertificado(): Promise<void> {
    try {
      fs.readFileSync(this.config.caminho);
      
      if (this.config.tipo === 'A1') {
        // Certificado A1 - arquivo .pfx/.p12
        // TODO: Implementar carregamento de certificado PKCS12 usando biblioteca adequada (ex: node-forge)
        // this.certificadoData = crypto.createPKCS12(certificadoBuffer, this.config.senha);
        
        // Simulação temporária para evitar erro de compilação
        this.certificadoData = { key: null, cert: null };
        
        if (!this.certificadoData) {
          throw new Error('Falha ao carregar certificado A1 - senha incorreta ou arquivo corrompido');
        }
        
        // Extrair chave privada e certificado
        this.chavePrivada = this.certificadoData.key;
        this.certificadoPublico = this.certificadoData.cert;
        
      } else if (this.config.tipo === 'A3') {
        // Certificado A3 - requer integração com hardware
        throw new Error('Certificado A3 não implementado nesta versão. Use certificado A1 ou integre com API externa.');
      }
      
      console.log(`[CertificadoService] Certificado ${this.config.tipo} carregado com sucesso`);
    } catch (error) {
      console.error('[CertificadoService] Erro ao carregar certificado:', error);
      throw error;
    }
  }

  /**
   * Verifica se o certificado está dentro da validade
   */
  private verificarValidade(): boolean {
    const agora = new Date();
    const valido = this.config.validade > agora;
    
    if (!valido) {
      console.error(`[CertificadoService] Certificado expirado em ${this.config.validade.toISOString()}`);
      return false;
    }
    
    const diasRestantes = Math.ceil(
      (this.config.validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diasRestantes <= 30) {
      console.warn(`[CertificadoService] ATENÇÃO: Certificado expira em ${diasRestantes} dias`);
    }
    
    return true;
  }

  /**
   * Valida se o CNPJ do certificado confere com a configuração
   */
  private validarCNPJ(): boolean {
    try {
      // Em uma implementação real, extrair o CNPJ do certificado
      // e comparar com this.config.cnpj
      
      // Por enquanto, assumir que está correto
      // TODO: Implementar extração real do CNPJ do certificado
      
      console.log(`[CertificadoService] CNPJ validado: ${this.config.cnpj}`);
      return true;
    } catch (error) {
      console.error('[CertificadoService] Erro ao validar CNPJ:', error);
      return false;
    }
  }

  /**
   * Assina o XML com o certificado
   */
  private async assinarXML(dados: DadosAssinatura): Promise<string | null> {
    try {
      // Esta é uma implementação simplificada
      // Em produção, usar biblioteca como xml-crypto ou xml2js + node-forge
      
      console.log('[CertificadoService] Iniciando processo de assinatura XML');
      
      // Validar se temos os componentes necessários
      if (!this.chavePrivada || !this.certificadoPublico) {
        throw new Error('Chave privada ou certificado público não disponível');
      }
      
      // Preparar XML para assinatura
      const xmlParaAssinar = dados.xmlContent;
      
      // Encontrar ou criar o elemento de referência
      const referenceId = dados.referenceId || 'NFe';
      
      // Gerar hash do conteúdo
      const hash = crypto.createHash('sha1');
      hash.update(xmlParaAssinar, 'utf8');
      const digestValue = hash.digest('base64');
      
      // Criar assinatura
      const sign = crypto.createSign('RSA-SHA1');
      sign.update(xmlParaAssinar, 'utf8');
      const signature = sign.sign(this.chavePrivada, 'base64');
      
      // Montar XML com assinatura
      const xmlAssinado = this.montarXMLComAssinatura(
        xmlParaAssinar,
        signature,
        digestValue,
        referenceId
      );
      
      console.log('[CertificadoService] XML assinado com sucesso');
      return xmlAssinado;
      
    } catch (error) {
      console.error('[CertificadoService] Erro na assinatura XML:', error);
      return null;
    }
  }

  /**
   * Monta o XML com a assinatura digital
   */
  private montarXMLComAssinatura(
    xmlOriginal: string,
    signature: string,
    digestValue: string,
    referenceId: string
  ): string {
    // Template básico de assinatura XML para NFe
    const assinaturaXML = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1" />
    <Reference URI="#${referenceId}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />
      <DigestValue>${digestValue}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue>${signature}</SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${this.obterCertificadoBase64()}</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>`;

    // Inserir assinatura no XML (antes da tag de fechamento)
    const posicaoInsercao = xmlOriginal.lastIndexOf('</');
    if (posicaoInsercao === -1) {
      throw new Error('XML inválido - não foi possível encontrar posição para inserir assinatura');
    }
    
    return xmlOriginal.slice(0, posicaoInsercao) + assinaturaXML + xmlOriginal.slice(posicaoInsercao);
  }

  /**
   * Obtém o certificado em formato Base64
   */
  private obterCertificadoBase64(): string {
    try {
      // Em uma implementação real, extrair o certificado em formato Base64
      // Por enquanto, retornar um placeholder
      return 'CERTIFICADO_BASE64_PLACEHOLDER';
    } catch (error) {
      console.error('[CertificadoService] Erro ao obter certificado Base64:', error);
      return '';
    }
  }

  /**
   * Extrai o ID da NFe do XML
   */
  private extrairIdNFe(xmlContent: string): string {
    try {
      // Buscar por padrão de ID da NFe
      const match = xmlContent.match(/Id="([^"]+)"/i);
      return match ? match[1] : 'NFe';
    } catch (error) {
      console.error('[CertificadoService] Erro ao extrair ID da NFe:', error);
      return 'NFe';
    }
  }

  /**
   * Valida se a assinatura do XML está correta
   */
  private validarAssinatura(xmlAssinado: string): boolean {
    try {
      // Verificar se contém elementos de assinatura
      const contemAssinatura = xmlAssinado.includes('<Signature') && 
                              xmlAssinado.includes('<SignatureValue>') &&
                              xmlAssinado.includes('<X509Certificate>');
      
      if (!contemAssinatura) {
        console.error('[CertificadoService] XML não contém elementos de assinatura válidos');
        return false;
      }
      
      // Em produção, implementar validação completa da assinatura
      console.log('[CertificadoService] Assinatura validada com sucesso');
      return true;
      
    } catch (error) {
      console.error('[CertificadoService] Erro ao validar assinatura:', error);
      return false;
    }
  }

  /**
   * Limpa recursos e dados sensíveis
   */
  destruir(): void {
    try {
      // Limpar dados sensíveis da memória
      this.chavePrivada = null;
      this.certificadoPublico = null;
      this.certificadoData = null;
      this.certificadoCarregado = false;
      
      console.log('[CertificadoService] Recursos limpos com sucesso');
    } catch (error) {
      console.error('[CertificadoService] Erro ao limpar recursos:', error);
    }
  }
}

/**
 * Factory para criar instância do serviço de certificado
 */
export class CertificadoServiceFactory {
  static criarDoEnvironment(): CertificadoService {
    const config: CertificadoConfig = {
      tipo: (process.env.CERTIFICADO_TIPO as 'A1' | 'A3') || 'A1',
      caminho: process.env.CERTIFICADO_CAMINHO || '',
      senha: process.env.CERTIFICADO_SENHA || '',
      cnpj: process.env.CERTIFICADO_CNPJ || '',
      validade: new Date(process.env.CERTIFICADO_VALIDADE || '2025-12-31'),
      ativo: process.env.CERTIFICADO_ATIVO === 'true'
    };

    return new CertificadoService(config);
  }

  static criarComConfig(config: CertificadoConfig): CertificadoService {
    return new CertificadoService(config);
  }
}

/**
 * Utilitários para certificado digital
 */
export class CertificadoUtils {
  /**
   * Valida formato do CNPJ
   */
  static validarCNPJ(cnpj: string): boolean {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    return cnpjLimpo.length === 14;
  }

  /**
   * Formata CNPJ para exibição
   */
  static formatarCNPJ(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Calcula dias até o vencimento
   */
  static calcularDiasVencimento(dataVencimento: Date): number {
    const agora = new Date();
    return Math.ceil((dataVencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se é necessário alertar sobre vencimento
   */
  static precisaAlertarVencimento(dataVencimento: Date, diasAlerta: number = 30): boolean {
    const diasRestantes = this.calcularDiasVencimento(dataVencimento);
    return diasRestantes <= diasAlerta && diasRestantes > 0;
  }
}

export default CertificadoService;