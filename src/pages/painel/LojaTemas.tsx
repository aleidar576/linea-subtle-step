import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useLojaCategories } from '@/hooks/useLojaCategories';
import { useTemaConfig, useUpdateTema, usePaginas, useCupons } from '@/hooks/useLojaExtras';
import {
  Palette, Check, Code, MessageSquare, Globe, Layout, ShoppingBag, Plus, Trash2, ShoppingCart, CreditCard as CreditCardIcon,
  ShieldCheck, Truck, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, Image as ImageIcon, User, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { lojasApi } from '@/services/saas-api';
import type { FooterConfig, FooterColuna, CoresGlobais, HomepageConfig, LogoConfig, ProdutoConfig, CartConfig } from '@/services/saas-api';
import ImageUploader from '@/components/ImageUploader';

const ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'ShieldCheck', label: 'Garantia', Icon: ShieldCheck },
  { value: 'Truck', label: 'Entrega', Icon: Truck },
  { value: 'CreditCard', label: 'Pagamento', Icon: CreditCardIcon },
  { value: 'Zap', label: 'Rápido', Icon: Zap },
  { value: 'Star', label: 'Estrela', Icon: Star },
  { value: 'Heart', label: 'Coração', Icon: Heart },
  { value: 'Lock', label: 'Segurança', Icon: Lock },
  { value: 'Award', label: 'Prêmio', Icon: Award },
  { value: 'CheckCircle', label: 'Verificado', Icon: CheckCircle },
  { value: 'ThumbsUp', label: 'Positivo', Icon: ThumbsUp },
  { value: 'Clock', label: 'Relógio', Icon: Clock },
  { value: 'Package', label: 'Pacote', Icon: Package },
  { value: 'Flame', label: 'Chama', Icon: Flame },
];

const getIconComponent = (name: string): LucideIcon => {
  return ICON_OPTIONS.find(i => i.value === name)?.Icon || ShieldCheck;
};

const DEFAULT_FOOTER: FooterConfig = {
  colunas: [],
  newsletter: false,
  redes_sociais: {
    instagram: { ativo: false, url: '' },
    tiktok: { ativo: false, url: '' },
    facebook: { ativo: false, url: '' },
    youtube: { ativo: false, url: '' },
  },
  selos: { ativo: false, url: '#' },
  texto_copyright: '',
  texto_endereco: '',
  texto_cnpj: '',
  cores: undefined,
  newsletter_cores: undefined,
  footer_logo: undefined,
};

const DEFAULT_CORES: CoresGlobais = {
  brand_primary: '#E60023',
  brand_secondary: '#F1F1F2',
  bg_base: '#F8F8F8',
  bg_surface: '#FFFFFF',
  text_primary: '#111111',
  whatsapp_button: '#25D366',
};
const DEFAULT_LOGO: LogoConfig = { tipo: 'texto', imagem_url: '', texto: '', fonte: 'Inter', tamanho: 48, posicao: 'esquerda' };
const DEFAULT_HOMEPAGE: HomepageConfig = {
  blocos: [], carrossel_botao_texto: 'Ver Produto', carrossel_botao_cor: '',
  faixa_aviso: { texto: '', cor_fundo: '#FF6600', ativo: false },
  banners: [],
  setas_cor_fundo: '#ffffff',
  setas_cor_seta: '#000000',
  setas_fundo_invisivel: false,
  titulo_secao_produtos: 'Mais Vendidos',
  social_proof: { ativo: true, titulo: 'Avaliações dos Clientes', nota_media: 4.9, subtexto: 'Baseado em +11 Milhões de avaliações', comentarios: [] },
  tarja: { cor_fundo: '#1a1a2e', titulo: '', subtitulo: '', botao_ativo: false, botao_texto: '', botao_link: '' },
  trust_badges: [],
};

const DEFAULT_CART: CartConfig = {
  trust_badges: [
    { texto: 'Compra Segura', icone: 'ShieldCheck' },
    { texto: 'Frete Grátis', icone: 'Truck' },
  ],
  tarja_vermelha: { ativo: true, icone: 'Flame', texto: 'Complete seu pedido e ganhe FRETE GRÁTIS!' },
  nota_inferior: { texto: '', cor: '#6b7280', tamanho: 'text-xs' },
};

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
];

// Removed FLAME_ICON_OPTIONS - now Flame is part of ICON_OPTIONS

