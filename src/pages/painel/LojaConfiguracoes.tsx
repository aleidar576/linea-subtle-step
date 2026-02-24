import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoja, useUpdateLoja } from '@/hooks/useLojas';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { platformApi, lojasApi } from '@/services/saas-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Globe, Loader2, Lock, Crown, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';

const LojaConfiguracoes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const { user } = useLojistaAuth();
  const updateLoja = useUpdateLoja();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nome, setNome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [slogan, setSlogan] = useState('');
  const [favicon, setFavicon] = useState('');
  const [exigirCadastro, setExigirCadastro] = useState(false);
  const [dominioCustomizado, setDominioCustomizado] = useState('');
  const [saving, setSaving] = useState(false);
  const [platformDomain, setPlatformDomain] = useState('');
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);

  useEffect(() => {
    platformApi.getDomain().then(r => setPlatformDomain(r.domain)).catch(() => setPlatformDomain('dusking.com.br'));
  }, []);

  useEffect(() => {
    if (!loja) return;
    setNome(loja.nome || '');
    setNomeExibicao(loja.nome_exibicao || '');
    setSlogan((loja as any).slogan || '');
    setFavicon(loja.favicon || '');
    setExigirCadastro(loja.configuracoes?.exigir_cadastro_cliente ?? false);
    setDominioCustomizado(loja.dominio_customizado || '');
  }, [loja]);

  const canAccessDomains = user?.plano === 'plus' || user?.modo_amigo || user?.liberar_visualizacao_subdominio;
  const canEditCustomDomain = user?.plano === 'plus' || user?.modo_amigo;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateLoja.mutateAsync({
        id,
        data: {
          nome,
          nome_exibicao: nomeExibicao,
          slogan,
          favicon,
          dominio_customizado: dominioCustomizado || null,
          configuracoes: {
            exigir_cadastro_cliente: exigirCadastro,
          },
        } as any,
      });
      toast({ title: 'Configurações salvas!', description: 'As alterações foram aplicadas com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!dominioCustomizado.trim()) return;
    setIsCheckingDomain(true);
    try {
      await lojasApi.checkDomain(dominioCustomizado.trim());
      toast({ title: 'Domínio verificado!', description: 'Domínio verificado e propagado com sucesso!' });
    } catch {
      toast({ title: 'Propagação pendente', description: 'Domínio ainda não propagou. Verifique o apontamento CNAME na sua hospedagem e aguarde.', variant: 'destructive' });
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
          <div>
            <label className="text-sm font-medium mb-1 block">Nome Interno da Loja</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da loja" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nome Externo da Loja</label>
            <Input value={nomeExibicao} onChange={e => setNomeExibicao(e.target.value)} placeholder="Nome exibido na vitrine e aba do navegador" />
            <p className="text-xs text-muted-foreground mt-1">Este nome aparece no header da loja e na aba do navegador.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Slogan da Loja</label>
            <Input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Ex: As melhores ofertas para você" />
            <p className="text-xs text-muted-foreground mt-1">Aparece na aba do navegador junto ao nome da loja.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Favicon</label>
            <ImageUploader lojaId={id || ''} value={favicon} onChange={(url) => setFavicon(url)} placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exigir cadastro do cliente</p>
              <p className="text-xs text-muted-foreground">Se desativado, um perfil oculto censurado será criado.</p>
            </div>
            <Switch checked={exigirCadastro} onCheckedChange={setExigirCadastro} />
          </div>
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
                <p className="text-xs text-amber-500 mt-1">Upgrade necessário para vincular domínio próprio.</p>
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
              <p className="text-sm font-semibold text-center px-4 mb-1">A publicação de domínio e subdomínio é exclusiva para membros Plus.</p>
              <p className="text-xs text-muted-foreground text-center px-4 mb-4">Faça upgrade para desbloquear domínios personalizados.</p>
              <Button onClick={() => navigate('/painel/assinatura')} className="gap-2">
                <Crown className="h-4 w-4" /> Quero ser Plus agora
              </Button>
            </div>
          )}
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
