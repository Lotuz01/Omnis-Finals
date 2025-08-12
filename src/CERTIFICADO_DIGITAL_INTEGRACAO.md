# Certificado Digital - Autenticação e Integração

## Visão Geral

O certificado digital é um documento eletrônico que funciona como uma identidade digital para pessoas físicas e jurídicas no ambiente virtual. <mcreference link="https://www.vhsys.com.br/emissor-nota-fiscal/certificado-digital-gratuito/" index="1">1</mcreference> Ele garante autenticidade, confidencialidade e integridade nas operações digitais, atribuindo validade jurídica aos documentos eletrônicos.

## Tipos de Certificado Digital

### Certificado A1
- **Armazenamento**: Software (arquivo digital) <mcreference link="https://www.vhsys.com.br/emissor-nota-fiscal/certificado-digital-gratuito/" index="1">1</mcreference>
- **Instalação**: Computador ou dispositivo móvel (smartphone/tablet)
- **Validade**: 1 ano <mcreference link="https://www.gov.br/pt-br/servicos/obter-certificacao-digital" index="3">3</mcreference>
- **Custo**: Geralmente menor
- **Backup**: Pode ser copiado para outros computadores <mcreference link="https://www.gov.br/pt-br/servicos/obter-certificacao-digital" index="3">3</mcreference>
- **Uso**: Ideal para sistemas em nuvem e APIs

### Certificado A3
- **Armazenamento**: Hardware (token USB ou cartão com leitor) <mcreference link="https://www.vhsys.com.br/emissor-nota-fiscal/certificado-digital-gratuito/" index="1">1</mcreference>
- **Validade**: 1 a 5 anos <mcreference link="https://www.gov.br/pt-br/servicos/obter-certificacao-digital" index="3">3</mcreference>
- **Segurança**: Alta camada de criptografia e proteção por senha
- **Mobilidade**: Requer hardware físico conectado
- **Uso**: Necessário para SPED Contábil, DOI e outras operações específicas

## Integração com NFe

### Requisitos Técnicos

Para emissão de NFe, o certificado digital deve: <mcreference link="https://portalsped.fazenda.mg.gov.br/spedmg/nfe/Perguntas-Frequentes/respostas_vi/index.html" index="5">5</mcreference>

- Ser emitido por Autoridade Certificadora credenciada pela ICP-Brasil
- Conter CNPJ no campo OtherName OID = 2.16.76.1.3.3
- Ou conter CPF no campo OtherName OID = 2.16.76.1.3.1 (para produtores rurais)
- Seguir padrão ICP-Brasil para garantir validade jurídica

### Processo de Assinatura Digital

1. **Geração do XML**: Documento NFe no formato XML UTF-8 <mcreference link="https://blog.tecnospeed.com.br/nf-e-em-node-js/" index="1">1</mcreference>
2. **Assinatura Digital**: Utilização do certificado para assinar o XML
3. **Validação**: Verificação da integridade e autoria do documento
4. **Transmissão**: Envio para SEFAZ via Web Services SOAP 1.2 <mcreference link="https://blog.tecnospeed.com.br/nf-e-em-node-js/" index="1">1</mcreference>

## Implementação em Node.js

### Bibliotecas Recomendadas

```javascript
// Principais bibliotecas para manipulação de certificados
const crypto = require('crypto');
const fs = require('fs');
const xmlCrypto = require('xml-crypto');
```

### Estrutura de Implementação

