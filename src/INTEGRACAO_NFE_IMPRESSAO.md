# Integração NFe com Sistema de Impressão e Certificado Digital

Este documento descreve como funciona a integração entre o sistema de Nota Fiscal Eletrônica (NFe), sistema de impressão e certificado digital.

## Funcionalidades Implementadas

### 1. Impressão Manual de NFe

- **Localização**: Página de listagem de NFes (`/nfe`)
- **Como usar**: 
  - Acesse a aba "Listagem" na página de NFe
  - Clique no botão "🖨️ Imprimir" ao lado de qualquer NFe emitida
  - A NFe será enviada para a impressora padrão configurada

### 2. Impressão Automática

- **Localização**: Formulário de emissão de NFe
- **Como usar**:
  - No formulário de emissão, marque a opção "Imprimir automaticamente após emissão"
  - Após a NFe ser emitida com sucesso, ela será automaticamente enviada para impressão
  - Útil para fluxos de trabalho onde sempre é necessário imprimir a NFe

## Formato de Impressão

A impressão da NFe inclui:

- **Cabeçalho**: "NOTA FISCAL ELETRÔNICA"
- **Número da NFe**: Número sequencial da nota
- **Chave de Acesso**: Chave de 44 dígitos (quebrada em linhas para melhor visualização)
- **Dados do Cliente**: Nome e CNPJ
- **Informações da Operação**: Tipo de operação e data/hora
- **Valor Total**: Valor total da NFe em destaque
- **Status**: Status atual da NFe
- **Rodapé**: Informações sobre ser uma via simplificada

## Configuração de Impressoras

Para usar a funcionalidade de impressão de NFe:

1. **Configure uma impressora**:
   - Acesse "Configuração de Impressoras" no menu
   - Adicione pelo menos uma impressora
   - Marque uma como padrão

2. **Tipos de impressora suportados**:
   - Térmica (recomendada para cupons)
   - Matricial
   - Laser
   - Jato de tinta

## Estados de Impressão

- **⏳ Imprimindo...**: Impressão em andamento
- **🖨️ Imprimir**: Pronto para imprimir
- **Sucesso**: "NFe enviada para impressão com sucesso!"
- **Erro**: Mensagem específica do erro ocorrido

## Logs de Impressão

Todas as impressões de NFe são registradas nos logs de impressão:

- **Localização**: Aba "Logs de Impressão" na página de impressoras
- **Informações registradas**:
  - Data e hora da impressão
  - Impressora utilizada
  - Tipo de documento (NFe)
  - Status da impressão
  - Preview do conteúdo

## Tratamento de Erros

### Erros Comuns:

1. **"Nenhuma impressora configurada"**:
   - Configure pelo menos uma impressora no sistema

2. **"Impressora não encontrada"**:
   - Verifique se a impressora está ativa e conectada
   - Reconfigure a impressora se necessário

3. **"Erro de conexão"**:
   - Para impressoras de rede: verifique IP e porta
   - Para impressoras USB: verifique conexão física

4. **"Erro na impressão automática"**:
   - A NFe foi emitida com sucesso, mas houve falha na impressão
   - Use a impressão manual como alternativa

## API de Impressão

### Endpoint: `POST /api/print`

```json
{
  "document_type": "nfe",
  "content": {
    "nfe_number": "000000001",
    "client_name": "Cliente Exemplo LTDA",
    "cnpj": "12.345.678/0001-90",
    "total_amount": 1500.00,
    "status": "emitida",
    "created_at": "2024-01-15T10:30:00Z",
    "access_key": "12345678901234567890123456789012345678901234",
    "operation_type": "Venda"
  },
  "copies": 1
}
```

### Resposta de Sucesso:
```json
{
  "success": true,
  "message": "Documento enviado para impressão",
  "job_id": "print_job_123",
  "printer_used": "Impressora Térmica Principal"
}
```

### Resposta de Erro:
```json
{
  "success": false,
  "message": "Nenhuma impressora configurada"
}
```

## Considerações Técnicas

- A impressão é assíncrona - o sistema envia para a fila de impressão
- Suporte a múltiplas cópias
- Formatação automática baseada no tipo de impressora
- Logs detalhados para auditoria
- Tratamento robusto de erros

## Integração com Certificado Digital

### Funcionalidades Implementadas

#### 1. Configuração de Certificado
- **Página de Configuração**: `/certificado`
- **Tipos Suportados**: A1 (arquivo .pfx/.p12)
- **Validação**: CNPJ, validade, senha
- **Status em Tempo Real**: Dias restantes, alertas de vencimento

#### 2. Assinatura Automática de NFe
- **Integração Transparente**: XML assinado automaticamente após emissão
- **Validação de Assinatura**: Verificação da integridade do XML assinado
- **Logs Detalhados**: Rastreamento completo do processo de assinatura

#### 3. API de Certificado
- **GET /api/certificado**: Status e informações do certificado
- **POST /api/certificado**: Configurar, testar, recarregar certificado
- **DELETE /api/certificado**: Remover configuração

#### 4. Segurança
- **Dados Sensíveis**: Senha e chave privada mantidas em memória apenas durante uso
- **Validação de CNPJ**: Verificação de correspondência com emitente
- **Alertas de Vencimento**: Notificações 30 dias antes do vencimento

### Configuração via Environment

```env
# Certificado Digital
CERTIFICADO_TIPO=A1
CERTIFICADO_CAMINHO=C:\\certificados\\certificado.pfx
CERTIFICADO_SENHA=senha_do_certificado
CERTIFICADO_CNPJ=00000000000000
CERTIFICADO_VALIDADE=2025-12-31
CERTIFICADO_ATIVO=true
```

### Fluxo de Assinatura

1. **Emissão da NFe**: API externa gera XML
2. **Download do XML**: Sistema baixa XML da API
3. **Assinatura Digital**: Certificado assina o XML localmente
4. **Validação**: Verificação da integridade da assinatura
5. **Armazenamento**: XML assinado salvo para auditoria

### Monitoramento

- **Status do Certificado**: Válido/Expirado/Não Configurado
- **Dias Restantes**: Contagem regressiva até vencimento
- **Logs de Assinatura**: Registro de todas as operações
- **Alertas**: Notificações de problemas ou vencimento

## Próximas Melhorias

### Sistema de Impressão
- [ ] Seleção de impressora específica por NFe
- [ ] Templates personalizáveis de impressão
- [ ] Impressão de itens detalhados da NFe
- [ ] Integração com código de barras/QR Code
- [ ] Impressão em lote de múltiplas NFes
- [ ] Configuração de impressão por tipo de cliente

### Certificado Digital
- [ ] Implementar suporte a certificado A3 (token/cartão)
- [ ] Adicionar renovação automática de certificado
- [ ] Implementar backup seguro de certificados
- [ ] Adicionar suporte a múltiplos certificados
- [ ] Implementar assinatura em lote
- [ ] Adicionar validação de cadeia de certificação
- [ ] Implementar HSM (Hardware Security Module)