import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { lojistaApi, planosApi, type LojistaProfile, type Plano } from '@/services/saas-api';
import { useLojas, useCreateLoja } from '@/hooks/useLojas';
import { useTheme } from '@/hooks/useTheme';
import { useNotificacoes, useMarcarTodasLidas } from '@/hooks/useNotificacoes';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';
import { ContentTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Store, Home, Plus, LogOut, User, CreditCard, ChevronDown, ChevronRight,
  Loader2, BarChart3, Package, Settings, ShoppingCart, Boxes, Truck,
  Users, Image, Tag, Sun, Moon, Monitor,
  Code, FileText, Bell, TrendingUp, Star, Mail, AlertTriangle, Megaphone, StoreIcon,
  LayoutTemplate
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Loja } from '@/services/saas-api';

// Grouped submenu structure
const MENU_GROUPS = [
  {
    label: 'Produtos',
    icon: Package,
    items: [
      { path: '/produtos', label: 'Produtos' },
      { path: '/categorias', label: 'Categorias' },
      { path: '/estoque', label: 'Estoque' },
      { path: '/pacotes-avaliacoes', label: 'Avaliações' },
    ],
  },
  {
    label: 'Vendas',
    icon: ShoppingCart,
    items: [
      { path: '/pedidos', label: 'Pedidos' },
      { path: '/clientes', label: 'Clientes' },
      { path: '/relatorios', label: 'Relatórios' },
    ],
  },
  {
    label: 'Loja Virtual',
    icon: LayoutTemplate,
    items: [
      { path: '/temas', label: 'Temas' },
      { path: '/paginas', label: 'Páginas' },
      { path: '/conteudo', label: 'Conteúdo' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { path: '/cupons', label: 'Cupons' },
      { path: '/newsletter', label: 'Newsletter' },
      { path: '/pixels', label: 'Pixels & Scripts' },
    ],
  },
  {
    label: 'Administração',
    icon: Settings,
    items: [
      { path: '/perfil-loja', label: 'Perfil da Loja' },
      { path: '/fretes', label: 'Fretes' },
      { path: '/gateways', label: 'Gateways' },
      { path: '/configuracoes', label: 'Configurações' },
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
  useFaviconUpdater();

  useEffect(() => {
    Promise.all([lojistaApi.perfil(), planosApi.list()])
      .then(([prof, pl]) => { setLojistaProfile(prof); setPlanosList(pl); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const safeLojas = Array.isArray(lojas) ? lojas : [];
    const lojaMatch = location.pathname.match(/\/painel\/loja\/([^/]+)/);
    if (lojaMatch) {
      const lojaId = lojaMatch[1];
      const currentLoja = safeLojas.find(l => l._id === lojaId);
      const lojaName = currentLoja?.nome || 'Loja';
      const afterLojaId = location.pathname.replace(`/painel/loja/${lojaId}`, '');
      const activeSub = ALL_SUBMENUS.find(sub => {
        if (sub.path === '') return afterLojaId === '' || afterLojaId === '/';
        return afterLojaId.startsWith(sub.path);
      });
      const menuLabel = activeSub?.label || 'Overview';
      document.title = `${lojaName} · ${menuLabel} · ${brandName}`;
    } else {
      document.title = `Painel · ${brandName}`;
    }
  }, [location.pathname, lojas, brandName]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const ThemeIcon = themeChoice === 'dark' ? Sun : themeChoice === 'light' ? Moon : Monitor;
  const themeLabel = themeChoice === 'dark' ? 'Modo Claro' : themeChoice === 'light' ? 'Modo Escuro' : 'Seguir Sistema';

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/painel" className="flex items-center gap-2">
            <SaaSLogo context="panel" theme="auto" nameClassName="text-sidebar-foreground" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-sidebar-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-thumb]:rounded-full">
          <Link
            to="/painel"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/painel'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Home className="h-4 w-4" /> Início
          </Link>

          <div className="pt-3 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lojas</div>

          {lojasLoading ? (
            <div className="px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : lojas && Array.isArray(lojas) && lojas.filter(l => l.is_active).length > 0 ? (
            lojas.filter(l => l.is_active).map(loja => (
              <LojaMenuItem key={loja._id} loja={loja} currentPath={location.pathname} />
            ))
          ) : null}

          <CreateLojaButton />
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              title={themeLabel}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>

            {/* Bell Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-semibold">Notificações</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => marcarTodasLidas.mutate()}
                      className="text-xs text-primary hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {!safeNotifs.length ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
                ) : (
                  safeNotifs.slice(0, 20).map(n => (
                    <div key={n._id} className={`px-3 py-2 border-b border-border last:border-0 ${!n.lida ? 'bg-accent/30' : ''}`}>
                      <p className="text-sm font-medium">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                    {user?.nome?.slice(0, 3).toUpperCase() || 'USR'}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sidebar-foreground truncate">{user?.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.modo_amigo ? (
                      <span className="inline-flex items-center gap-1 text-green-500 font-semibold">VIP</span>
                    ) : (
                      <span>{(() => {
                        const resolvedPlano = lojistaProfile?.plano_id
                          ? planosList.find(p => p._id === lojistaProfile.plano_id)
                          : null;
                        return resolvedPlano?.nome || 'Free';
                      })()}</span>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2" onClick={() => navigate('/painel/perfil')}><User className="h-4 w-4" /> Perfil</DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => navigate('/painel/assinatura')}><CreditCard className="h-4 w-4" /> Planos</DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => setShowNotifPrefs(true)}><Bell className="h-4 w-4" /> Notificações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => { logout(); navigate('/login'); }}>
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        {lojistaProfile?.subscription_status === 'past_due' && (() => {
          const toleranciaGlobal = 7;
          const toleranciaExtra = (lojistaProfile as any)?.tolerancia_extra_dias || 0;
          const totalTolerancia = toleranciaGlobal + toleranciaExtra;
          const vencimento = lojistaProfile.data_vencimento ? new Date(lojistaProfile.data_vencimento) : null;
          const agora = new Date();
          const diffDias = vencimento ? Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const bloqueado = diffDias > totalTolerancia;

          if (bloqueado) {
            return (
              <div
                className="mb-4 rounded-lg bg-destructive p-4 text-destructive-foreground text-center cursor-pointer font-bold"
                onClick={() => navigate('/painel/assinatura')}
              >
                <AlertTriangle className="h-5 w-5 inline mr-2" />
                SUA LOJA FOI BLOQUEADA, REGULARIZE AGORA CLICANDO AQUI
              </div>
            );
          }
          return (
            <div className="mb-4 rounded-lg bg-yellow-500/15 border border-yellow-500/30 p-4 text-center">
              <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                Seu pagamento está pendente. <button onClick={() => navigate('/painel/assinatura')} className="underline font-bold">Regularize agora</button>
              </span>
            </div>
          );
        })()}

        <ContentTransition>
          <Outlet />
        </ContentTransition>
      </main>

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

// === Loja Menu Item with grouped Collapsible submenus ===
const LojaMenuItem = ({ loja, currentPath }: { loja: Loja; currentPath: string }) => {
  const basePath = `/painel/loja/${loja._id}`;
  const isInThisLoja = currentPath.startsWith(basePath);
  const [open, setOpen] = useState(isInThisLoja);
  const afterLojaId = currentPath.replace(basePath, '');

  // Determine which group is active
  const activeGroupIndex = MENU_GROUPS.findIndex(g =>
    g.items.some(item => afterLojaId.startsWith(item.path))
  );

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
          isInThisLoja ? 'bg-sidebar-accent/50 text-sidebar-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
        }`}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Store className="h-4 w-4" />
        <span className="truncate flex-1 text-left">{loja.nome}</span>
      </button>
      {open && (
        <div className="ml-3 mt-1.5 space-y-1">
          {/* Overview (no group) */}
          <Link
            to={basePath}
            className={`relative flex items-center gap-2 pl-10 pr-3 py-2 text-[13px] rounded-md transition-colors ${
              (afterLojaId === '' || afterLojaId === '/')
                ? 'text-sidebar-accent-foreground bg-sidebar-accent/10 font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-1/2 before:w-[3px] before:bg-primary before:rounded-r-full'
                : 'text-muted-foreground font-medium hover:text-sidebar-foreground transition-colors'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Overview
          </Link>

          {/* Grouped menus */}
          {MENU_GROUPS.map((group, gi) => {
            const isGroupActive = gi === activeGroupIndex;
            const GroupIcon = group.icon;
            return (
              <Collapsible key={group.label} defaultOpen={isGroupActive}>
                <CollapsibleTrigger className="group text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground hover:text-sidebar-foreground transition-colors flex items-center w-full px-3 py-2">
                  <GroupIcon className="w-4 h-4 mr-3 shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className="ml-auto w-4 h-4 text-muted-foreground/60 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map(item => {
                      const fullPath = `${basePath}${item.path}`;
                      const isActive = afterLojaId.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={fullPath}
                          className={`relative block pl-10 pr-3 py-2 text-[13px] rounded-md transition-colors ${
                            isActive
                              ? 'text-sidebar-accent-foreground bg-sidebar-accent/10 font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-1/2 before:w-[3px] before:bg-primary before:rounded-r-full'
                              : 'text-muted-foreground font-medium hover:text-sidebar-foreground transition-colors'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateLojaButton = () => {
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
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm text-primary font-medium">
          <Plus className="h-4 w-4" /> Nova Loja
        </button>
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