```javascript
// Exemplo de estrutura para certificado A1
class CertificadoDigital {
  constructor(certificadoPath, senha) {
    this.certificadoPath = certificadoPath;
    this.senha = senha;
    this.certificado = null;
    this.chavePrivada = null;
  }

  async carregarCertificado() {
    try {
      // Carregar certificado .pfx/.p12
      const certificadoBuffer = fs.readFileSync(this.certificadoPath);
      
      // Converter para formato PEM se necessário
      // Implementar lógica de conversão
      
      return true;
    } catch (error) {
      console.error('Erro ao carregar certificado:', error);
      return false;
    }
  }

  assinarXML(xmlContent) {
    try {
      // Implementar assinatura XML usando xml-crypto
      const sig = new xmlCrypto.SignedXml();
      sig.addReference("//*[local-name(.)='infNFe']");
      sig.signingKey = this.chavePrivada;
      sig.computeSignature(xmlContent);
      
      return sig.getSignedXml();
    } catch (error) {
      console.error('Erro ao assinar XML:', error);
      return null;
    }
  }

  validarCertificado() {
    // Verificar validade do certificado
    // Verificar data de expiração
    // Verificar cadeia de certificação
    return true;
  }
}
```

## Integração com o Sistema Atual

### Estrutura de Arquivos

```
src/
├── services/
│   ├── certificadoService.ts     # Novo serviço para certificados
│   └── nfeService.ts            # Serviço existente de NFe
├── utils/
│   ├── crypto.ts                # Utilitários de criptografia
│   └── xmlSigner.ts             # Assinador de XML
└── config/
    └── certificado.ts           # Configurações de certificado
```

### Configuração do Certificado

```typescript
// src/config/certificado.ts
export interface CertificadoConfig {
  tipo: 'A1' | 'A3';
  caminho: string;
  senha: string;
  cnpj: string;
  validade: Date;
  ativo: boolean;
}

export const certificadoConfig: CertificadoConfig = {
  tipo: process.env.CERTIFICADO_TIPO as 'A1' | 'A3' || 'A1',
  caminho: process.env.CERTIFICADO_CAMINHO || '',
  senha: process.env.CERTIFICADO_SENHA || '',
  cnpj: process.env.CERTIFICADO_CNPJ || '',
  validade: new Date(process.env.CERTIFICADO_VALIDADE || ''),
  ativo: process.env.CERTIFICADO_ATIVO === 'true'
};
```

### Serviço de Certificado

```typescript
// src/services/certificadoService.ts
import { CertificadoConfig } from '../config/certificado';

export class CertificadoService {
  private config: CertificadoConfig;
  private certificadoCarregado: boolean = false;

  constructor(config: CertificadoConfig) {
    this.config = config;
  }

  async inicializar(): Promise<boolean> {
    try {
      // Validar configuração
      if (!this.validarConfiguracao()) {
        throw new Error('Configuração de certificado inválida');
      }

      // Carregar certificado
      await this.carregarCertificado();
      
      // Verificar validade
      if (!this.verificarValidade()) {
        throw new Error('Certificado expirado ou inválido');
      }

      this.certificadoCarregado = true;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar certificado:', error);
      return false;
    }
  }

  async assinarXMLNFe(xmlContent: string): Promise<string | null> {
    if (!this.certificadoCarregado) {
      throw new Error('Certificado não carregado');
    }

    try {
      // Implementar assinatura específica para NFe
      return this.assinarXML(xmlContent);
    } catch (error) {
      console.error('Erro ao assinar XML NFe:', error);
      return null;
    }
  }

  private validarConfiguracao(): boolean {
    return !!(this.config.caminho && this.config.senha && this.config.cnpj);
  }

  private async carregarCertificado(): Promise<void> {
    // Implementar carregamento baseado no tipo (A1/A3)
  }

  private verificarValidade(): boolean {
    const agora = new Date();
    return this.config.validade > agora;
  }

  private assinarXML(xmlContent: string): string {
    // Implementar assinatura XML
    return xmlContent; // Placeholder
  }
}
```

## Integração com API de NFe

### Modificação da Rota NFe

