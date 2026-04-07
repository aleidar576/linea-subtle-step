import { useState, useEffect, Suspense } from 'react';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { lojistaApi, planosApi, type LojistaProfile, type Plano } from '@/services/saas-api';
import { settingsApi } from '@/services/api';
import { useLojas, useCreateLoja } from '@/hooks/useLojas';
import { useTheme } from '@/hooks/useTheme';
import { useNotificacoes, useMarcarTodasLidas } from '@/hooks/useNotificacoes';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';
import { ContentTransition } from '@/components/PageTransition';
import GlobalLoader from '@/components/ui/GlobalLoader';
import GlobalSearch from '@/components/layout/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Store, Home, Plus, LogOut, User, CreditCard, ChevronDown, ChevronRight,
  Loader2, BarChart3, Package, Settings, ShoppingCart, Boxes, Truck,
  Users, Image, Tag, Sun, Moon, Monitor,
  Code, FileText, Bell, TrendingUp, Star, Mail, AlertTriangle, Megaphone, StoreIcon,
  LayoutTemplate,
  Search,
  LayoutDashboard,
  HelpCircle,
  ChevronsUpDown,
  Ticket,
  Link as LinkIcon
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Loja } from '@/services/saas-api';

// --- Icon Helpers ---
// Mapeamos os ícones do Material Symbols (usados no HTML) para os mais próximos do Lucide-React
const getLucideIcon = (materialName: string) => {
  switch (materialName) {
    case 'dashboard': return BarChart3;
    case 'analytics': return TrendingUp;
    case 'inventory_2': return Package;
    case 'category': return Boxes;
    case 'storage': return FileText;
    case 'shopping_cart': return ShoppingCart;
    case 'group': return Users;
    case 'bar_chart': return BarChart3;
    case 'palette': return LayoutTemplate;
    case 'description': return FileText;
    case 'campaign': return Megaphone;
    case 'settings': return Settings;
    case 'help': return HelpCircle;
    case 'logout': return LogOut;
    case 'add_circle': return Plus;
    case 'unfold_more': return ChevronsUpDown;
    case 'star': return Star;
    case 'image': return Image;
    case 'tag': return Ticket;
    case 'mail': return Mail;
    case 'code': return Code;
    case 'store': return StoreIcon;
    case 'truck': return Truck;
    case 'credit_card': return CreditCard;
    case 'link': return LinkIcon;
    default: return Tag;
  }
};

// Grouped submenu structure (adapted for the new sidebar)
const MENU_GROUPS = [
  {
    label: 'Inventário',
    iconName: 'inventory_2',
    items: [
      { path: '/produtos', label: 'Produtos', iconName: 'inventory_2' },
      { path: '/categorias', label: 'Categorias', iconName: 'category' },
      { path: '/estoque', label: 'Estoque', iconName: 'storage' },
      { path: '/pacotes-avaliacoes', label: 'Avaliações', iconName: 'star' },
    ],
  },
  {
    label: 'Vendas',
    iconName: 'shopping_cart',
    items: [
      { path: '/pedidos', label: 'Pedidos', iconName: 'shopping_cart' },
      { path: '/clientes', label: 'Clientes', iconName: 'group' },
      { path: '/relatorios', label: 'Relatórios', iconName: 'bar_chart' },
    ],
  },
  {
    label: 'Personalização',
    iconName: 'palette',
    items: [
      { path: '/temas', label: 'Temas', iconName: 'palette' },
      { path: '/paginas', label: 'Páginas', iconName: 'description' },
      { path: '/conteudo', label: 'Conteúdo', iconName: 'image' },
    ],
  },
  {
    label: 'Marketing',
    iconName: 'campaign',
    items: [
      { path: '/cupons', label: 'Cupons', iconName: 'tag' },
      { path: '/newsletter', label: 'Newsletter', iconName: 'mail' },
      { path: '/pixels', label: 'Pixels & Scripts', iconName: 'code' },
    ],
  },
  {
    label: 'Administração',
    iconName: 'settings',
    items: [
      { path: '/perfil-loja', label: 'Perfil da Loja', iconName: 'store' },
      { path: '/fretes', label: 'Fretes', iconName: 'truck' },
      { path: '/gateways', label: 'Gateways', iconName: 'credit_card' },
      { path: '/integracoes', label: 'Integrações', iconName: 'link' },
      { path: '/configuracoes', label: 'Configurações', iconName: 'settings' },
    ],
  },
];

// Flat list for title resolution
const ALL_SUBMENUS = [
  { path: '', label: 'Overview' },
  ...MENU_GROUPS.flatMap(g => g.items),
];

