import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';
import { ContentTransition } from '@/components/PageTransition';
import { useEffect } from 'react';
import {
  Store, Users, Settings, BarChart3, LogOut, ShieldCheck, ChevronDown, Loader2, Sun, Moon, Monitor, Bell, MessageSquare, Plug, CreditCard
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const NAV_ITEMS = [
  { to: '/admin/lojistas', label: 'Lojistas', icon: Store },
  { to: '/admin/planos', label: 'Planos', icon: CreditCard },
  { to: '/admin/equipe', label: 'Equipe SaaS', icon: Users },
  { to: '/admin/avisos', label: 'Avisos', icon: Bell },
  { to: '/admin/tickets', label: 'Tickets', icon: ShieldCheck },
  { to: '/admin/pacotes-comentarios', label: 'Pacotes', icon: MessageSquare },
  { to: '/admin/integracoes', label: 'Integrações', icon: Plug },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/admin/estatisticas', label: 'Estatísticas', icon: BarChart3 },
];

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { theme, themeChoice, toggleTheme } = useTheme();
  const { brandName } = useSaaSBrand();
  useFaviconUpdater();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic title: {menuLabel} · Admin · {brandName}
  useEffect(() => {
    const active = NAV_ITEMS.find(item => location.pathname.startsWith(item.to));
    const menuLabel = active?.label || 'Painel';
    document.title = `${menuLabel} · Admin · ${brandName}`;
  }, [location.pathname, brandName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/admin/login');
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const ThemeIcon = themeChoice === 'dark' ? Sun : themeChoice === 'light' ? Moon : Monitor;
  const themeLabel = themeChoice === 'dark' ? 'Modo Claro' : themeChoice === 'light' ? 'Modo Escuro' : 'Seguir Sistema';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/admin/lojistas" className="flex items-center gap-2">
            <SaaSLogo context="panel" theme="auto" nameClassName="text-sidebar-foreground" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              title={themeLabel}
            >
              {<ThemeIcon className="h-4 w-4" />}
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  ADM
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sidebar-foreground truncate">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">Administrador</div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2 text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ContentTransition>
          <Outlet />
        </ContentTransition>
      </main>
    </div>
  );
};

export default AdminLayout;
