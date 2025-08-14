'use client';

import { useState, useEffect } from 'react';
import { useConfirmation } from '@/components/ui/confirmation-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Upload, Settings, Shield, RefreshCw, Trash2 } from 'lucide-react';

interface CertificadoDetalhes {
  emissor?: string;
  serie?: string;
  algoritmo?: string;
  uso?: string[];
  [key: string]: unknown;
}

interface CertificadoStatus {
  configurado: boolean;
  status: string;
  valido: boolean;
  diasRestantes: number;
  alertaVencimento: boolean;
  detalhes: CertificadoDetalhes;
}

interface CertificadoInfo {
  configurado: boolean;
  certificado?: {
    tipo: string;
    cnpj: string;
    validade: string;
    ativo: boolean;
    carregado: boolean;
    arquivo: string;
    diasRestantes: number;
    alertaVencimento: boolean;
  };
}

interface CertificadoConfig {
  tipo: 'A1' | 'A3';
  caminho: string;
  senha: string;
  cnpj: string;
  validade: string;
  ativo: boolean;
}

export default function CertificadoPage() {
  const [status, setStatus] = useState<CertificadoStatus | null>(null);
  const [info, setInfo] = useState<CertificadoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<CertificadoConfig>({
    tipo: 'A1',
    caminho: '',
    senha: '',
    cnpj: '',
    validade: '',
    ativo: true
  });
  const { confirm, ConfirmationComponent } = useConfirmation();

  // Carregar status e informações do certificado
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar status
      const statusResponse = await fetch('/api/certificado?action=status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
      }
      
      // Carregar informações
      const infoResponse = await fetch('/api/certificado?action=info');
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setInfo(infoData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do certificado:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados do certificado' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigurar = async () => {
    if (!config.caminho || !config.senha || !config.cnpj) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/certificado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'configurar',
          config
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: result.mensagem || 'Certificado configurado com sucesso' });
        setShowConfig(false);
        await carregarDados();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao configurar certificado' });
      }
    } catch (error) {
      console.error('Erro ao configurar certificado:', error);
      setMessage({ type: 'error', text: 'Erro ao configurar certificado' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestar = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/certificado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'testar'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.sucesso) {
        setMessage({ type: 'success', text: 'Teste de assinatura realizado com sucesso!' });
      } else {
        setMessage({ type: 'error', text: result.erro || 'Erro no teste de assinatura' });
      }
    } catch (error) {
      console.error('Erro ao testar certificado:', error);
      setMessage({ type: 'error', text: 'Erro ao testar certificado' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecarregar = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/certificado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'recarregar'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: result.mensagem || 'Certificado recarregado com sucesso' });
        await carregarDados();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao recarregar certificado' });
      }
    } catch (error) {
      console.error('Erro ao recarregar certificado:', error);
      setMessage({ type: 'error', text: 'Erro ao recarregar certificado' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async () => {
    const confirmed = await confirm({
      title: 'Remover Certificado',
      message: 'Tem certeza que deseja remover a configuração do certificado?',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'destructive'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/certificado', {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: result.mensagem || 'Certificado removido com sucesso' });
        await carregarDados();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao remover certificado' });
      }
    } catch (error) {
      console.error('Erro ao remover certificado:', error);
      setMessage({ type: 'error', text: 'Erro ao remover certificado' });
    } finally {
      setLoading(false);
    }
  };

  const formatarCNPJ = (cnpj: string) => {
    const apenasNumeros = cnpj.replace(/\D/g, '');
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valido': return 'bg-green-100 text-green-800';
      case 'expirado': return 'bg-red-100 text-red-800';
      case 'não_configurado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valido': return <CheckCircle className="h-4 w-4" />;
      case 'expirado': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            Certificado Digital
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Configure e gerencie seu certificado digital para assinatura de NFe
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={carregarDados}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          {!status?.configurado && (
            <Button onClick={() => setShowConfig(true)} className="w-full sm:w-auto">
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : message.type === 'success' ? 'text-green-800' : 'text-blue-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Status do Certificado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status do Certificado
            {status && getStatusIcon(status.status)}
          </CardTitle>
          <CardDescription>
            Informações sobre o estado atual do certificado digital
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Carregando...
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(status.status)}>
                  {status.status === 'valido' ? 'Válido' : 
                   status.status === 'expirado' ? 'Expirado' : 
                   'Não Configurado'}
                </Badge>
                
                {status.configurado && (
                  <span className="text-sm text-muted-foreground">
                    {status.diasRestantes > 0 
                      ? `${status.diasRestantes} dias restantes`
                      : 'Certificado expirado'
                    }
                  </span>
                )}
              </div>
              
              {status.alertaVencimento && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-yellow-800">
                    Atenção: Seu certificado expira em {status.diasRestantes} dias. 
                    Providencie a renovação para evitar interrupções.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Erro ao carregar status do certificado</p>
          )}
        </CardContent>
      </Card>

      {/* Informações do Certificado */}
      {info?.configurado && info.certificado && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Certificado</CardTitle>
            <CardDescription>
              Detalhes do certificado digital configurado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Tipo</Label>
                <p className="text-sm text-muted-foreground">{info.certificado.tipo}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">CNPJ</Label>
                <p className="text-sm text-muted-foreground">{info.certificado.cnpj}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Arquivo</Label>
                <p className="text-sm text-muted-foreground">{info.certificado.arquivo}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Validade</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(info.certificado.validade).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={info.certificado.ativo ? 'default' : 'secondary'}>
                    {info.certificado.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant={info.certificado.carregado ? 'default' : 'destructive'}>
                    {info.certificado.carregado ? 'Carregado' : 'Não Carregado'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleTestar}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Testar Assinatura</span>
                <span className="sm:hidden">Testar</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRecarregar}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowConfig(true)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Reconfigurar</span>
                <span className="sm:hidden">Config</span>
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleRemover}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Configuração */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configurar Certificado Digital</CardTitle>
            <CardDescription>
              Configure seu certificado digital A1 ou A3 para assinatura de NFe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <Label htmlFor="tipo">Tipo de Certificado *</Label>
                <Select
                  value={config.tipo}
                  onValueChange={(value: 'A1' | 'A3') => setConfig({ ...config, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A1">A1 (Software)</SelectItem>
                    <SelectItem value="A3">A3 (Hardware)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  A1: Arquivo .pfx/.p12 | A3: Token/Cartão (não implementado)
                </p>
              </div>
              
              <div className="sm:col-span-1">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={config.cnpj}
                  onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="caminho">Caminho do Arquivo *</Label>
              <Input
                id="caminho"
                value={config.caminho}
                onChange={(e) => setConfig({ ...config, caminho: e.target.value })}
                placeholder="C:\\certificados\\certificado.pfx"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Caminho completo para o arquivo do certificado (.pfx ou .p12)
              </p>
            </div>
            
            <div>
              <Label htmlFor="senha">Senha do Certificado *</Label>
              <Input
                id="senha"
                type="password"
                value={config.senha}
                onChange={(e) => setConfig({ ...config, senha: e.target.value })}
                placeholder="Digite a senha do certificado"
              />
            </div>
            
            <div>
              <Label htmlFor="validade">Data de Validade</Label>
              <Input
                id="validade"
                type="date"
                value={config.validade}
                onChange={(e) => setConfig({ ...config, validade: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Data de expiração do certificado (opcional)
              </p>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Importante:</strong> Mantenha seu certificado e senha em local seguro. 
                Nunca compartilhe essas informações. O certificado A3 ainda não está implementado nesta versão.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                onClick={handleConfigurar}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{loading ? 'Configurando...' : 'Configurar Certificado'}</span>
                <span className="sm:hidden">{loading ? 'Configurando...' : 'Configurar'}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowConfig(false)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Certificado Digital */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre Certificado Digital</CardTitle>
          <CardDescription>
            Informações importantes sobre certificados digitais para NFe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="font-semibold mb-2">Certificado A1</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arquivo digital (.pfx/.p12)</li>
                <li>• Validade de 1 ano</li>
                <li>• Pode ser copiado</li>
                <li>• Ideal para automação</li>
                <li>• Suportado neste sistema</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Certificado A3</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hardware (token/cartão)</li>
                <li>• Validade de 1 a 5 anos</li>
                <li>• Não pode ser copiado</li>
                <li>• Maior segurança</li>
                <li>• Em desenvolvimento</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2">Requisitos</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Certificado emitido por AC credenciada pela ICP-Brasil</li>
              <li>• CNPJ do certificado deve corresponder ao emitente da NFe</li>
              <li>• Certificado deve estar dentro da validade</li>
              <li>• Senha do certificado deve estar correta</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <ConfirmationComponent />
    </div>
  );
}