const LojaTemas = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: categoriesData } = useLojaCategories(id);
  const { data: temaConfig, isError: temaError } = useTemaConfig(id);
  const { data: paginas } = usePaginas(id);
  const updateTema = useUpdateTema();

  const temaAtual = temaConfig?.tema || 'market-tok';
  const categoriaHomeId = temaConfig?.categoria_home_id || 'all';
  const categories = categoriesData?.categories || [];

  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [whatsapp, setWhatsapp] = useState('');
  const [cores, setCores] = useState<CoresGlobais>(DEFAULT_CORES);
  const [homepage, setHomepage] = useState<HomepageConfig>(DEFAULT_HOMEPAGE);
  const [logo, setLogo] = useState<LogoConfig>(DEFAULT_LOGO);
  const [customCss, setCustomCss] = useState('');
  const [produtoConfig, setProdutoConfig] = useState<ProdutoConfig>({});
  const [cartConfig, setCartConfig] = useState<CartConfig>(DEFAULT_CART);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (temaConfig?.footer) setFooter(temaConfig.footer);
    if (temaConfig?.whatsapp_numero) setWhatsapp(temaConfig.whatsapp_numero);
    setCores({ ...DEFAULT_CORES, ...(temaConfig?.cores_globais || {}) });
    if (temaConfig?.homepage_config) setHomepage({ ...DEFAULT_HOMEPAGE, ...temaConfig.homepage_config });
    if (temaConfig?.produto_config) setProdutoConfig(temaConfig.produto_config);
  }, [temaConfig]);

  useEffect(() => {
    if (loja?.configuracoes?.custom_css) setCustomCss(loja.configuracoes.custom_css);
    if (loja?.configuracoes?.logo) setLogo(loja.configuracoes.logo);
    if (loja?.configuracoes?.cart_config) setCartConfig({ ...DEFAULT_CART, ...loja.configuracoes.cart_config });
  }, [loja]);

  const handleCategoriaChange = async (value: string) => {
    if (!id) return;
    try {
      await updateTema.mutateAsync({ lojaId: id, data: { categoria_home_id: value === 'all' ? null : value } });
      toast.success('Categoria da Home atualizada!');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleTemaSelect = async (tema: string) => {
    if (!id || tema === temaAtual) return;
    try {
      await updateTema.mutateAsync({ lojaId: id, data: { tema } });
      toast.success('Tema atualizado!');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateTema.mutateAsync({
        lojaId: id,
        data: { footer, whatsapp_numero: whatsapp, cores_globais: cores, homepage_config: homepage, produto_config: produtoConfig },
      });
      await lojasApi.update(id, { configuracoes: { custom_css: customCss, logo, cart_config: cartConfig } } as any);
      toast.success('Configurações de tema salvas!');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Footer helpers
  const updateColuna = (idx: number, key: keyof FooterColuna, value: any) => {
    const cols = [...footer.colunas];
    cols[idx] = { ...cols[idx], [key]: value };
    setFooter({ ...footer, colunas: cols });
  };
  const addColuna = () => {
    if (footer.colunas.length >= 5) return;
    setFooter({ ...footer, colunas: [...footer.colunas, { titulo: '', links: [] }] });
  };
  const removeColuna = (idx: number) => {
    setFooter({ ...footer, colunas: footer.colunas.filter((_, i) => i !== idx) });
  };
  const addLinkToColuna = (idx: number) => {
    if (footer.colunas[idx].links.length >= 8) return;
    const cols = [...footer.colunas];
    cols[idx].links = [...cols[idx].links, { nome: '', url: '' }];
    setFooter({ ...footer, colunas: cols });
  };
  const removeLinkFromColuna = (colIdx: number, linkIdx: number) => {
    const cols = [...footer.colunas];
    cols[colIdx].links = cols[colIdx].links.filter((_, i) => i !== linkIdx);
    setFooter({ ...footer, colunas: cols });
  };
  const updateLink = (colIdx: number, linkIdx: number, key: string, value: string) => {
    const cols = [...footer.colunas];
    cols[colIdx].links = cols[colIdx].links.map((l, i) => i === linkIdx ? { ...l, [key]: value } : l);
    setFooter({ ...footer, colunas: cols });
  };
  const updateRede = (rede: string, key: string, value: any) => {
    setFooter({
      ...footer,
      redes_sociais: { ...footer.redes_sociais, [rede]: { ...(footer.redes_sociais as any)[rede], [key]: value } },
    });
  };
  const updateFooterCores = (key: 'fundo' | 'texto', value: string) => {
    setFooter({ ...footer, cores: { ...footer.cores, [key]: value } });
  };
  const resetFooterCores = () => {
    setFooter({ ...footer, cores: undefined });
  };
  const updateNewsletterCores = (key: 'fundo' | 'texto', value: string) => {
    setFooter({ ...footer, newsletter_cores: { ...footer.newsletter_cores, [key]: value } });
  };
  const resetNewsletterCores = () => {
    setFooter({ ...footer, newsletter_cores: undefined });
  };

  // Homepage helpers
  const hp = homepage;
  const setHp = (partial: Partial<HomepageConfig>) => setHomepage({ ...homepage, ...partial });
  const banners = hp.banners || [];
  const sp = hp.social_proof || { ativo: true, titulo: '', nota_media: 4.9, subtexto: '', imagem_url: '', comentarios: [] as any[] };
  const tarja = hp.tarja || { cor_fundo: '#1a1a2e', titulo: '', subtitulo: '', botao_ativo: false, botao_texto: '', botao_link: '' };
  const badges = hp.trust_badges || [];
  const tarjaTopo = (hp as any).tarja_topo || { ativo: false, texto: '', cor_fundo: '', cor_texto: '#ffffff', negrito: false, fonte: 'inherit', icone: '', icone_ativo: false };
  const destaquesData = (hp as any).destaques || { ativo: false, cor_fundo: '#f5f5f5', cor_texto: '#555555', itens: [] };
  const secaoSec = (hp as any).secao_secundaria || { ativo: false, titulo: 'Novidades', categoria_id: null };

  // Cart helpers
  const cartBadges = cartConfig.trust_badges || [];
  const cartTarja = cartConfig.tarja_vermelha || { ativo: true, icone: 'Flame', texto: '' };
  const cartNota = cartConfig.nota_inferior || { texto: '', cor: '#6b7280', tamanho: 'text-xs' };

  const updateSp = (partial: Partial<typeof sp>) => setHp({ social_proof: { ...sp, ...partial } as any });
  const updateTarjaTopo = (partial: Partial<typeof tarjaTopo>) => setHp({ tarja_topo: { ...tarjaTopo, ...partial } } as any);
  const updateDestaques = (partial: Partial<typeof destaquesData>) => setHp({ destaques: { ...destaquesData, ...partial } } as any);
  const updateSecaoSec = (partial: Partial<typeof secaoSec>) => setHp({ secao_secundaria: { ...secaoSec, ...partial } } as any);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Temas — {loja?.nome}</h1>

      {temaError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center mb-6">
          <p className="font-medium text-destructive mb-1">Erro ao carregar configuração de tema</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Atualizar Página</Button>
        </div>
      )}

      {/* Theme selector */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div
          className={`bg-card border-2 rounded-xl p-6 relative cursor-pointer transition-all ${temaAtual === 'market-tok' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
          onClick={() => handleTemaSelect('market-tok')}
        >
          {temaAtual === 'market-tok' && (
            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center"><Check className="h-4 w-4 text-primary-foreground" /></div>
          )}
          <Palette className="h-10 w-10 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Market Tok</h3>
          <p className="text-sm text-muted-foreground">Tema padrão com design moderno e responsivo.</p>
        </div>
        <div className="bg-card border-2 border-border rounded-xl p-6 opacity-50 cursor-not-allowed">
          <Palette className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Minimal Store</h3>
          <p className="text-sm text-muted-foreground">Em desenvolvimento...</p>
        </div>
      </div>

      <Tabs defaultValue="homepage" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="homepage" className="gap-1"><Layout className="h-3 w-3" /> Homepage</TabsTrigger>
          <TabsTrigger value="produto" className="gap-1"><ShoppingBag className="h-3 w-3" /> Produto</TabsTrigger>
          <TabsTrigger value="carrinho" className="gap-1"><ShoppingCart className="h-3 w-3" /> Carrinho</TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1"><CreditCardIcon className="h-3 w-3" /> Checkout</TabsTrigger>
          <TabsTrigger value="cores" className="gap-1"><Palette className="h-3 w-3" /> Cores</TabsTrigger>
          <TabsTrigger value="footer" className="gap-1"><Globe className="h-3 w-3" /> Footer</TabsTrigger>
        </TabsList>

        {/* ===== HOMEPAGE ===== */}
        <TabsContent value="homepage" className="space-y-6">

          {/* Identidade Visual (Logo) */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold block">Identidade Visual (Logo)</Label>
            <p className="text-sm text-muted-foreground">Defina como a logo aparece no header da loja.</p>
            <RadioGroup value={logo.tipo} onValueChange={(v: 'upload' | 'url' | 'texto') => setLogo({ ...logo, tipo: v })} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="upload" id="logo-upload" /><Label htmlFor="logo-upload" className="text-sm cursor-pointer">Upload</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="url" id="logo-url" /><Label htmlFor="logo-url" className="text-sm cursor-pointer">URL</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="texto" id="logo-texto" /><Label htmlFor="logo-texto" className="text-sm cursor-pointer">Texto</Label></div>
            </RadioGroup>
            {logo.tipo === 'upload' && id && <ImageUploader lojaId={id} value={logo.imagem_url} onChange={url => setLogo({ ...logo, imagem_url: url })} placeholder="Envie a logo da loja" />}
            {logo.tipo === 'url' && <Input value={logo.imagem_url} onChange={e => setLogo({ ...logo, imagem_url: e.target.value })} placeholder="https://minha-loja.com/logo.png" />}
            {logo.tipo === 'texto' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Nome da Loja</Label><Input value={logo.texto} onChange={e => setLogo({ ...logo, texto: e.target.value })} placeholder="Minha Loja" /></div>
                <div><Label className="text-xs">Fonte</Label><Select value={logo.fonte} onValueChange={v => setLogo({ ...logo, fonte: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Tamanho (px)</Label><Input type="number" min={24} max={120} value={logo.tamanho || 48} onChange={e => setLogo({ ...logo, tamanho: parseInt(e.target.value) || 48 })} /></div>
              <div><Label className="text-xs">Posição</Label><Select value={logo.posicao || 'esquerda'} onValueChange={(v: 'esquerda' | 'centro') => setLogo({ ...logo, posicao: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="esquerda">Esquerda</SelectItem><SelectItem value="centro">Centralizado</SelectItem></SelectContent></Select></div>
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
              <div className="border border-border rounded-lg p-4 bg-background flex items-center min-h-[64px]" style={{ justifyContent: (logo.posicao || 'esquerda') === 'centro' ? 'center' : 'flex-start' }}>
                {(logo.tipo === 'upload' || logo.tipo === 'url') && logo.imagem_url ? (
                  <img src={logo.imagem_url} alt="Logo" style={{ maxHeight: `${logo.tamanho || 48}px` }} className="object-contain" />
                ) : logo.tipo === 'texto' && logo.texto ? (
                  <span className="font-bold max-w-[200px] truncate" style={{ fontFamily: logo.fonte, fontSize: `${Math.min((logo.tamanho || 48) * 0.5, 32)}px` }}>{logo.texto}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhuma logo configurada</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Tarja do Topo */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold block">Tarja do Topo</Label>
                <p className="text-xs text-muted-foreground mt-1">Barra entre a logo e o banner com mensagem promocional.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={tarjaTopo.ativo} onCheckedChange={v => updateTarjaTopo({ ativo: v })} />
                <Label className="text-xs">{tarjaTopo.ativo ? 'Ativa' : 'Desativada'}</Label>
              </div>
            </div>
            {tarjaTopo.ativo && (
              <>
                <div>
                  <Label className="text-xs">Texto</Label>
                  <Input value={tarjaTopo.texto} onChange={e => updateTarjaTopo({ texto: e.target.value })} placeholder="Ex: Frete grátis para todo o Brasil" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cor de Fundo</Label>
                    <div className="flex gap-1">
                      <Input value={tarjaTopo.cor_fundo || ''} onChange={e => updateTarjaTopo({ cor_fundo: e.target.value })} className="flex-1 text-xs" placeholder="Cor primária do tema" />
                      <input type="color" value={tarjaTopo.cor_fundo || '#10b981'} onChange={e => updateTarjaTopo({ cor_fundo: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor do Texto</Label>
                    <div className="flex gap-1">
                      <Input value={tarjaTopo.cor_texto || '#ffffff'} onChange={e => updateTarjaTopo({ cor_texto: e.target.value })} className="flex-1 text-xs" />
                      <input type="color" value={tarjaTopo.cor_texto || '#ffffff'} onChange={e => updateTarjaTopo({ cor_texto: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Fonte</Label>
                    <Select value={tarjaTopo.fonte || 'inherit'} onValueChange={v => updateTarjaTopo({ fonte: v })}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Padrão</SelectItem>
                        {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={tarjaTopo.negrito} onCheckedChange={v => updateTarjaTopo({ negrito: v })} />
                    <Label className="text-xs">Negrito</Label>
                  </div>
                  <div>
                    <Label className="text-xs">Ícone</Label>
                    <Select
                      value={tarjaTopo.icone_ativo && tarjaTopo.icone ? tarjaTopo.icone : '_none'}
                      onValueChange={v => {
                        if (v === '_none') {
                          updateTarjaTopo({ icone: '', icone_ativo: false });
                        } else {
                          updateTarjaTopo({ icone: v, icone_ativo: true });
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {ICON_OPTIONS.map(opt => {
                          const OptIcon = opt.Icon;
                          return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Banners do Carrossel */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold block">Banners do Carrossel</Label>
                <p className="text-xs text-muted-foreground mt-1">Adicione imagens ao carrossel. Ative "Imagem Mobile" para uma versão específica para celulares.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setHp({ banners: [...banners, { imagem: '', imagem_mobile_ativo: false, imagem_mobile: '', titulo: '', titulo_cor: '#000000', titulo_tamanho: 'text-2xl', subtitulo: '', subtitulo_cor: '#666666', subtitulo_tamanho: 'text-sm', badge_texto: '', badge_cor_texto: '#ffffff', badge_cor_fundo: '#ff6666', badge_icone: '', badge_transparencia: 100, botao_ativo: false, botao_texto: '', botao_link: '', botao_cor_texto: '#ffffff', botao_cor_fundo: '#000000' }] })}><Plus className="h-3 w-3" /> Banner</Button>
            </div>

            {banners.map((banner: any, idx: number) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Banner {idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => setHp({ banners: banners.filter((_: any, i: number) => i !== idx) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>

                {/* Imagem principal */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Imagem</Label>
                    <span className="text-[10px] text-muted-foreground">Desktop: 1440×500px | Mobile: 768×400px</span>
                  </div>
                  {banner.imagem && <img src={banner.imagem} alt="Preview" className="w-full max-h-32 object-cover rounded-lg border border-border mb-2" />}
                  {id && <ImageUploader lojaId={id} value={banner.imagem || ''} onChange={url => { const u = [...banners]; u[idx] = { ...banner, imagem: url }; setHp({ banners: u }); }} placeholder="Selecionar imagem" />}
                </div>

                {/* Toggle imagem mobile */}
                <div className="flex items-center gap-2">
                  <Switch checked={banner.imagem_mobile_ativo || false} onCheckedChange={v => { const u = [...banners]; u[idx] = { ...banner, imagem_mobile_ativo: v }; setHp({ banners: u }); }} />
                  <Label className="text-xs">Imagem específica para Mobile</Label>
                </div>
                {banner.imagem_mobile_ativo && (
                  <div>
                    <Label className="text-xs">Imagem Mobile <span className="text-muted-foreground">(768×400px)</span></Label>
                    {banner.imagem_mobile && <img src={banner.imagem_mobile} alt="Preview mobile" className="w-full max-h-24 object-cover rounded-lg border border-border mb-2" />}
                    {id && <ImageUploader lojaId={id} value={banner.imagem_mobile || ''} onChange={url => { const u = [...banners]; u[idx] = { ...banner, imagem_mobile: url }; setHp({ banners: u }); }} placeholder="Selecionar imagem mobile" />}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">💡 Se apenas uma imagem for enviada, será usada tanto no desktop quanto no mobile.</p>

                {/* Badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Badge (texto)</Label>
                    <Input value={banner.badge_texto || ''} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_texto: e.target.value }; setHp({ banners: u }); }} placeholder="Ex: Tempo Limitado!" />
                  </div>
                  <div>
                    <Label className="text-xs">Ícone do Badge</Label>
                    <Select value={banner.badge_icone || '_none'} onValueChange={v => { const u = [...banners]; u[idx] = { ...banner, badge_icone: v === '_none' ? '' : v }; setHp({ banners: u }); }}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem ícone</SelectItem>
                        {ICON_OPTIONS.map(opt => {
                          const OptIcon = opt.Icon;
                          return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Cor Texto Badge</Label>
                    <div className="flex gap-1">
                      <Input value={banner.badge_cor_texto || '#ffffff'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_cor_texto: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                      <input type="color" value={banner.badge_cor_texto || '#ffffff'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_cor_texto: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor Fundo Badge</Label>
                    <div className="flex gap-1">
                      <Input value={banner.badge_cor_fundo || '#ff6666'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_cor_fundo: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                      <input type="color" value={banner.badge_cor_fundo || '#ff6666'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_cor_fundo: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Transparência (%)</Label>
                    <Input type="number" min={0} max={100} value={banner.badge_transparencia ?? 100} onChange={e => { const u = [...banners]; u[idx] = { ...banner, badge_transparencia: parseInt(e.target.value) || 100 }; setHp({ banners: u }); }} className="text-xs" />
                  </div>
                </div>

                {/* Título */}
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Título</Label><Input value={banner.titulo || ''} onChange={e => { const u = [...banners]; u[idx] = { ...banner, titulo: e.target.value }; setHp({ banners: u }); }} placeholder="Título principal" /></div>
                  <div>
                    <Label className="text-xs">Cor Título</Label>
                    <div className="flex gap-1">
                      <Input value={banner.titulo_cor || '#000000'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, titulo_cor: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                      <input type="color" value={banner.titulo_cor || '#000000'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, titulo_cor: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Tamanho Título</Label>
                    <Select value={banner.titulo_tamanho || 'text-2xl'} onValueChange={v => { const u = [...banners]; u[idx] = { ...banner, titulo_tamanho: v }; setHp({ banners: u }); }}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-xl">Pequeno</SelectItem>
                        <SelectItem value="text-2xl">Médio</SelectItem>
                        <SelectItem value="text-3xl">Grande</SelectItem>
                        <SelectItem value="text-4xl">Extra Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Subtítulo */}
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Subtítulo</Label><Input value={banner.subtitulo || ''} onChange={e => { const u = [...banners]; u[idx] = { ...banner, subtitulo: e.target.value }; setHp({ banners: u }); }} placeholder="Texto secundário" /></div>
                  <div>
                    <Label className="text-xs">Cor Subtítulo</Label>
                    <div className="flex gap-1">
                      <Input value={banner.subtitulo_cor || '#666666'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, subtitulo_cor: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                      <input type="color" value={banner.subtitulo_cor || '#666666'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, subtitulo_cor: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Tamanho Subtítulo</Label>
                    <Select value={banner.subtitulo_tamanho || 'text-sm'} onValueChange={v => { const u = [...banners]; u[idx] = { ...banner, subtitulo_tamanho: v }; setHp({ banners: u }); }}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-sm">Pequeno</SelectItem>
                        <SelectItem value="text-base">Médio</SelectItem>
                        <SelectItem value="text-lg">Grande</SelectItem>
                        <SelectItem value="text-xl">Extra Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Botão */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.botao_ativo || false} onCheckedChange={v => { const u = [...banners]; u[idx] = { ...banner, botao_ativo: v }; setHp({ banners: u }); }} />
                    <Label className="text-xs">Botão de Ação</Label>
                  </div>
                  {banner.botao_ativo && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Texto</Label><Input value={banner.botao_texto || ''} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_texto: e.target.value }; setHp({ banners: u }); }} placeholder="Ver Agora" /></div>
                      <div><Label className="text-xs">Link</Label><Input value={banner.botao_link || ''} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_link: e.target.value }; setHp({ banners: u }); }} placeholder="/produto/meu-produto" /></div>
                      <div>
                        <Label className="text-xs">Cor Texto Botão</Label>
                        <div className="flex gap-1">
                          <Input value={banner.botao_cor_texto || '#ffffff'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_cor_texto: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                          <input type="color" value={banner.botao_cor_texto || '#ffffff'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_cor_texto: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Cor Fundo Botão</Label>
                        <div className="flex gap-1">
                          <Input value={banner.botao_cor_fundo || '#000000'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_cor_fundo: e.target.value }; setHp({ banners: u }); }} className="flex-1 text-xs" />
                          <input type="color" value={banner.botao_cor_fundo || '#000000'} onChange={e => { const u = [...banners]; u[idx] = { ...banner, botao_cor_fundo: e.target.value }; setHp({ banners: u }); }} className="w-8 h-8 rounded border border-input cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">💡 Campos vazios (título, subtítulo, badge, botão) não aparecerão no carrossel.</p>

                {/* Blur */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.blur_ativo || false} onCheckedChange={v => { const u = [...banners]; u[idx] = { ...banner, blur_ativo: v }; setHp({ banners: u }); }} />
                    <Label className="text-xs">Blur na imagem</Label>
                  </div>
                  {banner.blur_ativo && (
                    <div>
                      <Label className="text-xs">Intensidade do Blur ({banner.blur_intensidade ?? 30}%)</Label>
                      <Input type="range" min={0} max={100} value={banner.blur_intensidade ?? 30} onChange={e => { const u = [...banners]; u[idx] = { ...banner, blur_intensidade: parseInt(e.target.value) }; setHp({ banners: u }); }} className="w-full" />
                      <p className="text-[10px] text-muted-foreground">O blur é aplicado apenas na imagem. Textos e botões permanecem nítidos.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Setas do Carrossel + Altura do Banner */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-semibold">Altura do Banner</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Desktop</Label>
                  <Select value={(hp as any).banner_altura_desktop || 'medio'} onValueChange={v => setHp({ banner_altura_desktop: v } as any)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno (3:1)</SelectItem>
                      <SelectItem value="medio">Médio (2.5:1)</SelectItem>
                      <SelectItem value="grande">Grande (2:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mobile</Label>
                  <Select value={(hp as any).banner_altura_mobile || 'medio'} onValueChange={v => setHp({ banner_altura_mobile: v } as any)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno (16:9)</SelectItem>
                      <SelectItem value="medio">Médio (1:1)</SelectItem>
                      <SelectItem value="grande">Grande (3:4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Label className="text-sm font-semibold">Setas de Navegação</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cor da Seta</Label>
                  <div className="flex gap-1">
                    <Input value={hp.setas_cor_seta || '#000000'} onChange={e => setHp({ setas_cor_seta: e.target.value })} className="flex-1 text-xs" />
                    <input type="color" value={hp.setas_cor_seta || '#000000'} onChange={e => setHp({ setas_cor_seta: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cor do Fundo</Label>
                  <div className="flex gap-1 items-center">
                    <Input value={hp.setas_cor_fundo || '#ffffff'} onChange={e => setHp({ setas_cor_fundo: e.target.value })} className="flex-1 text-xs" disabled={hp.setas_fundo_invisivel || false} />
                    <input type="color" value={hp.setas_cor_fundo || '#ffffff'} onChange={e => setHp({ setas_cor_fundo: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" disabled={hp.setas_fundo_invisivel || false} />
                    <div className="flex items-center gap-1 ml-1">
                      <Switch checked={hp.setas_fundo_invisivel || false} onCheckedChange={v => setHp({ setas_fundo_invisivel: v })} />
                      <Label className="text-[10px] whitespace-nowrap">Invisível</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Destaques (barra abaixo do banner) */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold block">Barra de Destaques</Label>
                <p className="text-xs text-muted-foreground mt-1">Ícones informativos logo abaixo do banner (ex: Entrega Rápida, Compra Segura). Máximo 4 itens.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={destaquesData.ativo} onCheckedChange={v => updateDestaques({ ativo: v })} />
                <Label className="text-xs">{destaquesData.ativo ? 'Ativo' : 'Desativado'}</Label>
              </div>
            </div>
            {destaquesData.ativo && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cor de Fundo</Label>
                    <div className="flex gap-1">
                      <Input value={destaquesData.cor_fundo || '#f5f5f5'} onChange={e => updateDestaques({ cor_fundo: e.target.value })} className="flex-1 text-xs" />
                      <input type="color" value={destaquesData.cor_fundo || '#f5f5f5'} onChange={e => updateDestaques({ cor_fundo: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor do Texto</Label>
                    <div className="flex gap-1">
                      <Input value={destaquesData.cor_texto || '#555555'} onChange={e => updateDestaques({ cor_texto: e.target.value })} className="flex-1 text-xs" />
                      <input type="color" value={destaquesData.cor_texto || '#555555'} onChange={e => updateDestaques({ cor_texto: e.target.value })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                </div>
                {destaquesData.itens.map((item: any, idx: number) => {
                  const IconComp = getIconComponent(item.icone);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <IconComp className="h-5 w-5 text-primary shrink-0" />
                      <Select value={item.icone} onValueChange={v => { const u = [...destaquesData.itens]; u[idx] = { ...item, icone: v }; updateDestaques({ itens: u }); }}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map(opt => {
                            const OptIcon = opt.Icon;
                            return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                      <Input value={item.texto} onChange={e => { const u = [...destaquesData.itens]; u[idx] = { ...item, texto: e.target.value }; updateDestaques({ itens: u }); }} placeholder="Ex: Entrega Rápida" className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => updateDestaques({ itens: destaquesData.itens.filter((_: any, i: number) => i !== idx) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  );
                })}
                {destaquesData.itens.length < 4 && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => updateDestaques({ itens: [...destaquesData.itens, { texto: '', icone: 'Truck' }] })}><Plus className="h-3 w-3" /> Destaque</Button>
                )}
              </>
            )}
          </div>

          {/* Seções de Produtos */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold mb-1 block">Seções de Produtos</Label>
                <p className="text-sm text-muted-foreground">Adicione seções de produtos por categoria na página inicial.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                const secoes = (hp as any).secoes_produtos || [];
                setHp({ secoes_produtos: [...secoes, { titulo: '', categoria_id: 'all' }] } as any);
              }}><Plus className="h-3 w-3" /> Adicionar Seção</Button>
            </div>

            {(() => {
              // Migrate old format to new array format
              let secoes = (hp as any).secoes_produtos;
              if (!secoes || !Array.isArray(secoes) || secoes.length === 0) {
                secoes = [{ titulo: hp.titulo_secao_produtos || 'Mais Vendidos', categoria_id: categoriaHomeId || 'all' }];
                if (secaoSec.ativo && secaoSec.categoria_id) {
                  secoes.push({ titulo: secaoSec.titulo || 'Novidades', categoria_id: secaoSec.categoria_id });
                }
              }
              return secoes.map((secao: any, idx: number) => (
                <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Seção {idx + 1}</span>
                    {secoes.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        const u = [...secoes];
                        u.splice(idx, 1);
                        setHp({ secoes_produtos: u } as any);
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Título</Label>
                      <Input value={secao.titulo || ''} onChange={e => {
                        const u = [...secoes];
                        u[idx] = { ...secao, titulo: e.target.value };
                        setHp({ secoes_produtos: u } as any);
                      }} placeholder="Ex: Mais Vendidos" />
                    </div>
                    <div>
                      <Label className="text-xs">Categoria</Label>
                      <Select value={secao.categoria_id || 'all'} onValueChange={v => {
                        const u = [...secoes];
                        u[idx] = { ...secao, categoria_id: v };
                        setHp({ secoes_produtos: u } as any);
                        // Keep backward compat for first section
                        if (idx === 0) handleCategoriaChange(v);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os produtos</SelectItem>
                          {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* 8. Social Proof */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Avaliações na Home (Social Proof)</Label>
              <div className="flex items-center gap-2">
                <Switch checked={sp.ativo !== false} onCheckedChange={v => updateSp({ ativo: v })} />
                <Label className="text-xs">{sp.ativo !== false ? 'Ativo' : 'Desativado'}</Label>
              </div>
            </div>

            {sp.ativo !== false && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Título</Label><Input value={sp.titulo} onChange={e => updateSp({ titulo: e.target.value })} placeholder="Avaliações dos Clientes" /></div>
                  <div>
                    <Label className="text-xs">Nota Média (0.0 - 5.0)</Label>
                    <Input type="number" step="0.1" min="0" max="5" value={sp.nota_media} onChange={e => updateSp({ nota_media: parseFloat(e.target.value) || 0 })} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Use uma casa decimal. Ex: 4.8, 5.0, 3.5</p>
                  </div>
                </div>
                <div><Label className="text-xs">Subtexto</Label><Input value={sp.subtexto} onChange={e => updateSp({ subtexto: e.target.value })} placeholder="Baseado em +11 Milhões de avaliações" /></div>

                {/* Imagem de avaliações */}
                <div>
                  <Label className="text-xs">Imagem de Avaliações (opcional)</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">Adicione uma imagem para ser exibida na seção de avaliações. Se vazia, não aparecerá.</p>
                  {sp.imagem_url && <img src={sp.imagem_url} alt="Avaliações" className="w-full max-h-32 object-cover rounded-lg border border-border mb-2" />}
                  {id && <ImageUploader lojaId={id} value={sp.imagem_url || ''} onChange={url => updateSp({ imagem_url: url })} placeholder="Imagem de avaliações" />}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-sm font-medium">Comentários Destacados</Label>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => updateSp({ comentarios: [...sp.comentarios, { nome: '', texto: '', nota: 5, foto: false, foto_url: '' }] })}><Plus className="h-3 w-3" /> Comentário</Button>
                </div>
                {sp.comentarios.map((c: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Comentário {idx + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => updateSp({ comentarios: sp.comentarios.filter((_: any, i: number) => i !== idx) })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>

                    {/* Photo preview above name */}
                    <div className="flex items-center gap-3">
                      {c.foto && c.foto_url ? (
                        <img src={c.foto_url} alt={c.nome} className="h-10 w-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input value={c.nome} onChange={e => { const u = [...sp.comentarios]; u[idx] = { ...c, nome: e.target.value }; updateSp({ comentarios: u }); }} placeholder="Nome do avaliador" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Nota (0.0 - 5.0)</Label>
                        <Input type="number" step="0.1" min="0" max="5" value={c.nota} onChange={e => { const u = [...sp.comentarios]; u[idx] = { ...c, nota: parseFloat(e.target.value) || 5 }; updateSp({ comentarios: u }); }} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={c.foto} onCheckedChange={v => { const u = [...sp.comentarios]; u[idx] = { ...c, foto: v, foto_url: v ? c.foto_url || '' : '' }; updateSp({ comentarios: u }); }} />
                        <Label className="text-xs">Foto do avaliador</Label>
                      </div>
                    </div>
                    <Textarea rows={2} value={c.texto} onChange={e => { const u = [...sp.comentarios]; u[idx] = { ...c, texto: e.target.value }; updateSp({ comentarios: u }); }} placeholder="Texto da avaliação..." />
                    {c.foto && id && (
                      <ImageUploader lojaId={id} value={c.foto_url || ''} onChange={url => { const u = [...sp.comentarios]; u[idx] = { ...c, foto_url: url }; updateSp({ comentarios: u }); }} placeholder="Foto do avaliador" />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 9. Tarja Inferior */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Tarja Inferior (Call to Action)</Label>
            <div>
              <Label className="text-xs">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input value={tarja.cor_fundo} onChange={e => setHp({ tarja: { ...tarja, cor_fundo: e.target.value } })} placeholder="#1a1a2e" className="flex-1" />
                <input type="color" value={tarja.cor_fundo || '#1a1a2e'} onChange={e => setHp({ tarja: { ...tarja, cor_fundo: e.target.value } })} className="w-10 h-10 rounded border border-input cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Título</Label><Input value={tarja.titulo} onChange={e => setHp({ tarja: { ...tarja, titulo: e.target.value } })} placeholder="Garanta seu desconto exclusivo!" /></div>
              <div><Label className="text-xs">Subtítulo</Label><Input value={tarja.subtitulo} onChange={e => setHp({ tarja: { ...tarja, subtitulo: e.target.value } })} placeholder="Últimas unidades com frete grátis." /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Label className="text-xs">Botão</Label><Switch checked={tarja.botao_ativo} onCheckedChange={v => setHp({ tarja: { ...tarja, botao_ativo: v } })} /></div>
              {tarja.botao_ativo && (
                <>
                  <Input value={tarja.botao_texto} onChange={e => setHp({ tarja: { ...tarja, botao_texto: e.target.value } })} placeholder="Aproveitar Oferta" className="flex-1" />
                  <Input value={tarja.botao_link} onChange={e => setHp({ tarja: { ...tarja, botao_link: e.target.value } })} placeholder="/link" className="flex-1" />
                </>
              )}
            </div>
          </div>

          {/* 10. Trust Badges */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ícones de Confiança (Trust Badges)</Label>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setHp({ trust_badges: [...badges, { texto: '', icone: 'ShieldCheck' }] })}><Plus className="h-3 w-3" /> Badge</Button>
            </div>
            {badges.map((b: any, idx: number) => {
              const IconComp = getIconComponent(b.icone);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <IconComp className="h-5 w-5 text-primary shrink-0" />
                  <Select value={b.icone} onValueChange={v => { const u = [...badges]; u[idx] = { ...b, icone: v }; setHp({ trust_badges: u }); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => {
                        const OptIcon = opt.Icon;
                        return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Input value={b.texto} onChange={e => { const u = [...badges]; u[idx] = { ...b, texto: e.target.value }; setHp({ trust_badges: u }); }} placeholder="Compra Segura" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setHp({ trust_badges: badges.filter((_: any, i: number) => i !== idx) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
          </div>

          {/* Popup de Boas-Vindas */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold block">Popup de Boas-Vindas</Label>
                <p className="text-xs text-muted-foreground mt-1">Exibido 1x por sessão ao visitar a loja.</p>
              </div>
              <Switch checked={hp.popup?.ativo ?? false} onCheckedChange={v => setHp({ popup: { ...(hp.popup || { tipo: 'NEWSLETTER', titulo: '', subtitulo: '', texto_botao: '', imagem_url: '', cupons_ids: [] }), ativo: v } as any })} />
            </div>
            {hp.popup?.ativo && (() => {
              const popup = hp.popup!;
              const updatePopup = (partial: Partial<typeof popup>) => setHp({ popup: { ...popup, ...partial } as any });
              const cuponsData = (categoriesData as any)?._cupons;
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={popup.tipo || 'NEWSLETTER'} onValueChange={(v: any) => updatePopup({ tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUPONS">Cupons</SelectItem>
                        <SelectItem value="NEWSLETTER">Newsletter</SelectItem>
                        <SelectItem value="BANNER">Banner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Título (máx 60)</Label><Input maxLength={60} value={popup.titulo || ''} onChange={e => updatePopup({ titulo: e.target.value })} placeholder="Bem-vindo!" /></div>
                    <div><Label className="text-xs">Subtítulo (máx 120)</Label><Input maxLength={120} value={popup.subtitulo || ''} onChange={e => updatePopup({ subtitulo: e.target.value })} placeholder="Aproveite nossas ofertas" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Texto do Botão (máx 30)</Label><Input maxLength={30} value={popup.texto_botao || ''} onChange={e => updatePopup({ texto_botao: e.target.value })} placeholder="Quero meu cupom!" /></div>
                    <div>
                      <Label className="text-xs">Imagem</Label>
                      {id && <ImageUploader lojaId={id} value={popup.imagem_url || ''} onChange={url => updatePopup({ imagem_url: url })} placeholder="Imagem do popup" />}
                    </div>
                  </div>
                  {popup.tipo === 'BANNER' && (
                    <div><Label className="text-xs">Link do Botão (máx 500)</Label><Input maxLength={500} value={popup.botao_link || ''} onChange={e => updatePopup({ botao_link: e.target.value })} placeholder="https://..." /></div>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Cor de Fundo</Label>
                      <div className="flex gap-1"><Input value={popup.cores?.fundo || ''} onChange={e => updatePopup({ cores: { ...popup.cores, fundo: e.target.value } })} className="flex-1 text-xs" placeholder="Tema" /><input type="color" value={popup.cores?.fundo || '#ffffff'} onChange={e => updatePopup({ cores: { ...popup.cores, fundo: e.target.value } })} className="w-8 h-8 rounded border border-input cursor-pointer" /></div>
                    </div>
                    <div>
                      <Label className="text-xs">Cor do Texto</Label>
                      <div className="flex gap-1"><Input value={popup.cores?.texto || ''} onChange={e => updatePopup({ cores: { ...popup.cores, texto: e.target.value } })} className="flex-1 text-xs" placeholder="Tema" /><input type="color" value={popup.cores?.texto || '#000000'} onChange={e => updatePopup({ cores: { ...popup.cores, texto: e.target.value } })} className="w-8 h-8 rounded border border-input cursor-pointer" /></div>
                    </div>
                    <div>
                      <Label className="text-xs">Cor Botão Fundo</Label>
                      <div className="flex gap-1"><Input value={popup.cores?.botao_fundo || ''} onChange={e => updatePopup({ cores: { ...popup.cores, botao_fundo: e.target.value } })} className="flex-1 text-xs" placeholder="Tema" /><input type="color" value={popup.cores?.botao_fundo || '#000000'} onChange={e => updatePopup({ cores: { ...popup.cores, botao_fundo: e.target.value } })} className="w-8 h-8 rounded border border-input cursor-pointer" /></div>
                    </div>
                    <div>
                      <Label className="text-xs">Cor Botão Texto</Label>
                      <div className="flex gap-1"><Input value={popup.cores?.botao_texto || ''} onChange={e => updatePopup({ cores: { ...popup.cores, botao_texto: e.target.value } })} className="flex-1 text-xs" placeholder="Tema" /><input type="color" value={popup.cores?.botao_texto || '#ffffff'} onChange={e => updatePopup({ cores: { ...popup.cores, botao_texto: e.target.value } })} className="w-8 h-8 rounded border border-input cursor-pointer" /></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* ===== PRODUTO ===== */}
        <TabsContent value="produto" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold block">Barra de Pesquisa</Label>
            <p className="text-sm text-muted-foreground">Exibir campo de busca no header da loja.</p>
            <div className="flex items-center gap-3">
              <Switch
                checked={produtoConfig?.barra_pesquisa?.ativo ?? false}
                onCheckedChange={v => setProdutoConfig({ ...produtoConfig, barra_pesquisa: { ativo: v } })}
              />
              <Label className="text-sm">Barra de Pesquisa Ativa</Label>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold block">Chat Virtual (Mobile)</Label>
            <p className="text-sm text-muted-foreground">Bot de atendimento automático visível apenas no celular.</p>
            <div className="flex items-center gap-3">
              <Switch
                checked={produtoConfig?.chatbot?.ativo ?? false}
                onCheckedChange={v => setProdutoConfig({ ...produtoConfig, chatbot: { ativo: v } })}
              />
              <Label className="text-sm">Chat Virtual Ativo</Label>
            </div>
          </div>
        </TabsContent>

        {/* ===== CARRINHO ===== */}
        <TabsContent value="carrinho" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Tarja Vermelha (Topo do Carrinho)</Label>
            <p className="text-sm text-muted-foreground">Barra de destaque no topo da página do carrinho.</p>
            <div className="flex items-center gap-3">
              <Switch checked={cartTarja.ativo} onCheckedChange={v => setCartConfig({ ...cartConfig, tarja_vermelha: { ...cartTarja, ativo: v } })} />
              <Label className="text-sm">{cartTarja.ativo ? 'Ativa' : 'Desativada'}</Label>
            </div>
            {cartTarja.ativo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Ícone</Label>
                  <Select value={cartTarja.icone || 'Flame'} onValueChange={v => setCartConfig({ ...cartConfig, tarja_vermelha: { ...cartTarja, icone: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => {
                        const OptIcon = opt.Icon;
                        return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Texto</Label>
                  <Input value={cartTarja.texto} onChange={e => setCartConfig({ ...cartConfig, tarja_vermelha: { ...cartTarja, texto: e.target.value } })} placeholder="Complete seu pedido e ganhe FRETE GRÁTIS!" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Selos de Confiança (abaixo dos itens)</Label>
            <p className="text-sm text-muted-foreground">Máximo de 2 selos. Exibidos logo abaixo da lista de produtos do carrinho.</p>
            {cartBadges.map((b: any, idx: number) => {
              const IconComp = getIconComponent(b.icone);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <IconComp className="h-5 w-5 text-primary shrink-0" />
                  <Select value={b.icone} onValueChange={v => { const u = [...cartBadges]; u[idx] = { ...b, icone: v }; setCartConfig({ ...cartConfig, trust_badges: u }); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => {
                        const OptIcon = opt.Icon;
                        return <SelectItem key={opt.value} value={opt.value}><span className="flex items-center gap-2"><OptIcon className="h-4 w-4" /> {opt.label}</span></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Input value={b.texto} onChange={e => { const u = [...cartBadges]; u[idx] = { ...b, texto: e.target.value }; setCartConfig({ ...cartConfig, trust_badges: u }); }} placeholder="Compra Segura" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setCartConfig({ ...cartConfig, trust_badges: cartBadges.filter((_: any, i: number) => i !== idx) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
            {cartBadges.length < 2 && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setCartConfig({ ...cartConfig, trust_badges: [...cartBadges, { texto: '', icone: 'ShieldCheck' }] })}><Plus className="h-3 w-3" /> Selo</Button>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Nota Inferior (abaixo do resumo)</Label>
            <p className="text-sm text-muted-foreground">Texto pequeno exibido abaixo do resumo do pedido. Deixe vazio para ocultar.</p>
            <div>
              <Label className="text-xs">Texto</Label>
              <Textarea rows={2} value={cartNota.texto} onChange={e => setCartConfig({ ...cartConfig, nota_inferior: { ...cartNota, texto: e.target.value } })} placeholder="Ex: Ao finalizar, você concorda com nossos termos." />
            </div>
            {cartNota.texto && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Cor do Texto</Label>
                  <div className="flex gap-1">
                    <Input value={cartNota.cor || '#6b7280'} onChange={e => setCartConfig({ ...cartConfig, nota_inferior: { ...cartNota, cor: e.target.value } })} className="flex-1 text-xs" />
                    <input type="color" value={cartNota.cor || '#6b7280'} onChange={e => setCartConfig({ ...cartConfig, nota_inferior: { ...cartNota, cor: e.target.value } })} className="w-8 h-8 rounded border border-input cursor-pointer" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tamanho do Texto</Label>
                  <Select value={cartNota.tamanho || 'text-xs'} onValueChange={v => setCartConfig({ ...cartConfig, nota_inferior: { ...cartNota, tamanho: v } })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-[10px]">Muito Pequeno</SelectItem>
                      <SelectItem value="text-xs">Pequeno</SelectItem>
                      <SelectItem value="text-sm">Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== CHECKOUT ===== */}
        <TabsContent value="checkout" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Configurações de Checkout</Label>
            <p className="text-sm text-muted-foreground">Configurações adicionais do checkout serão adicionadas aqui em breve.</p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-4">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              <span className="text-sm">O checkout utiliza as configurações de frete, pagamento e cores já definidas nas outras guias.</span>
            </div>
          </div>
        </TabsContent>

        {/* ===== CORES ===== */}
        <TabsContent value="cores" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <Label className="text-base font-semibold">Cores do Tema</Label>
              <p className="text-sm text-muted-foreground mt-1">Defina as cores que serão aplicadas em toda a loja pública.</p>
            </div>

            {/* 5 main semantic colors */}
            {[
              { key: 'brand_primary', label: 'Cor de Ação Principal', desc: 'Botões de compra, tags de desconto, steps ativos', defaultVal: '#E60023' },
              { key: 'brand_secondary', label: 'Cor de Ação Secundária', desc: 'Botão Adicionar ao Carrinho, badges', defaultVal: '#F1F1F2' },
              { key: 'bg_base', label: 'Fundo da Página', desc: 'Cor de fundo geral do body', defaultVal: '#F8F8F8' },
              { key: 'bg_surface', label: 'Superfície / Cards', desc: 'Cards, modais, blocos de checkout', defaultVal: '#FFFFFF' },
              { key: 'text_primary', label: 'Texto Principal', desc: 'Títulos, preços, nomes de produto', defaultVal: '#111111' },
            ].map(({ key, label, desc, defaultVal }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(cores as any)[key] || defaultVal}
                    onChange={e => setCores({ ...cores, [key]: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0"
                  />
                  <Input
                    value={(cores as any)[key] || ''}
                    onChange={e => setCores({ ...cores, [key]: e.target.value })}
                    placeholder={defaultVal}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            ))}

            {/* Separator */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <Label className="text-sm font-medium">Botão WhatsApp</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Cor independente do botão flutuante. Não é afetada pelo tema global.</p>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={cores.whatsapp_button || '#25D366'}
                  onChange={e => setCores({ ...cores, whatsapp_button: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-input cursor-pointer shrink-0"
                />
                <Input
                  value={cores.whatsapp_button || ''}
                  onChange={e => setCores({ ...cores, whatsapp_button: e.target.value })}
                  placeholder="#25D366"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            {/* Mini Preview */}
            <div className="border-t border-border pt-4 mt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div className="rounded-xl border border-border overflow-hidden" style={{ backgroundColor: cores.bg_base || '#F8F8F8' }}>
                {/* Header bar */}
                <div className="h-8 flex items-center px-3" style={{ backgroundColor: cores.bg_surface || '#FFFFFF', borderBottom: '1px solid #e5e7eb' }}>
                  <span className="text-xs font-bold" style={{ color: cores.text_primary || '#111111' }}>Minha Loja</span>
                </div>
                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: cores.bg_surface || '#FFFFFF' }}>
                    <div className="h-3 w-24 rounded" style={{ backgroundColor: cores.text_primary || '#111111', opacity: 0.8 }} />
                    <div className="h-2 w-32 rounded" style={{ backgroundColor: cores.text_primary || '#111111', opacity: 0.4 }} />
                    <div className="flex gap-2 mt-2">
                      <div className="h-7 px-3 rounded-md flex items-center" style={{ backgroundColor: cores.brand_primary || '#E60023' }}>
                        <span className="text-[10px] font-semibold text-white">Comprar</span>
                      </div>
                      <div className="h-7 px-3 rounded-md flex items-center" style={{ backgroundColor: cores.brand_secondary || '#F1F1F2' }}>
                        <span className="text-[10px] font-semibold" style={{ color: cores.text_primary || '#111111' }}>Carrinho</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cores.whatsapp_button || '#25D366' }}>
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Code className="h-5 w-5 text-primary" />
              <Label className="text-base font-semibold">CSS Customizado (Global)</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Regras CSS aplicadas em toda a loja pública.</p>
            <Textarea className="font-mono text-sm" rows={10} placeholder={`.meu-botao {\n  background: #ff6600;\n}`} value={customCss} onChange={e => setCustomCss(e.target.value)} />
          </div>
        </TabsContent>

        {/* ===== FOOTER ===== */}
        <TabsContent value="footer" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-5 w-5 text-primary" />
              <Label className="text-base font-semibold">WhatsApp Flutuante</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Se preenchido, um botão flutuante aparecerá na loja.</p>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5511999999999" />
          </div>

          {/* Cores do Rodapé */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Cores do Rodapé</Label>
            <p className="text-xs text-muted-foreground">Defina cores independentes para o rodapé. Se vazio, herda as cores do tema global.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Cor de Fundo do Rodapé</Label>
                <div className="flex gap-1">
                  <Input value={footer.cores?.fundo || ''} onChange={e => updateFooterCores('fundo', e.target.value)} className="flex-1 text-xs" placeholder="Padrão: cor de superfície do tema" />
                  <input type="color" value={footer.cores?.fundo || '#ffffff'} onChange={e => updateFooterCores('fundo', e.target.value)} className="w-8 h-8 rounded border border-input cursor-pointer" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor do Texto do Rodapé</Label>
                <div className="flex gap-1">
                  <Input value={footer.cores?.texto || ''} onChange={e => updateFooterCores('texto', e.target.value)} className="flex-1 text-xs" placeholder="Padrão: cor de texto do tema" />
                  <input type="color" value={footer.cores?.texto || '#111111'} onChange={e => updateFooterCores('texto', e.target.value)} className="w-8 h-8 rounded border border-input cursor-pointer" />
                </div>
              </div>
            </div>
            {footer.cores && (footer.cores.fundo || footer.cores.texto) && (
              <Button variant="outline" size="sm" onClick={resetFooterCores}>Resetar para padrão</Button>
            )}
          </div>

          {/* Colunas do Rodapé */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Colunas do Rodapé</Label>
              {footer.colunas.length < 5 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={addColuna}><Plus className="h-3 w-3" /> Adicionar Coluna</Button>
              )}
            </div>
            {footer.colunas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma coluna configurada. Clique em "Adicionar Coluna" para começar.</p>
            )}
            <div className="space-y-4">
              {footer.colunas.map((col, colIdx) => (
                <div key={colIdx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input value={col.titulo} onChange={e => updateColuna(colIdx, 'titulo', e.target.value)} placeholder="Título da coluna" className="font-semibold flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeColuna(colIdx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {col.links.map((link, linkIdx) => (
                    <div key={linkIdx} className="flex gap-2 items-center">
                      <Input value={link.nome || (link as any).label || ''} onChange={e => updateLink(colIdx, linkIdx, 'nome', e.target.value)} placeholder="Nome do link" className="flex-1 text-xs" maxLength={50} />
                      <Input value={link.url || ''} onChange={e => updateLink(colIdx, linkIdx, 'url', e.target.value)} placeholder="/contato ou https://..." className="flex-1 text-xs" maxLength={500} />
                      <Button variant="ghost" size="icon" onClick={() => removeLinkFromColuna(colIdx, linkIdx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  {col.links.length < 8 && (
                    <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => addLinkToColuna(colIdx)}><Plus className="h-3 w-3" /> Adicionar Link</Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold block">Newsletter e Redes Sociais</Label>

            {/* Newsletter toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ativar Newsletter no Rodapé</Label>
              <Switch checked={footer.newsletter} onCheckedChange={v => setFooter({ ...footer, newsletter: v })} />
            </div>

            {/* Newsletter colors (only when newsletter is active) */}
            {footer.newsletter && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Cores da Newsletter</Label>
                <p className="text-xs text-muted-foreground">Se vazio, herda as cores do rodapé.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Cor de Fundo</Label>
                    <div className="flex gap-1">
                      <Input value={footer.newsletter_cores?.fundo || ''} onChange={e => updateNewsletterCores('fundo', e.target.value)} className="flex-1 text-xs" placeholder="Herda do rodapé" />
                      <input type="color" value={footer.newsletter_cores?.fundo || footer.cores?.fundo || '#1a1a2e'} onChange={e => updateNewsletterCores('fundo', e.target.value)} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor do Texto</Label>
                    <div className="flex gap-1">
                      <Input value={footer.newsletter_cores?.texto || ''} onChange={e => updateNewsletterCores('texto', e.target.value)} className="flex-1 text-xs" placeholder="Herda do rodapé" />
                      <input type="color" value={footer.newsletter_cores?.texto || footer.cores?.texto || '#ffffff'} onChange={e => updateNewsletterCores('texto', e.target.value)} className="w-8 h-8 rounded border border-input cursor-pointer" />
                    </div>
                  </div>
                </div>
                {footer.newsletter_cores && (footer.newsletter_cores.fundo || footer.newsletter_cores.texto) && (
                  <Button variant="outline" size="sm" onClick={resetNewsletterCores}>Resetar para padrão</Button>
                )}
              </div>
            )}

            {/* Redes Sociais */}
            <Label className="text-sm font-medium block pt-2">Redes Sociais</Label>
            {(['instagram', 'tiktok', 'facebook', 'youtube'] as const).map(rede => {
              const redeData = (footer.redes_sociais as any)[rede];
              const isAtivo = redeData?.ativo ?? false;
              return (
                <div key={rede} className="flex items-center gap-3">
                  <Switch checked={isAtivo} onCheckedChange={v => updateRede(rede, 'ativo', v)} />
                  <span className="text-sm capitalize w-20">{rede}</span>
                  <Input
                    value={redeData?.url || ''}
                    onChange={e => updateRede(rede, 'url', e.target.value)}
                    placeholder={`https://${rede}.com/...`}
                    className="flex-1 text-xs"
                    disabled={!isAtivo}
                  />
                </div>
              );
            })}
            <div className="pt-2 space-y-2">
              <Label className="text-base font-semibold block">Selos de Segurança</Label>
              <div className="flex items-center gap-3">
                <Switch checked={footer.selos.ativo} onCheckedChange={v => setFooter({ ...footer, selos: { ...footer.selos, ativo: v } })} />
                <Input value={footer.selos.url} onChange={e => setFooter({ ...footer, selos: { ...footer.selos, url: e.target.value } })} placeholder="URL (# = sem link)" className="flex-1 text-xs" disabled={!footer.selos.ativo} />
              </div>
          </div>

          {/* Personalizar Logo do Footer */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold block">Personalizar Logo do Footer</Label>
                <p className="text-xs text-muted-foreground mt-1">Ao ativar, o rodapé deixa de seguir a logo principal e usa uma logo exclusiva.</p>
              </div>
              <Switch
                checked={footer.footer_logo?.ativo ?? false}
                onCheckedChange={v => setFooter({
                  ...footer,
                  footer_logo: v
                    ? { ativo: true, tipo: 'upload', imagem_url: '', texto: '', fonte: 'Inter', tamanho: 48 }
                    : undefined,
                })}
              />
            </div>
            {footer.footer_logo?.ativo && (() => {
              const fl = footer.footer_logo;
              const updateFl = (partial: Partial<typeof fl>) => setFooter({ ...footer, footer_logo: { ...fl, ...partial } });
              return (
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <RadioGroup value={fl.tipo} onValueChange={(v: 'upload' | 'url' | 'texto') => updateFl({ tipo: v })} className="flex gap-4">
                    <div className="flex items-center gap-2"><RadioGroupItem value="upload" id="fl-upload" /><Label htmlFor="fl-upload" className="text-sm cursor-pointer">Upload</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="url" id="fl-url" /><Label htmlFor="fl-url" className="text-sm cursor-pointer">URL</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="texto" id="fl-texto" /><Label htmlFor="fl-texto" className="text-sm cursor-pointer">Texto</Label></div>
                  </RadioGroup>
                  {fl.tipo === 'upload' && id && <ImageUploader lojaId={id} value={fl.imagem_url} onChange={url => updateFl({ imagem_url: url })} placeholder="Envie a logo do footer" />}
                  {fl.tipo === 'url' && <Input value={fl.imagem_url} onChange={e => updateFl({ imagem_url: e.target.value })} placeholder="https://minha-loja.com/logo-footer.png" />}
                  {fl.tipo === 'texto' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs">Texto</Label><Input value={fl.texto} onChange={e => updateFl({ texto: e.target.value })} placeholder="Minha Loja" /></div>
                      <div><Label className="text-xs">Fonte</Label><Select value={fl.fonte} onValueChange={v => updateFl({ fonte: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Tamanho (px)</Label>
                    <Input type="number" min={24} max={120} value={fl.tamanho || 48} onChange={e => updateFl({ tamanho: parseInt(e.target.value) || 48 })} className="w-32" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
                    <div className="border border-border rounded-lg p-4 bg-background flex items-center justify-center min-h-[64px]">
                      {(fl.tipo === 'upload' || fl.tipo === 'url') && fl.imagem_url ? (
                        <img src={fl.imagem_url} alt="Logo Footer" style={{ maxHeight: `${fl.tamanho || 48}px` }} className="object-contain" />
                      ) : fl.tipo === 'texto' && fl.texto ? (
                        <span className="font-bold" style={{ fontFamily: fl.fonte, fontSize: `${Math.min((fl.tamanho || 48) * 0.5, 32)}px` }}>{fl.texto}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhuma logo configurada</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-base font-semibold">Textos do Rodapé</Label>
            <div><Label className="text-xs">Copyright / Desenvolvido por</Label><Input value={footer.texto_copyright} onChange={e => setFooter({ ...footer, texto_copyright: e.target.value })} placeholder="© 2025 Minha Loja" /></div>
            <div><Label className="text-xs">Endereço da Empresa</Label><Input value={footer.texto_endereco} onChange={e => setFooter({ ...footer, texto_endereco: e.target.value })} placeholder="Rua..." /></div>
            <div><Label className="text-xs">CNPJ</Label><Input value={footer.texto_cnpj} onChange={e => setFooter({ ...footer, texto_cnpj: e.target.value })} placeholder="00.000.000/0001-00" /></div>
          </div>
        </TabsContent>
      </Tabs>

      <Button className="mt-6 gap-2" onClick={handleSaveAll} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Todas as Configurações'}</Button>
    </div>
  );
};

export default LojaTemas;