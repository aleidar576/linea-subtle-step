import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { lojasApi } from '@/services/saas-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCard, Save, Loader2, CheckCircle2, XCircle, TestTube, Webhook, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LojaIntegracoes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading, refetch } = useLoja(id);
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  // Sandbox state
  const [sandboxValor, setSandboxValor] = useState('10.00');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxLog, setSandboxLog] = useState('');

  useEffect(() => {
    if (loja?.configuracoes?.sealpay_api_key) {
      setApiKey(loja.configuracoes.sealpay_api_key);
    }
  }, [loja]);

  const hasKey = !!loja?.configuracoes?.sealpay_api_key;

  const handleSave = async () => {
    if (!id || !apiKey.trim()) return;
    setSaving(true);
    try {
      await lojasApi.update(id, {
        configuracoes: { ...loja?.configuracoes, sealpay_api_key: apiKey.trim() },
      } as any);
      toast({ title: 'Chave SealPay salva com sucesso!' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPix = async () => {
    const valorCentavos = Math.round(parseFloat(sandboxValor) * 100);
    if (isNaN(valorCentavos) || valorCentavos < 1000) {
      toast({ title: 'Valor mínimo: R$ 10,00', variant: 'destructive' });
      return;
    }
    setSandboxLoading(true);
    setSandboxLog('Enviando requisição...');
    try {
      const r = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: valorCentavos,
          description: 'Teste Sandbox - Integração PIX',
          customer: { name: 'Teste Sandbox', email: 'teste@sandbox.com', cellphone: '11999999999', taxId: '00000000000' },
          loja_id: id,
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

  const webhookUrl = `https://${window.location.hostname}/api/create-pix?scope=webhook`;

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'URL copiada!' });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!loja) return <p className="text-muted-foreground">Loja não encontrada.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integrações — {loja.nome}</h1>

      <div className="space-y-6 max-w-2xl">
        {/* ── PIX (SealPay Key) ── */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> PIX (Padrão)</h2>
          <p className="text-sm text-muted-foreground">Configure a chave da API SealPay para receber pagamentos PIX na sua loja.</p>

          <div className="flex items-center gap-2 text-sm">
            {hasKey ? (
              <><CheckCircle2 className="h-4 w-4 text-primary" /> <span className="text-primary font-medium">Chave configurada</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-destructive" /> <span className="text-destructive font-medium">Chave não configurada</span></>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Chave API SealPay</label>
            <Input
              type="password"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Esta chave será usada exclusivamente para processar pagamentos desta loja.</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !apiKey.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Chave
          </Button>
        </div>

        {/* ── PIX Sandbox ── */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><TestTube className="h-5 w-5" /> PIX Sandbox (Teste)</h2>
          <p className="text-sm text-muted-foreground">Teste a geração de PIX com dados fictícios para validar a integração.</p>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
              <Input
                type="number"
                min="10"
                step="0.01"
                value={sandboxValor}
                onChange={(e) => setSandboxValor(e.target.value)}
                placeholder="10.00"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo: R$ 10,00</p>
            </div>
            <Button onClick={handleTestPix} disabled={sandboxLoading} className="gap-2 mt-4">
              {sandboxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Testar Geração
            </Button>
          </div>

          {sandboxLog && (
            <div>
              <label className="text-sm font-medium mb-1 block">Logs de Resposta</label>
              <pre className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap border border-border">
                {sandboxLog}
              </pre>
            </div>
          )}
        </div>

        {/* ── Webhook ── */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhook de Pagamento</h2>
          <p className="text-sm text-muted-foreground">
            Configure esta URL no painel do seu gateway de pagamento (SealPay) para receber notificações automáticas quando um pagamento for confirmado.
          </p>

          <div>
            <label className="text-sm font-medium mb-1 block">URL do Webhook</label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              O webhook espera um POST com <code className="bg-muted px-1 rounded">{'{ txid, status }'}</code>. Quando o status for "paid", o pedido será atualizado automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LojaIntegracoes;
