import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { GATEWAYS, getGatewayById, type GatewayDefinition } from '@/config/gateways';
import { lojistaApi, lojasApi } from '@/services/saas-api';
import { useLoja } from '@/hooks/useLojas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import {
  CreditCard, Save, Loader2, CheckCircle2, XCircle, TestTube, Webhook, Copy,
  Zap, Unplug, Flame, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('lojista_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── SealPay Config Sheet Content ──
function SealPayConfig({
  lojaId,
  currentConfig,
  isActive,
  onSaved,
  onDisconnect,
}: {
  lojaId: string;
  currentConfig: any;
  isActive: boolean;
  onSaved: () => void;
  onDisconnect: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(currentConfig?.api_key || '');
  const [saving, setSaving] = useState(false);
  const [sandboxValor, setSandboxValor] = useState('10.00');
  const [sandboxNome, setSandboxNome] = useState('Teste Sandbox');
  const [sandboxEmail, setSandboxEmail] = useState('teste@sandbox.com');
  const [sandboxTelefone, setSandboxTelefone] = useState('11999999999');
  const [sandboxDocumento, setSandboxDocumento] = useState('12345678909');
  const [sandboxDescricao, setSandboxDescricao] = useState('Teste Sandbox - Integração PIX');
  const [sandboxSrc, setSandboxSrc] = useState('painel_gateway_test');
  const [sandboxUtmSource, setSandboxUtmSource] = useState('painel-lojista');
  const [sandboxUtmCampaign, setSandboxUtmCampaign] = useState('teste-gateway');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxLog, setSandboxLog] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const hasKey = !!apiKey.trim();
  const webhookUrl = `https://${window.location.hostname}/api/process-payment?scope=webhook`;

  const handleSave = async (activate = false) => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await authRequest('/loja-extras?scope=salvar-gateway', {
        method: 'POST',
        body: JSON.stringify({
          id_gateway: 'sealpay',
          config: { api_key: apiKey.trim() },
          ativar: activate,
          loja_id: lojaId,
        }),
      });
      toast({ title: activate ? 'SealPay ativada como gateway padrão!' : 'Chave SealPay salva!' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPix = async () => {
    const valorCentavos = Math.round(parseFloat(sandboxValor) * 100);
    const documentoLimpo = sandboxDocumento.replace(/\D/g, '');
    const telefoneLimpo = sandboxTelefone.replace(/\D/g, '');

    if (isNaN(valorCentavos) || valorCentavos < 1000) {
      toast({ title: 'Valor mínimo: R$ 10,00', variant: 'destructive' });
      return;
    }
    if (!sandboxNome.trim() || sandboxNome.trim().length < 2) {
      toast({ title: 'Nome inválido para teste', variant: 'destructive' });
      return;
    }
    if (!sandboxEmail.includes('@')) {
      toast({ title: 'E-mail inválido para teste', variant: 'destructive' });
      return;
    }
    if (![11, 14].includes(documentoLimpo.length)) {
      toast({ title: 'CPF/CNPJ deve ter 11 ou 14 dígitos', variant: 'destructive' });
      return;
    }

    setSandboxLoading(true);
    setSandboxLog('Enviando requisição...');
    try {
      const r = await fetch(`${API_BASE}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: valorCentavos,
          description: sandboxDescricao.trim() || 'Teste Sandbox - Integração PIX',
          customer: {
            name: sandboxNome.trim(),
            email: sandboxEmail.trim(),
            cellphone: telefoneLimpo,
            taxId: documentoLimpo,
          },
          tracking: {
            src: sandboxSrc.trim(),
            utm: {
              utm_source: sandboxUtmSource.trim(),
              utm_campaign: sandboxUtmCampaign.trim(),
            },
          },
          user_agent: navigator.userAgent,
          loja_id: lojaId,
        }),
      });
      const data = await r.json();
      setSandboxLog(JSON.stringify(data, null, 2));
      if (!r.ok) {
        toast({ title: 'Erro na API', description: data.error || 'Erro desconhecido', variant: 'destructive' });
      } else {
        toast({ title: 'PIX gerado com sucesso!' });
      }
    } catch (err: any) {
      setSandboxLog(JSON.stringify({ error: err.message }, null, 2));
      toast({ title: 'Erro de rede', description: err.message, variant: 'destructive' });
    } finally {
      setSandboxLoading(false);
    }
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'URL copiada!' });
  };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          {hasKey ? (
            <><CheckCircle2 className="h-4 w-4 text-primary" /> <span className="text-primary font-medium">Chave configurada</span></>
          ) : (
            <><XCircle className="h-4 w-4 text-destructive" /> <span className="text-destructive font-medium">Chave não configurada</span></>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium mb-1 block">Chave API SealPay</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Chave exclusiva para processar pagamentos desta loja.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleSave(false)} disabled={saving || !apiKey.trim()} variant="outline" className="gap-2 flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Chave
          </Button>
          {!isActive && (
            <Button onClick={() => handleSave(true)} disabled={saving || !apiKey.trim()} className="gap-2 flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Salvar & Ativar
            </Button>
          )}
        </div>
      </div>

      {/* Sandbox */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm"><TestTube className="h-4 w-4" /> PIX Sandbox (Teste)</h3>
        <p className="text-xs text-muted-foreground">Preencha os dados que normalmente enviamos no checkout para testar a requisição completa.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" min="10" step="0.01" value={sandboxValor} onChange={(e) => setSandboxValor(e.target.value)} placeholder="10.00" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Input value={sandboxDescricao} onChange={(e) => setSandboxDescricao(e.target.value)} placeholder="Descrição do pagamento" />
          </div>
          <div>
            <Label className="text-xs">Nome do cliente</Label>
            <Input value={sandboxNome} onChange={(e) => setSandboxNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={sandboxEmail} onChange={(e) => setSandboxEmail(e.target.value)} placeholder="email@dominio.com" />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={sandboxTelefone} onChange={(e) => setSandboxTelefone(e.target.value)} placeholder="11999999999" />
          </div>
          <div>
            <Label className="text-xs">CPF/CNPJ</Label>
            <Input value={sandboxDocumento} onChange={(e) => setSandboxDocumento(e.target.value)} placeholder="Somente números" />
          </div>
          <div>
            <Label className="text-xs">tracking.src</Label>
            <Input value={sandboxSrc} onChange={(e) => setSandboxSrc(e.target.value)} placeholder="painel_gateway_test" />
          </div>
          <div>
            <Label className="text-xs">utm_source</Label>
            <Input value={sandboxUtmSource} onChange={(e) => setSandboxUtmSource(e.target.value)} placeholder="painel-lojista" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">utm_campaign</Label>
            <Input value={sandboxUtmCampaign} onChange={(e) => setSandboxUtmCampaign(e.target.value)} placeholder="teste-gateway" />
          </div>
        </div>

        <Button onClick={handleTestPix} disabled={sandboxLoading} variant="outline" size="sm" className="gap-1 w-full sm:w-auto">
          {sandboxLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
          Testar
        </Button>

        {sandboxLog && (
          <pre className="bg-muted rounded-lg p-3 font-mono text-[10px] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap border border-border">
            {sandboxLog}
          </pre>
        )}
      </div>

      {/* Webhook */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm"><Webhook className="h-4 w-4" /> Webhook de Pagamento</h3>
        <p className="text-xs text-muted-foreground">Configure esta URL no painel da SealPay para receber confirmações de pagamento.</p>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-[10px]" />
          <Button variant="outline" size="icon" onClick={copyWebhookUrl}><Copy className="h-4 w-4" /></Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          O webhook espera um POST com <code className="bg-muted px-1 rounded">{'{ txid, status }'}</code>.
        </p>
      </div>

      {/* Desconectar */}
      {hasKey && (
        <div className="border-t border-border pt-4">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            disabled={disconnecting}
            onClick={async () => {
              setDisconnecting(true);
              try { await onDisconnect(); } finally { setDisconnecting(false); }
            }}
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Desconectar Gateway
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Remove a chave e desativa este gateway.</p>
        </div>
      )}
    </div>
  );
}

// ── Appmax Config Sheet Content ──
function AppmaxConfig({
  lojaId,
  profile,
  isActive,
  onSaved,
  onDisconnect,
}: {
  lojaId: string;
  profile: any;
  isActive: boolean;
  onSaved: () => void;
  onDisconnect: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const appmaxConfig = profile?.gateways_config?.appmax;
  const isConnected = !!appmaxConfig?.client_id;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await authRequest<{ redirect_url: string }>('/loja-extras?scope=appmax-connect', { method: 'GET' });
      window.location.href = data.redirect_url;
    } catch (err: any) {
      toast({ title: 'Erro ao conectar', description: err.message, variant: 'destructive' });
      setConnecting(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await authRequest('/loja-extras?scope=salvar-gateway', {
        method: 'POST',
        body: JSON.stringify({
          id_gateway: 'appmax',
          config: {},
          ativar: true,
          loja_id: lojaId,
        }),
      });
      toast({ title: 'Appmax ativada como gateway padrão!' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  };

  if (isConnected) {
    return (
      <div className="space-y-6">
        {/* Connected status */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Conta Appmax conectada com sucesso.</p>
            <p className="text-xs text-muted-foreground mt-1">Sua loja está autorizada a processar pagamentos pela Appmax.</p>
          </div>
        </div>

        {/* External ID (read-only) */}
        {appmaxConfig.external_id && (
          <div>
            <Label className="text-sm font-medium mb-1 block">ID de Conexão</Label>
            <Input value={appmaxConfig.external_id} readOnly className="font-mono text-xs bg-muted" />
            <p className="text-[10px] text-muted-foreground mt-1">Identificador único desta integração na Appmax.</p>
          </div>
        )}

        {/* Activate button */}
        {!isActive && (
          <Button onClick={handleActivate} disabled={activating} className="gap-2 w-full">
            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Ativar como Gateway Padrão
          </Button>
        )}

        {isActive && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Gateway padrão ativo</span>
          </div>
        )}

        {/* Desconectar */}
        <div className="border-t border-border pt-4">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            disabled={disconnecting}
            onClick={async () => {
              setDisconnecting(true);
              try { await onDisconnect(); } finally { setDisconnecting(false); }
            }}
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Desconectar Gateway
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Remove as credenciais e desativa este gateway.</p>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-5">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <CreditCard className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-xs">
        <h3 className="font-semibold text-lg">Conectar Appmax</h3>
        <p className="text-sm text-muted-foreground">
          Para processar pagamentos com Cartão, PIX e Boleto através da Appmax, autorize o aplicativo.
        </p>
      </div>
      <Button onClick={handleConnect} disabled={connecting} className="gap-2">
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {connecting ? 'Redirecionando...' : 'Conectar Conta Appmax'}
      </Button>
    </div>
  );
}

// ── Main Component ──
const LojaGateways = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading: lojaLoading } = useLoja(id);
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, { ativo: boolean; nome?: string; logo_url?: string; descricao?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<GatewayDefinition | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prof, configs] = await Promise.all([
        lojistaApi.perfil(),
        authRequest<Record<string, any>>('/loja-extras?scope=gateways-disponiveis'),
      ]);
      setProfile(prof);
      setPlatformConfigs(configs);
    } catch {}
    setLoading(false);
  };

  // Detectar retorno do OAuth Appmax e limpar URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token') || params.has('hash') || params.has('code')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchData();
  }, []);

  const gatewayAtivo = profile?.gateway_ativo || null;
  const gatewaysConfig = profile?.gateways_config || {};

  const integrados = useMemo(() => {
    return GATEWAYS.filter(gw => gatewaysConfig[gw.id]);
  }, [gatewaysConfig]);

  // Merge static GATEWAYS with admin customizations — fallback to static values
  const mergedGateways = useMemo(() => {
    return GATEWAYS.map(gw => {
      const custom = platformConfigs[gw.id];
      if (!custom) return gw;
      return {
        ...gw,
        nome: custom.nome || gw.nome,
        logo_url: custom.logo_url || gw.logo_url,
        descricao: custom.descricao || gw.descricao,
      };
    });
  }, [platformConfigs]);

  const disponiveis = useMemo(() => {
    return mergedGateways.filter(gw => platformConfigs[gw.id]?.ativo);
  }, [mergedGateways, platformConfigs]);

  const handleOpenSheet = (gw: GatewayDefinition) => {
    setSelectedGateway(gw);
    setSheetOpen(true);
  };

  const handleDisconnect = async (gwId: string) => {
    try {
      await authRequest('/loja-extras?scope=desconectar-gateway', {
        method: 'POST',
        body: JSON.stringify({ id_gateway: gwId, loja_id: id }),
      });
      toast({ title: 'Gateway desconectado' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  if (loading || lojaLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Gateways — {loja?.nome}</h1>
      <p className="text-sm text-muted-foreground mb-6">Gerencie seus gateways de pagamento para receber vendas.</p>

      {/* Alert if no gateway active */}
      {!gatewayAtivo && (
        <div className="mb-6 rounded-lg bg-yellow-500/15 border border-yellow-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Nenhum gateway ativo</p>
            <p className="text-xs text-muted-foreground">Configure e ative um gateway abaixo para começar a receber pagamentos na sua loja.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda — Integrados */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Gateways Integrados
            </h2>
            {integrados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum gateway configurado ainda.</p>
            ) : (
              <div className="space-y-3">
                {integrados.map(gw => {
                  const merged = mergedGateways.find(m => m.id === gw.id) || gw;
                  return (
                  <div key={gw.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                    <img src={merged.logo_url} alt={merged.nome} className="h-8 w-8 rounded object-contain bg-muted p-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{merged.nome}</span>
                        {gatewayAtivo === gw.id && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">ATIVO</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground capitalize">{gw.metodos.join(', ')}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleOpenSheet(gw)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => handleDisconnect(gw.id)}>
                        <Unplug className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita — Disponíveis */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Gateways Disponíveis
            </h2>
            {disponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum gateway disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {disponiveis.map((gw, i) => {
                  const isConfigured = !!gatewaysConfig[gw.id];
                  return (
                    <button
                      key={gw.id}
                      onClick={() => handleOpenSheet(gw)}
                      className="relative flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-background hover:border-primary/50 hover:shadow-md transition-all text-center group"
                    >
                      {gw.tag && (
                        <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 bg-destructive text-destructive-foreground border-0">
                          <Flame className="h-2.5 w-2.5 mr-0.5" /> {gw.tag}
                        </Badge>
                      )}
                      <img src={gw.logo_url} alt={gw.nome} className="h-12 w-12 rounded-lg object-contain bg-muted p-2" />
                      <div>
                        <span className="font-semibold text-sm">{gw.nome}</span>
                        <p className="text-xs text-muted-foreground mt-1">{gw.descricao}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {gw.metodos.map(m => (
                          <Badge key={m} variant="outline" className="text-[9px] capitalize">{m}</Badge>
                        ))}
                      </div>
                      {isConfigured && (
                        <Badge variant="secondary" className="text-[9px] mt-1">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Configurado
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sheet lateral */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedGateway && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedGateway.logo_url} alt={selectedGateway.nome} className="h-10 w-10 rounded-lg object-contain bg-muted p-1.5" />
                  <div>
                    <SheetTitle className="text-lg">{selectedGateway.nome}</SheetTitle>
                    <SheetDescription className="text-xs">{selectedGateway.descricao}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {selectedGateway.id === 'sealpay' && (
                <SealPayConfig
                  lojaId={id!}
                  currentConfig={gatewaysConfig.sealpay || {}}
                  isActive={gatewayAtivo === 'sealpay'}
                  onSaved={() => { fetchData(); }}
                  onDisconnect={async () => { await handleDisconnect('sealpay'); setSheetOpen(false); }}
                />
              )}

              {selectedGateway.id === 'appmax' && (
                <AppmaxConfig
                  lojaId={id!}
                  profile={profile}
                  isActive={gatewayAtivo === 'appmax'}
                  onSaved={() => { fetchData(); }}
                  onDisconnect={async () => { await handleDisconnect('appmax'); setSheetOpen(false); }}
                />
              )}

              {selectedGateway.id !== 'sealpay' && selectedGateway.id !== 'appmax' && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Configuração não disponível para este gateway.
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LojaGateways;
