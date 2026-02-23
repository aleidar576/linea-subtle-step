import { useState, useEffect } from 'react';
import { settingsApi, adminsApi, type APISetting } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Plus, Trash2, Paintbrush, RefreshCw, Globe, MessageCircle } from 'lucide-react';
import { DynamicIcon } from '@/components/SaaSBrand';
import { useQueryClient } from '@tanstack/react-query';
import ImageUploader from '@/components/ImageUploader';

interface Depoimento {
  nome: string;
  cargo: string;
  texto: string;
}

const SETTING_KEYS = [
  'global_domain', 'termos_uso', 'browser_icon',
  'dias_tolerancia_inadimplencia', 'depoimentos_landing_page',
  'saas_name', 'saas_slogan', 'saas_auth_subtitle', 'saas_icon_name',
  'saas_logo_url', 'saas_logo_url_light', 'saas_logo_url_home',
  'saas_logo_size', 'saas_logo_size_home', 'saas_logo_size_login',
  'whatsapp_suporte',
];

const AdminConfigEmpresa = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    global_domain: '',
    termos_uso: '',
    browser_icon: '',
    dias_tolerancia_inadimplencia: '5',
    depoimentos_landing_page: '[]',
    saas_name: '',
    saas_slogan: '',
    saas_auth_subtitle: '',
    saas_icon_name: '',
    saas_logo_url: '',
    saas_logo_url_light: '',
    saas_logo_url_home: '',
    saas_logo_size: '32',
    saas_logo_size_home: '40',
    saas_logo_size_login: '48',
    whatsapp_suporte: '',
  });
  const queryClient = useQueryClient();

  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [novoDepoimento, setNovoDepoimento] = useState<Depoimento>({ nome: '', cargo: '', texto: '' });

  useEffect(() => {
    settingsApi.getByKeys(SETTING_KEYS).then(settings => {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      setForm(prev => ({ ...prev, ...map }));
      try {
        const parsed = JSON.parse(map.depoimentos_landing_page || '[]');
        if (Array.isArray(parsed)) setDepoimentos(parsed);
      } catch { /* ignore */ }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const addDepoimento = () => {
    if (!novoDepoimento.nome.trim() || !novoDepoimento.texto.trim()) {
      toast({ title: 'Preencha pelo menos o nome e o texto.', variant: 'destructive' });
      return;
    }
    const updated = [...depoimentos, { ...novoDepoimento }];
    setDepoimentos(updated);
    setForm(f => ({ ...f, depoimentos_landing_page: JSON.stringify(updated) }));
    setNovoDepoimento({ nome: '', cargo: '', texto: '' });
  };

  const removeDepoimento = (index: number) => {
    const updated = depoimentos.filter((_, i) => i !== index);
    setDepoimentos(updated);
    setForm(f => ({ ...f, depoimentos_landing_page: JSON.stringify(updated) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings: APISetting[] = Object.entries(form).map(([key, value]) => ({ key, value }));
      await settingsApi.upsert(settings);
      queryClient.invalidateQueries({ queryKey: ['saas-brand'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações da Empresa</h1>

      <div className="space-y-6">
        {/* Domínio Global — isolado */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Domínio Global</h2>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Domínio Global da Plataforma</label>
            <Input value={form.global_domain} onChange={e => setForm(f => ({ ...f, global_domain: e.target.value }))} placeholder="pandora.com.br" />
          </div>
        </div>

        {/* Identidade Visual */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Paintbrush className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Identidade Visual</h2>
          </div>
          <p className="text-sm text-muted-foreground">Configure o branding da plataforma. Essas configurações serão aplicadas em todas as telas do SaaS.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome da Plataforma</label>
              <Input value={form.saas_name} onChange={e => setForm(f => ({ ...f, saas_name: e.target.value }))} placeholder="PANDORA" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slogan da Plataforma</label>
              <Input value={form.saas_slogan} onChange={e => setForm(f => ({ ...f, saas_slogan: e.target.value }))} placeholder="Sua loja online pronta em minutos" />
              <p className="text-xs text-muted-foreground mt-1">Exibido na aba do navegador da homepage.</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Subtítulo de Autenticação</label>
            <Input value={form.saas_auth_subtitle} onChange={e => setForm(f => ({ ...f, saas_auth_subtitle: e.target.value }))} placeholder="Plataforma de E-commerce" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Ícone Lucide (nome)</label>
            <div className="flex items-center gap-3">
              <Input value={form.saas_icon_name} onChange={e => setForm(f => ({ ...f, saas_icon_name: e.target.value }))} placeholder="boxes" className="flex-1" />
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DynamicIcon name={form.saas_icon_name || 'boxes'} className="text-primary" size={20} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Usado como fallback quando não há logo. Veja todos em lucide.dev</p>
          </div>

          {/* Logos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Logo para Tema Escuro</label>
              <ImageUploader adminMode value={form.saas_logo_url} onChange={(url) => setForm(f => ({ ...f, saas_logo_url: url }))} placeholder="https://exemplo.com/logo-escura.png" />
              <p className="text-xs text-muted-foreground mt-1">Usada em fundos escuros (painéis, telas de login, tema dark).</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Logo para Tema Claro</label>
              <ImageUploader adminMode value={form.saas_logo_url_light} onChange={(url) => setForm(f => ({ ...f, saas_logo_url_light: url }))} placeholder="https://exemplo.com/logo-clara.png" />
              <p className="text-xs text-muted-foreground mt-1">Usada em fundos claros (tema light). Se vazio, usa a logo escura.</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Logo da Homepage</label>
            <ImageUploader adminMode value={form.saas_logo_url_home} onChange={(url) => setForm(f => ({ ...f, saas_logo_url_home: url }))} placeholder="https://exemplo.com/logo-home.png" />
            <p className="text-xs text-muted-foreground mt-1">Logo exclusiva para a homepage. Se vazio, usa a logo do tema escuro.</p>
          </div>

          {/* Logo sizes */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Logo nos Painéis (px)</label>
              <Input type="number" min="16" max="120" value={form.saas_logo_size} onChange={e => setForm(f => ({ ...f, saas_logo_size: e.target.value }))} placeholder="32" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Logo na Homepage (px)</label>
              <Input type="number" min="16" max="120" value={form.saas_logo_size_home} onChange={e => setForm(f => ({ ...f, saas_logo_size_home: e.target.value }))} placeholder="40" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Logo nas Telas de Login (px)</label>
              <Input type="number" min="16" max="120" value={form.saas_logo_size_login} onChange={e => setForm(f => ({ ...f, saas_logo_size_login: e.target.value }))} placeholder="48" />
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="text-sm font-medium mb-1 block">Favicon (Ícone do Navegador)</label>
            <ImageUploader adminMode value={form.browser_icon} onChange={(url) => setForm(f => ({ ...f, browser_icon: url }))} placeholder="https://..." />
            <p className="text-xs text-muted-foreground mt-1">Ícone que aparece na aba do navegador em todas as áreas da plataforma (admin + painel lojista).</p>
          </div>
        </div>

        {/* Inadimplência */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Regras de Inadimplência</h2>
          <div>
            <label className="text-sm font-medium mb-1 block">Dias de Tolerância Padrão</label>
            <Input type="number" min="0" value={form.dias_tolerancia_inadimplencia} onChange={e => setForm(f => ({ ...f, dias_tolerancia_inadimplencia: e.target.value }))} placeholder="5" />
            <p className="text-xs text-muted-foreground mt-1">Quantidade de dias após o vencimento antes de bloquear a loja do lojista.</p>
          </div>
        </div>

        {/* WhatsApp Suporte */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Suporte via WhatsApp</h2>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Número do WhatsApp de Suporte</label>
            <Input value={form.whatsapp_suporte} onChange={e => setForm(f => ({ ...f, whatsapp_suporte: e.target.value }))} placeholder="5511999999999" />
            <p className="text-xs text-muted-foreground mt-1">Formato: código do país + DDD + número, sem espaços. Ex: 5511999999999. Usado na tela de verificação de email dos clientes.</p>
          </div>
        </div>

        {/* Depoimentos da Landing Page */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Depoimentos da Landing Page</h2>
          <p className="text-sm text-muted-foreground">Gerencie os depoimentos exibidos na página inicial. Se a lista estiver vazia, serão exibidos depoimentos padrão.</p>

          {depoimentos.length > 0 && (
            <div className="space-y-3">
              {depoimentos.map((d, i) => (
                <div key={i} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.nome} {d.cargo && <span className="text-muted-foreground font-normal">— {d.cargo}</span>}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">"{d.texto}"</p>
                  </div>
                  <Button size="icon" variant="ghost" className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeDepoimento(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Adicionar novo depoimento</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome (ex: Maria S.)" value={novoDepoimento.nome} onChange={e => setNovoDepoimento(d => ({ ...d, nome: e.target.value }))} />
              <Input placeholder="Cargo (ex: Lojista)" value={novoDepoimento.cargo} onChange={e => setNovoDepoimento(d => ({ ...d, cargo: e.target.value }))} />
            </div>
            <Textarea placeholder="Texto do depoimento..." value={novoDepoimento.texto} onChange={e => setNovoDepoimento(d => ({ ...d, texto: e.target.value }))} rows={3} />
            <Button variant="secondary" className="gap-2" onClick={addDepoimento}>
              <Plus className="h-4 w-4" /> Adicionar Depoimento
            </Button>
          </div>
        </div>

        {/* Conteúdos Genéricos — Termos de Uso */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Conteúdos Genéricos</h2>
          <div>
            <label className="text-sm font-medium mb-1 block">Termos de Uso</label>
            <Textarea value={form.termos_uso} onChange={e => setForm(f => ({ ...f, termos_uso: e.target.value }))} placeholder="Insira os termos de uso da plataforma..." rows={10} />
          </div>
        </div>

        {/* Sincronizar Domínios Vercel */}
        <SyncDomainsCard />

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

function SyncDomainsCard() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await adminsApi.syncDomains();
      setResult({ total: res.total, success: res.success, failed: res.failed });
      toast({ title: `${res.success} de ${res.total} domínios sincronizados com sucesso!` });
    } catch (err: any) {
      toast({ title: 'Erro ao sincronizar', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Sincronizar Domínios Vercel</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Registra automaticamente na Vercel todos os subdomínios de lojas ativas — incluindo lojas criadas antes do registro automático. Use também após migrar o projeto na Vercel.
      </p>
      <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {syncing ? 'Sincronizando...' : 'Sincronizar Domínios'}
      </Button>
      {result && (
        <div className="text-sm p-3 rounded-lg bg-muted space-y-1">
          <p>✅ <strong>{result.success}</strong> registrados/confirmados · ❌ <strong>{result.failed}</strong> falharam · Total: <strong>{result.total}</strong></p>
          <p className="text-xs text-muted-foreground">Domínios já existentes na Vercel são contados como sucesso.</p>
        </div>
      )}
    </div>
  );
}

export default AdminConfigEmpresa;