```typescript
// src/app/api/nfe/route.ts - Adições necessárias
import { CertificadoService } from '../../../services/certificadoService';
import { certificadoConfig } from '../../../config/certificado';

const certificadoService = new CertificadoService(certificadoConfig);

export async function POST(request: Request) {
  try {
    // Inicializar certificado se necessário
    if (!await certificadoService.inicializar()) {
      return NextResponse.json(
        { error: 'Erro ao inicializar certificado digital' },
        { status: 500 }
      );
    }

    // Gerar XML da NFe
    const xmlNFe = await gerarXMLNFe(dadosNFe);
    
    // Assinar XML com certificado
    const xmlAssinado = await certificadoService.assinarXMLNFe(xmlNFe);
    
    if (!xmlAssinado) {
      return NextResponse.json(
        { error: 'Erro ao assinar NFe' },
        { status: 500 }
      );
    }

    // Enviar para SEFAZ
    const resultado = await enviarParaSEFAZ(xmlAssinado);
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro na emissão de NFe:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

## Configuração de Ambiente

### Variáveis de Ambiente

```bash
# .env.local

# Configurações do Certificado Digital
CERTIFICADO_TIPO=A1
CERTIFICADO_CAMINHO=/path/to/certificado.pfx
CERTIFICADO_SENHA=senha_do_certificado
CERTIFICADO_CNPJ=12345678000199
CERTIFICADO_VALIDADE=2025-12-31
CERTIFICADO_ATIVO=true

# URLs da SEFAZ (Homologação/Produção)
SEFAZ_AMBIENTE=homologacao
SEFAZ_URL_HOMOLOGACAO=https://hom.sefaz.rs.gov.br/ws/nferecepcao/NfeRecepcao2.asmx
SEFAZ_URL_PRODUCAO=https://nfe.sefaz.rs.gov.br/ws/nferecepcao/NfeRecepcao2.asmx
```

## Segurança e Boas Práticas

### Armazenamento Seguro

1. **Certificados A1**: Armazenar em local seguro com permissões restritas
2. **Senhas**: Usar variáveis de ambiente ou cofres de senhas
3. **Backup**: Manter cópias de segurança dos certificados
4. **Rotação**: Renovar certificados antes do vencimento

### Validações Importantes

```typescript
// Validações de segurança
class ValidadorCertificado {
  static validarVencimento(dataVencimento: Date): boolean {
    const agora = new Date();
    const diasRestantes = Math.ceil(
      (dataVencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diasRestantes <= 0) {
      throw new Error('Certificado expirado');
    }
    
    if (diasRestantes <= 30) {
      console.warn(`Certificado expira em ${diasRestantes} dias`);
    }
    
    return true;
  }

  static validarCNPJ(certificado: any, cnpjEsperado: string): boolean {
    // Extrair CNPJ do certificado e validar
    const cnpjCertificado = this.extrairCNPJDoCertificado(certificado);
    return cnpjCertificado === cnpjEsperado;
  }

  private static extrairCNPJDoCertificado(certificado: any): string {
    // Implementar extração do CNPJ do campo OtherName OID
    return '';
  }
}
```

## Monitoramento e Logs

### Sistema de Logs

```typescript
// src/utils/certificadoLogger.ts
export class CertificadoLogger {
  static logInicializacao(sucesso: boolean, detalhes?: string) {
    const timestamp = new Date().toISOString();
    const status = sucesso ? 'SUCESSO' : 'ERRO';
    
    console.log(`[${timestamp}] CERTIFICADO_INIT: ${status} - ${detalhes || ''}`);
  }

  static logAssinatura(nfeId: string, sucesso: boolean, erro?: string) {
    const timestamp = new Date().toISOString();
    const status = sucesso ? 'SUCESSO' : 'ERRO';
    
    console.log(`[${timestamp}] CERTIFICADO_ASSINATURA: ${status} - NFe: ${nfeId} - ${erro || ''}`);
  }

