import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoja, useUpdateLoja } from '@/hooks/useLojas';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { platformApi, lojasApi } from '@/services/saas-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Globe, Loader2, Lock, Crown, HelpCircle, MessageCircle, AlertTriangle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';

const LojaConfiguracoes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const { user } = useLojistaAuth();
  const updateLoja = useUpdateLoja();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exigirCadastro, setExigirCadastro] = useState(false);
  const [modoOrcamento, setModoOrcamento] = useState(false);
  const [whatsappOrcamento, setWhatsappOrcamento] = useState('');
  const [dominioCustomizado, setDominioCustomizado] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [platformDomain, setPlatformDomain] = useState('');
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);

  useEffect(() => {
    platformApi.getDomain().then(r => setPlatformDomain(r.domain)).catch(() => setPlatformDomain('dusking.com.br'));
  }, []);

  useEffect(() => {
    if (!loja) return;
    setExigirCadastro(loja.configuracoes?.exigir_cadastro_cliente ?? false);
    setModoOrcamento(loja.configuracoes?.modo_orcamento ?? false);
    setWhatsappOrcamento(loja.configuracoes?.whatsapp_orcamento || '');
    setDominioCustomizado(loja.dominio_customizado || '');
    setSeoTitle(loja.seo_config?.title || '');
    setSeoDescription(loja.seo_config?.description || '');
    setSeoOgImage(loja.seo_config?.og_image_url || '');
  }, [loja]);

  const hasActiveSubscription = !!user?.subscription_status && ['trialing', 'active'].includes(user.subscription_status);
  const canAccessDomains = hasActiveSubscription || user?.modo_amigo || user?.liberar_visualizacao_subdominio;
  const canEditCustomDomain = hasActiveSubscription || user?.modo_amigo;

  const hasWhatsappOrcamento = !!whatsappOrcamento.trim();

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateLoja.mutateAsync({
        id,
        data: {
          dominio_customizado: dominioCustomizado || null,
          seo_config: {
            title: seoTitle || null,
            description: seoDescription || null,
            og_image_url: seoOgImage || null,
          },
          configuracoes: {
            exigir_cadastro_cliente: exigirCadastro,
            modo_orcamento: modoOrcamento,
            whatsapp_orcamento: whatsappOrcamento,
          },
        } as any,
      });
      if (dominioCustomizado?.trim()) {
        try {
          await lojasApi.addDomain(id, dominioCustomizado.trim());
        } catch (e: any) {
          toast({
            title: 'Aviso: domínio não registrado na Vercel',
            description: e?.message || 'Erro ao registrar. Use o botão Verificar Propagação.',
            variant: 'destructive',
          });
        }
      }
      toast({ title: 'Configurações salvas!', description: 'As alterações foram aplicadas com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!dominioCustomizado.trim() || !id) return;
    setIsCheckingDomain(true);
    try {
      await lojasApi.addDomain(id, dominioCustomizado.trim());
      await new Promise(r => setTimeout(r, 2000));
      const result = await lojasApi.checkDomain(dominioCustomizado.trim());
      if (result.verified === true && !result.misconfigured) {
        toast({ title: 'Domínio verificado!', description: 'Domínio verificado e propagado com sucesso!' });
      } else {
        toast({ title: 'Propagação pendente', description: 'Domínio ainda não propagou ou DNS incorreto. Verifique o apontamento CNAME e aguarde.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao registrar na Vercel',
        description: e?.message || 'Erro desconhecido. Verifique token e project ID.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingDomain(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!loja) return <p className="text-muted-foreground">Loja não encontrada.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações — {loja.nome}</h1>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Geral</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exigir cadastro do cliente</p>
              <p className="text-xs text-muted-foreground">Se desativado, um perfil oculto censurado será criado.</p>
            </div>
            <Switch checked={exigirCadastro} onCheckedChange={setExigirCadastro} />
          </div>
        </div>

        {/* Card Modo Orçamento */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Modo Orçamento</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Ativar Modo Orçamento</p>
              <p className="text-xs text-muted-foreground">
                Substitui o botão de compra por um redirecionamento para o WhatsApp.
              </p>
            </div>
            <Switch
              checked={modoOrcamento}
              onCheckedChange={setModoOrcamento}
            />
          </div>
          {modoOrcamento && (
            <div>
              <label className="text-sm font-medium mb-1 block">WhatsApp para Orçamentos (DDD + Número)</label>
              <Input
                value={whatsappOrcamento}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                  let formatted = raw;
                  if (raw.length > 2) {
                    formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                  }
                  if (raw.length > 7) {
                    formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                  }
                  setWhatsappOrcamento(formatted);
                }}
                placeholder="(11) 99999-9999"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número exclusivo para receber orçamentos (diferente do WhatsApp flutuante).
              </p>
              {!hasWhatsappOrcamento && (
                <p className="text-xs text-secondary flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> Preencha o número para que o modo funcione.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card Subdomínio Interno */}
        {user?.liberar_visualizacao_subdominio && loja?.slug && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" /> Endereço Interno da Plataforma
            </h2>
            <div>
              <label className="text-sm font-medium mb-1 block">Subdomínio</label>
              <div className="relative">
                <Input value={`${loja.slug}.${platformDomain || '...'}`} disabled className="pr-10 bg-muted cursor-not-allowed" />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este domínio é gerido pela plataforma e não pode ser alterado.
              </p>
            </div>
          </div>
        )}

        {/* Domínio Customizado */}
        <div className="relative">
          <div className={`bg-card border border-border rounded-xl p-6 space-y-4 ${!canAccessDomains ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <h2 className="font-semibold flex items-center gap-2"><Globe className="h-5 w-5" /> Domínio</h2>
            <div>
              <label className="text-sm font-medium mb-1 block">Domínio Personalizado</label>
              <Input
                value={dominioCustomizado}
                onChange={e => setDominioCustomizado(e.target.value)}
                placeholder="www.minhaloja.com.br"
                disabled={!canEditCustomDomain}
              />
              {canAccessDomains && !canEditCustomDomain && (
                <p className="text-xs text-secondary mt-1">Upgrade necessário para vincular domínio próprio.</p>
              )}
              {canEditCustomDomain && (
                <p className="text-xs text-muted-foreground mt-1">Configure o CNAME no seu provedor de DNS apontando para a plataforma.</p>
              )}
            </div>
            {canEditCustomDomain && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCheckDomain} disabled={isCheckingDomain || !dominioCustomizado.trim()}>
                    {isCheckingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {isCheckingDomain ? 'Verificando...' : 'Verificar Propagação'}
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" /> Como apontar seu domínio
                  </h3>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o painel do seu provedor de DNS (ex: Cloudflare, Registro.br)</li>
                    <li>Crie um registro CNAME apontando seu domínio para: <code className="bg-muted px-1 rounded">cname.vercel-dns.com</code></li>
                    <li>Aguarde a propagação (pode levar até 48h)</li>
                    <li>Volte aqui e clique em "Verificar Propagação"</li>
                  </ol>
                </div>
              </>
            )}
          </div>

          {!canAccessDomains && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl border border-border">
              <Lock className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-center px-4 mb-1">Domínio personalizado disponível apenas para assinantes.</p>
              <p className="text-xs text-muted-foreground text-center px-4 mb-4">Assine um plano para desbloquear domínios personalizados.</p>
              <Button onClick={() => navigate('/painel/assinatura')} className="gap-2">
                <Crown className="h-4 w-4" /> Assinar um Plano
              </Button>
            </div>
          )}
        </div>

        {/* Card SEO e Compartilhamento Social */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Search className="h-5 w-5" /> SEO e Compartilhamento Social</h2>
            <p className="text-xs text-muted-foreground mt-1">Personalize como sua loja aparece no Google, WhatsApp e Instagram.</p>
          </div>

          {/* Live Preview */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-1">
            <p className="text-sm font-medium text-primary truncate">
              {(seoTitle || loja.nome_exibicao || loja.nome || '').length > 70
                ? (seoTitle || loja.nome_exibicao || loja.nome || '').substring(0, 70) + '…'
                : (seoTitle || loja.nome_exibicao || loja.nome || '')}
            </p>
            <p className="text-xs text-muted-foreground/80 truncate">
              https://{dominioCustomizado || `${loja.slug}.${platformDomain || '...'}`}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {(seoDescription || loja.slogan || 'Conheça nossa loja!').length > 160
                ? (seoDescription || loja.slogan || 'Conheça nossa loja!').substring(0, 160) + '…'
                : (seoDescription || loja.slogan || 'Conheça nossa loja!')}
            </p>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Título da página</label>
            <Input
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder="Ex: DKing - Calçados Exclusivos"
              maxLength={100}
            />
            <p className={`text-xs ${seoTitle.length > 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {seoTitle.length} de 70 caracteres usados
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Meta descrição</label>
            <Textarea
              value={seoDescription}
              onChange={e => setSeoDescription(e.target.value)}
              placeholder="Descreva sua loja de forma atrativa..."
              maxLength={250}
              rows={3}
            />
            <p className={`text-xs ${seoDescription.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {seoDescription.length} de 160 caracteres usados
            </p>
          </div>

          {/* Imagem OG */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Imagem de compartilhamento (Open Graph)</label>
            <ImageUploader
              lojaId={id}
              value={seoOgImage}
              onChange={setSeoOgImage}
              qualityProfile="banner"
            />
            <p className="text-xs text-muted-foreground">Tamanho recomendado: 1200 × 630 pixels.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default LojaConfiguracoes;
