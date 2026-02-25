import { useState, useEffect } from 'react';
import { settingsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Send, Eye, EyeOff, CheckCircle2, XCircle, HardDrive, Mail, Webhook, Copy } from 'lucide-react';

const AdminIntegracoes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messagingToken, setMessagingToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Test messaging
  const [testDestinatario, setTestDestinatario] = useState('');
  const [testMensagem, setTestMensagem] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // Bunny test
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [bunnyStatus, setBunnyStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    settingsApi.getByKeys(['messaging_token']).then(settings => {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      setMessagingToken(map.messaging_token || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.upsert([{ key: 'messaging_token', value: messagingToken }]);
      toast({ title: 'Token salvo com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testDestinatario.trim() || !testMensagem.trim()) {
      toast({ title: 'Preencha o destinatário e a mensagem.', variant: 'destructive' });
      return;
    }
    setTestLoading(true);
    try {
      const res = await settingsApi.testMessage(testDestinatario.trim(), testMensagem.trim());
      toast({ title: '✅ Sucesso', description: res.message });
    } catch (err: any) {
      toast({ title: 'Erro no envio', description: err.message, variant: 'destructive' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestBunny = async () => {
    setBunnyLoading(true);
    setBunnyStatus('idle');
    try {
      await settingsApi.testBunny();
      setBunnyStatus('ok');
      toast({ title: '✅ Conexão Bunny.net OK!' });
    } catch (err: any) {
      setBunnyStatus('error');
      toast({ title: 'Erro na conexão', description: err.message, variant: 'destructive' });
    } finally {
      setBunnyLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integrações</h1>

      <div className="space-y-6">
        {/* Notificações (Resend) */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Notificações (Resend)</h2>
          </div>
          <p className="text-sm text-muted-foreground">Configure a chave de API para envio de e-mails e teste a integração em tempo real.</p>

          <div>
            <label className="text-sm font-medium mb-1 block">Token da API de Mensagens</label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={messagingToken}
                onChange={e => setMessagingToken(e.target.value)}
                placeholder="Cole aqui a chave da API de mensagens"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2" size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Token
          </Button>

          {/* Test Sandbox */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Teste de Integração
            </p>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Destinatário</label>
              <Input
                value={testDestinatario}
                onChange={e => setTestDestinatario(e.target.value)}
                placeholder="Ex: notificações@suaempresa.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Mensagem de Teste</label>
              <Textarea
                value={testMensagem}
                onChange={e => setTestMensagem(e.target.value)}
                placeholder="Digite a mensagem que será enviada..."
                rows={3}
              />
            </div>
            <Button onClick={handleTestMessage} disabled={testLoading} className="gap-2" variant="secondary">
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar Mensagem de Teste
            </Button>
          </div>
        </div>

        {/* Armazenamento e CDN (Bunny.net) */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Armazenamento e CDN (Bunny.net)</h2>
          </div>
          <p className="text-sm text-muted-foreground">Serviço de armazenamento e CDN para imagens da plataforma. Configurado via variáveis de ambiente.</p>

          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Configurado via Variáveis de Ambiente</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleTestBunny} disabled={bunnyLoading} variant="outline" size="sm" className="gap-2">
              {bunnyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
              Testar Conexão Bunny.net
            </Button>
            {bunnyStatus === 'ok' && <span className="text-sm text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Conectado</span>}
            {bunnyStatus === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><XCircle className="h-4 w-4" /> Falha na conexão</span>}
          </div>
        </div>

        {/* Integração Stripe (Webhooks) */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Integração Stripe (Webhooks)</h2>
          </div>
          <p className="text-sm text-muted-foreground">Configure esta URL no painel de desenvolvedores da Stripe para receber notificações de assinaturas e pagamentos.</p>

          <div>
            <label className="text-sm font-medium mb-1 block">URL do Webhook</label>
            <div className="flex gap-2">
              <Input value={`${window.location.origin}/api/loja-extras?scope=stripe-webhook`} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/loja-extras?scope=stripe-webhook`);
                  toast({ title: 'URL copiada!' });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cole esta URL no painel de desenvolvedores da Stripe e assine os eventos:{' '}
              <code className="bg-muted px-1 rounded">checkout.session.completed</code>,{' '}
              <code className="bg-muted px-1 rounded">invoice.payment_succeeded</code>,{' '}
              <code className="bg-muted px-1 rounded">invoice.payment_failed</code>,{' '}
              <code className="bg-muted px-1 rounded">customer.subscription.updated</code> e{' '}
              <code className="bg-muted px-1 rounded">customer.subscription.deleted</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIntegracoes;