const PainelLayout = () => {
  const { user, loading: authLoading, logout, isAuthenticated } = useLojistaAuth();
  const { data: lojas, isLoading: lojasLoading } = useLojas();
  const { theme, themeChoice, toggleTheme } = useTheme();
  const { data: notificacoes } = useNotificacoes();
  const marcarTodasLidas = useMarcarTodasLidas();
  const { brandName } = useSaaSBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({ pedidos_pendentes: false, pedidos_pagos: false });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [lojistaProfile, setLojistaProfile] = useState<LojistaProfile | null>(null);
  const [planosList, setPlanosList] = useState<Plano[]>([]);
  const { toast } = useToast();
  const [diasToleranciaInadimplencia, setDiasToleranciaInadimplencia] = useState(5);
  const [diasToleranciaTaxas, setDiasToleranciaTaxas] = useState(3);
  
  // State para o switcher de lojas (o select superior)
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = useState(false);
  // State para a loja selecionada atualmente no switcher (se a URL não definir uma)
  const [activeLojaFallback, setActiveLojaFallback] = useState<Loja | null>(null);

  useFaviconUpdater();

  useEffect(() => {
    Promise.all([lojistaApi.perfil(), planosApi.list()])
      .then(([prof, pl]) => { setLojistaProfile(prof); setPlanosList(pl); })
      .catch(() => {});
    settingsApi.getByKeys(['dias_tolerancia_inadimplencia', 'dias_tolerancia_taxas'])
      .then(settings => {
        const sInad = settings.find(s => s.key === 'dias_tolerancia_inadimplencia');
        if (sInad?.value) setDiasToleranciaInadimplencia(Number(sInad.value) || 5);
        const sTaxas = settings.find(s => s.key === 'dias_tolerancia_taxas');
        if (sTaxas?.value) setDiasToleranciaTaxas(Number(sTaxas.value) || 3);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      lojistaApi.perfil().then(prof => setLojistaProfile(prof)).catch(() => {});
    };
    window.addEventListener('refresh-lojista-profile', handleRefresh);
    return () => window.removeEventListener('refresh-lojista-profile', handleRefresh);
  }, []);

  const safeLojas = Array.isArray(lojas) ? lojas.filter(l => l.is_active) : [];
  
  // Extrai a loja da URL
  const lojaMatch = location.pathname.match(/\/painel\/loja\/([^/]+)/);
  const urlLojaId = lojaMatch ? lojaMatch[1] : null;
  const currentLoja = urlLojaId ? safeLojas.find(l => l._id === urlLojaId) : (activeLojaFallback || (safeLojas.length > 0 ? safeLojas[0] : null));

  // Auto-set fallback store if we have stores but no active fallback and not in a store URL
  useEffect(() => {
     if (!urlLojaId && safeLojas.length > 0 && !activeLojaFallback) {
         setActiveLojaFallback(safeLojas[0]);
     }
  }, [safeLojas, urlLojaId, activeLojaFallback]);


  useEffect(() => {
    if (lojaMatch) {
      const lojaName = currentLoja?.nome || 'Loja';
      const afterLojaId = location.pathname.replace(`/painel/loja/${urlLojaId}`, '');
      const activeSub = ALL_SUBMENUS.find(sub => {
        if (sub.path === '') return afterLojaId === '' || afterLojaId === '/';
        return afterLojaId.startsWith(sub.path);
      });
      const menuLabel = activeSub?.label || 'Overview';
      document.title = `${lojaName} · ${menuLabel} · ${brandName}`;
    } else {
      document.title = `Painel · ${brandName}`;
    }
  }, [location.pathname, currentLoja, brandName, lojaMatch, urlLojaId]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const ThemeIcon = themeChoice === 'dark' ? Sun : themeChoice === 'light' ? Moon : Monitor;
  const themeLabel = themeChoice === 'dark' ? 'Modo Escuro' : themeChoice === 'light' ? 'Modo Claro' : 'Modo Sistema';
  const safeNotifs = Array.isArray(notificacoes) ? notificacoes : [];
  const unreadCount = safeNotifs.filter(n => !n.lida).length;

  const handleSaveEmailPrefs = async () => {
    setSavingPrefs(true);
    try {
      await lojistaApi.atualizar({ config_emails: { ...emailPrefs, alteracao_senha: true } } as any);
      toast({ title: 'Preferências salvas!' });
      setShowNotifPrefs(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLojaSelect = (lojaId: string) => {
      setIsStoreSwitcherOpen(false);
      // Ao selecionar a loja no menu superior, mandamos para o overview dela
      navigate(`/painel/loja/${lojaId}`);
  };

  const isGlobalVisionActive = location.pathname === '/painel';
  const basePath = currentLoja ? `/painel/loja/${currentLoja._id}` : '/painel';
  const afterLojaId = currentLoja ? location.pathname.replace(`/painel/loja/${currentLoja._id}`, '') : '';
  const isOverviewActive = !isGlobalVisionActive && (afterLojaId === '' || afterLojaId === '/');

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground font-body overflow-hidden">
      
      {/* Full-Height SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-card border-r border-border flex flex-col py-6 px-4 font-headline tracking-tight z-50">
        
        {/* Brand Header / Store Switcher */}
        <div className="mb-6 px-2">
            <DropdownMenu open={isStoreSwitcherOpen} onOpenChange={setIsStoreSwitcherOpen}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 px-2 py-2.5 bg-accent/40 hover:bg-accent rounded-xl cursor-pointer transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black shrink-0 overflow-hidden shadow-sm">
                    {currentLoja?.icone ? (
                         <img src={currentLoja.icone} alt="Loja Icon" className="w-full h-full object-cover" />
                    ) : (
                         currentLoja?.nome?.slice(0, 2).toUpperCase() || 'LJ'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{currentLoja?.nome || 'Selecione a Loja'}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Ecommerce Manager</p>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                 {lojasLoading ? (
                    <div className="p-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                 ) : (
                    safeLojas.map(loja => (
                      <DropdownMenuItem key={loja._id} onClick={() => handleLojaSelect(loja._id)} className="cursor-pointer">
                         <Store className="w-4 h-4 mr-2" />
                         {loja.nome}
                      </DropdownMenuItem>
                    ))
                 )}
                 <DropdownMenuSeparator />
                 <CreateLojaDialogTrigger />
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1">
            
            {/* Visão Global (Global Dashboard) */}
            <Link 
              to="/painel" 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isGlobalVisionActive 
                  ? 'text-primary border-r-2 border-primary bg-primary/10 active:scale-95' 
                  : 'text-muted-foreground hover:text-primary hover:bg-accent/50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-bold">Visão Global</span>
            </Link>

            {/* Overview (Current Store Dashboard) */}
            <Link 
              to={basePath} 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                 isOverviewActive
                  ? 'text-primary border-r-2 border-primary bg-primary/10 active:scale-95' 
                  : 'text-muted-foreground hover:text-primary hover:bg-accent/50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-bold">Overview</span>
            </Link>

            {/* Mapeamento dos Menus Dinâmicos da Loja Atual */}
            {currentLoja && MENU_GROUPS.map((group) => {
                 // Ao invés de collapsible, o HTML mostrou grupos estáticos com títulos miúdos
                 return (
                    <div key={group.label} className="mt-2">
                        <div className="mb-1 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4">
                           {group.label}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {group.items.map(item => {
                                const fullPath = `${basePath}${item.path}`;
                                const isActive = !isGlobalVisionActive && afterLojaId.startsWith(item.path);
                                const Icon = getLucideIcon(item.iconName);
                                return (
                                    <Link 
                                      key={item.path}
                                      to={fullPath}
                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                        isActive 
                                         ? 'text-primary border-r-2 border-primary bg-primary/10' 
                                         : 'text-muted-foreground hover:text-primary hover:bg-accent/50'
                                      }`}
                                    >
                                      <Icon className="w-4 h-4 opacity-80" />
                                      <span className="font-semibold">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                 );
            })}

        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 space-y-2 border-t border-border/50">
          <Link to="/painel/produtos/novo" className="w-full flex items-center justify-center gap-2 py-3 mb-2 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-lg shadow-primary/20 scale-95 active:scale-90 transition-transform">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Link>
          
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-primary transition-colors text-left">
            <ThemeIcon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">{themeLabel}</span>
          </button>
          
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-destructive transition-colors text-left">
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="ml-64 flex flex-col min-h-screen bg-background flex-1 min-w-0">
        
        {/* TopNavBar */}
        <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-40 border-b border-border h-16 shrink-0 flex justify-between items-center w-full px-8 py-3">
          
          {/* Global Search Bar */}
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-full max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                 {/* Substituímos o input visual pelo componente real que lida com a busca */}
                 <div className="absolute inset-0 opacity-0 z-10">
                    <GlobalSearch lojaId={currentLoja?._id || ''} />
                 </div>
                 <Input className="w-full bg-slate-100 dark:bg-slate-100 border-none rounded-full pl-10 pr-4 h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800 placeholder:text-slate-400" placeholder="Buscar pedidos, produtos..." />
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background"></span>
                  )}
                </button>
              </DropdownMenuTrigger>
              {/* Notif content here */}
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                 <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                   <span className="text-sm font-semibold">Notificações</span>
                   {unreadCount > 0 && (
                     <button onClick={() => marcarTodasLidas.mutate()} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
                   )}
                 </div>
                 {!safeNotifs.length ? (
                   <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
                 ) : (
                   safeNotifs.slice(0, 20).map(n => (
                     <div key={n._id} className={`px-3 py-2 border-b border-border last:border-0 ${!n.lida ? 'bg-accent/30' : ''}`}>
                       <p className="text-sm font-medium">{n.titulo}</p>
                       <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                     </div>
                   ))
                 )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => navigate('/painel/configuracoes')} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
               <Settings className="w-5 h-5" />
            </button>
            
            <div className="h-8 w-px bg-border mx-2"></div>
            
            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-2 text-left hover:opacity-80 transition-opacity">
                    <div className="hidden sm:block text-right">
                       <p className="text-sm font-bold text-foreground">{user?.nome}</p>
                       <p className="text-[10px] text-muted-foreground">
                         {user?.modo_amigo ? 'VIP' : (lojistaProfile?.plano_id ? planosList.find(p => p._id === lojistaProfile.plano_id)?.nome : 'Free')}
                       </p>
                    </div>
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground ring-2 ring-primary/20">
                          {user?.nome?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                    )}
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/painel/perfil')}><User className="w-4 h-4" /> Perfil</DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/painel/assinatura')}><CreditCard className="w-4 h-4" /> Planos</DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setShowNotifPrefs(true)}><Bell className="w-4 h-4" /> Notificações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Dashboard Canvas (Main Route Outlet) */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Banners Administrativos */}
          {lojistaProfile?.subscription_status === 'past_due' && (() => {
            const toleranciaGlobal = diasToleranciaInadimplencia;
            const toleranciaExtra = (lojistaProfile as any)?.tolerancia_extra_dias || 0;
            const totalTolerancia = toleranciaGlobal + toleranciaExtra;
            const vencimento = lojistaProfile.data_vencimento ? new Date(lojistaProfile.data_vencimento) : null;
            const agora = new Date();
            const diffDias = vencimento ? Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const bloqueado = diffDias > totalTolerancia;

            if (bloqueado) {
              return (
                <div
                  className="mb-8 rounded-xl bg-destructive p-4 text-destructive-foreground text-center cursor-pointer font-bold shadow-lg shadow-destructive/20"
                  onClick={() => navigate('/painel/assinatura')}
                >
                  <AlertTriangle className="h-5 w-5 inline mr-2" />
                  SUA LOJA FOI BLOQUEADA, REGULARIZE AGORA CLICANDO AQUI
                </div>
              );
            }
            const dataLimite = vencimento ? new Date(vencimento.getTime() + totalTolerancia * 24 * 60 * 60 * 1000) : null;
            return (
              <div className="mb-8 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-center">
                <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-600" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                  Seu pagamento está pendente.{dataLimite && <> Regularize até <strong>{dataLimite.toLocaleDateString('pt-BR')}</strong>.</>}{' '}
                  <button onClick={() => navigate('/painel/assinatura')} className="underline font-bold">Regularize agora</button>
                </span>
              </div>
            );
          })()}

          <ContentTransition>
            <Suspense fallback={<GlobalLoader />}>
              <Outlet />
            </Suspense>
          </ContentTransition>
        </main>

      </div>

      {/* Email Preferences Dialog */}
      <Dialog open={showNotifPrefs} onOpenChange={setShowNotifPrefs}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Preferências de Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Pedidos Pendentes</Label>
              <Switch checked={emailPrefs.pedidos_pendentes} onCheckedChange={v => setEmailPrefs({ ...emailPrefs, pedidos_pendentes: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Pedidos Pagos</Label>
              <Switch checked={emailPrefs.pedidos_pagos} onCheckedChange={v => setEmailPrefs({ ...emailPrefs, pedidos_pagos: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Alteração de Senha</Label>
                <p className="text-xs text-muted-foreground">Obrigatório por segurança</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            <Button onClick={handleSaveEmailPrefs} className="w-full" disabled={savingPrefs}>
              {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente helper para disparar a criação de loja pelo Menu
const CreateLojaDialogTrigger = () => {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const createLoja = useCreateLoja();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLoja.mutateAsync({ nome });
      toast({ title: 'Loja criada!', description: `"${nome}" está pronta.` });
      setOpen(false);
      setNome('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-primary font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Criar Nova Loja
         </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Loja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome da Loja</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Minha Loja" required />
          </div>
          <Button type="submit" className="w-full" disabled={createLoja.isPending}>
            {createLoja.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Loja
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PainelLayout;