  static logValidacao(tipo: string, resultado: boolean, detalhes?: string) {
    const timestamp = new Date().toISOString();
    const status = resultado ? 'VALIDO' : 'INVALIDO';
    
    console.log(`[${timestamp}] CERTIFICADO_VALIDACAO: ${tipo} - ${status} - ${detalhes || ''}`);
  }
}
```

## Testes e Validação

### Ambiente de Homologação

1. **SEFAZ Homologação**: Usar ambiente de testes da SEFAZ
2. **Certificado de Teste**: Utilizar certificados específicos para homologação
3. **Dados Fictícios**: NFes com dados de teste conforme orientação da SEFAZ

### Testes Automatizados

```typescript
// tests/certificado.test.ts
describe('CertificadoService', () => {
  test('deve carregar certificado A1 válido', async () => {
    const service = new CertificadoService(certificadoConfigTeste);
    const resultado = await service.inicializar();
    expect(resultado).toBe(true);
  });

  test('deve assinar XML corretamente', async () => {
    const service = new CertificadoService(certificadoConfigTeste);
    await service.inicializar();
    
    const xmlTeste = '<nfe>...</nfe>';
    const xmlAssinado = await service.assinarXMLNFe(xmlTeste);
    
    expect(xmlAssinado).toContain('<Signature>');
  });

  test('deve detectar certificado expirado', () => {
    const configExpirado = { ...certificadoConfigTeste };
    configExpirado.validade = new Date('2020-01-01');
    
    expect(() => {
      ValidadorCertificado.validarVencimento(configExpirado.validade);
    }).toThrow('Certificado expirado');
  });
});
```

## Próximos Passos

### Implementação Prioritária

1. **Criar serviço de certificado** (`CertificadoService`)
2. **Implementar assinatura XML** para NFe
3. **Integrar com API existente** de NFe
4. **Configurar variáveis de ambiente**
5. **Implementar validações de segurança**
6. **Criar testes automatizados**

### Melhorias Futuras

1. **Interface de gerenciamento** de certificados
2. **Notificações de vencimento** automáticas
3. **Suporte a múltiplos certificados**
4. **Integração com HSM** (Hardware Security Module)
5. **Auditoria completa** de operações
6. **Dashboard de monitoramento**

## Considerações Legais

- **ICP-Brasil**: Todos os certificados devem ser emitidos por AC credenciada <mcreference link="https://portalsped.fazenda.mg.gov.br/spedmg/nfe/Perguntas-Frequentes/respostas_vi/index.html" index="5">5</mcreference>
- **Validade Jurídica**: Documentos assinados têm presunção de veracidade <mcreference link="https://portalsped.fazenda.mg.gov.br/spedmg/nfe/Perguntas-Frequentes/respostas_vi/index.html" index="5">5</mcreference>
- **Responsabilidade**: Titular do certificado é responsável por seu uso
- **Renovação**: Processo deve ser iniciado antes do vencimento

## Fornecedores Recomendados

### Autoridades Certificadoras

- **Certisign**: Líder de mercado, integração facilitada <mcreference link="https://certisign.com.br/certificados" index="2">2</mcreference>
- **Serpro**: Órgão governamental, preços competitivos
- **Receita Federal**: Certificados oficiais
- **Caixa Econômica**: Opção bancária
- **Serasa**: Integração com serviços financeiros

### APIs de Terceiros

- **Focus NFe**: API especializada, suporte A1 <mcreference link="https://focusnfe.com.br/" index="5">5</mcreference>
- **WebmaniaBR**: Solução completa para NFe <mcreference link="https://github.com/webmaniabr/NFe-NodeJS" index="3">3</mcreference>
- **TecnoSpeed PlugNotas**: Reduz 80% do tempo de desenvolvimento <mcreference link="https://blog.tecnospeed.com.br/nf-e-em-node-js/" index="1">1</mcreference>

---

*Este documento serve como guia para implementação de certificado digital no sistema PDV. Para implementação completa, consulte a documentação técnica específica de cada componente e as normas atualizadas da SEFAZ.*