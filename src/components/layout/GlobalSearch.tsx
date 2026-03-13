import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command';
import {
  Search, Home, Package, ShoppingCart, Users, Settings, Truck, CreditCard,
  LayoutTemplate, FileText, Tag, Mail, Code, BarChart3, Store, User,
  Megaphone, Boxes, Star, Loader2, Image,
} from 'lucide-react';
import { lojaProductsApi, pedidosApi, clientesApi } from '@/services/saas-api';
import type { LojaProduct, Pedido, ClienteData } from '@/services/saas-api';

// ── Static Navigation Index ──
interface NavEntry {
  title: string;
  subtitle: string;
  group: string;
  path: string;
  icon: typeof Home;
  keywords: string[];
  absolute?: boolean; // true = route is not relative to /painel/loja/:id
}

const NAV_INDEX: NavEntry[] = [
  // Overview
  { title: 'Overview', subtitle: 'Visão geral da loja', group: 'Geral', path: '', icon: Home, keywords: ['inicio', 'dashboard', 'resumo'] },

  // Produtos
  { title: 'Produtos', subtitle: 'Produtos → Gerenciar Produtos', group: 'Produtos', path: '/produtos', icon: Package, keywords: ['produto', 'item', 'catalogo'] },
  { title: 'Categorias', subtitle: 'Produtos → Categorias', group: 'Produtos', path: '/categorias', icon: Boxes, keywords: ['categoria', 'classificacao'] },
  { title: 'Estoque', subtitle: 'Produtos → Controle de Estoque', group: 'Produtos', path: '/estoque', icon: Package, keywords: ['estoque', 'inventario', 'quantidade'] },
  { title: 'Avaliações', subtitle: 'Produtos → Pacotes de Avaliações', group: 'Produtos', path: '/pacotes-avaliacoes', icon: Star, keywords: ['avaliacao', 'review', 'comentario', 'nota'] },

  // Vendas
  { title: 'Pedidos', subtitle: 'Vendas → Meus Pedidos', group: 'Vendas', path: '/pedidos', icon: ShoppingCart, keywords: ['pedido', 'venda', 'order', 'compra'] },
  { title: 'Clientes', subtitle: 'Vendas → Clientes', group: 'Vendas', path: '/clientes', icon: Users, keywords: ['cliente', 'comprador', 'customer'] },
  { title: 'Relatórios', subtitle: 'Vendas → Relatórios', group: 'Vendas', path: '/relatorios', icon: BarChart3, keywords: ['relatorio', 'analytics', 'metricas', 'estatisticas'] },

  // Loja Virtual
  { title: 'Temas', subtitle: 'Loja Virtual → Temas', group: 'Loja Virtual', path: '/temas', icon: LayoutTemplate, keywords: ['tema', 'layout', 'design', 'visual'] },
  { title: 'Páginas', subtitle: 'Loja Virtual → Páginas', group: 'Loja Virtual', path: '/paginas', icon: FileText, keywords: ['pagina', 'page', 'sobre', 'politica'] },
  { title: 'Conteúdo', subtitle: 'Loja Virtual → Conteúdo', group: 'Loja Virtual', path: '/conteudo', icon: Image, keywords: ['conteudo', 'banner', 'homepage', 'slider'] },

  // Marketing
  { title: 'Cupons', subtitle: 'Marketing → Cupons de Desconto', group: 'Marketing', path: '/cupons', icon: Tag, keywords: ['cupom', 'desconto', 'voucher', 'promocao'] },
  { title: 'Newsletter', subtitle: 'Marketing → Newsletter', group: 'Marketing', path: '/newsletter', icon: Mail, keywords: ['newsletter', 'email', 'leads'] },
  { title: 'Pixels & Scripts', subtitle: 'Marketing → Pixels & Scripts', group: 'Marketing', path: '/pixels', icon: Code, keywords: ['pixel', 'facebook', 'google', 'tag', 'script', 'analytics'] },

  // Administração
  { title: 'Perfil da Loja', subtitle: 'Administração → Perfil da Loja', group: 'Administração', path: '/perfil-loja', icon: Store, keywords: ['perfil', 'nome', 'logo', 'endereco', 'loja'] },
  { title: 'Fretes', subtitle: 'Administração → Fretes', group: 'Administração', path: '/fretes', icon: Truck, keywords: ['frete', 'envio', 'entrega', 'correios', 'melhor envio'] },
  { title: 'Gateways', subtitle: 'Administração → Gateways de Pagamento', group: 'Administração', path: '/gateways', icon: CreditCard, keywords: ['gateway', 'pagamento', 'pix', 'cartao', 'appmax', 'sealpay'] },
  { title: 'Integrações', subtitle: 'Administração → Integrações', group: 'Administração', path: '/integracoes', icon: Code, keywords: ['integracao', 'api', 'webhook'] },
  { title: 'Configurações', subtitle: 'Administração → Configurações Gerais', group: 'Administração', path: '/configuracoes', icon: Settings, keywords: ['configuracao', 'dominio', 'orcamento', 'config'] },

  // Conta (absolute routes)
  { title: 'Meu Perfil', subtitle: 'Conta → Dados do Lojista', group: 'Conta', path: '/painel/perfil', icon: User, keywords: ['meu perfil', 'senha', 'minha conta'], absolute: true },
  { title: 'Assinatura', subtitle: 'Conta → Plano & Assinatura', group: 'Conta', path: '/painel/assinatura', icon: CreditCard, keywords: ['assinatura', 'plano', 'cobranca', 'billing', 'upgrade'], absolute: true },
];

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface GlobalSearchProps {
  lojaId: string | null;
}

export default function GlobalSearch({ lojaId }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  // Dynamic results
  const [dynProducts, setDynProducts] = useState<LojaProduct[]>([]);
  const [dynPedidos, setDynPedidos] = useState<Pedido[]>([]);
  const [dynClientes, setDynClientes] = useState<ClienteData[]>([]);
  const [dynLoading, setDynLoading] = useState(false);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Debounce ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── Dynamic fetch (lazy, >= 2 chars) ──
  useEffect(() => {
    if (!lojaId || debouncedQuery.length < 2) {
      setDynProducts([]);
      setDynPedidos([]);
      setDynClientes([]);
      return;
    }

    let cancelled = false;
    setDynLoading(true);

    Promise.allSettled([
      lojaProductsApi.list(lojaId),
      pedidosApi.list(lojaId, { search: debouncedQuery, per_page: 10 }),
      clientesApi.list(lojaId, debouncedQuery),
    ]).then(([prodRes, pedRes, cliRes]) => {
      if (cancelled) return;

      // Products: client-side filter
      if (prodRes.status === 'fulfilled') {
        const all = Array.isArray(prodRes.value) ? prodRes.value : [];
        const q = debouncedQuery.toLowerCase();
        setDynProducts(all.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5));
      }

      // Pedidos: already server-filtered
      if (pedRes.status === 'fulfilled') {
        const data = pedRes.value as any;
        const list = Array.isArray(data?.pedidos) ? data.pedidos : Array.isArray(data) ? data : [];
        setDynPedidos(list.slice(0, 5));
      }

      // Clientes
      if (cliRes.status === 'fulfilled') {
        const list = Array.isArray(cliRes.value) ? cliRes.value : [];
        setDynClientes(list.slice(0, 5));
      }

      setDynLoading(false);
    });

    return () => { cancelled = true; };
  }, [lojaId, debouncedQuery]);

  // ── Filter static nav ──
  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV_INDEX.filter(n => !n.absolute || true); // show all when empty
    const q = query.toLowerCase();
    return NAV_INDEX.filter(n => {
      if (n.absolute) return true; // always show account items
      return (
        n.title.toLowerCase().includes(q) ||
        n.subtitle.toLowerCase().includes(q) ||
        n.keywords.some(k => k.includes(q))
      );
    });
  }, [query]);

  // Group static results
  const groupedNav = useMemo(() => {
    const groups: Record<string, NavEntry[]> = {};
    for (const item of filteredNav) {
      if (!lojaId && !item.absolute) continue; // no loja selected, skip loja-specific
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredNav, lojaId]);

  const basePath = lojaId ? `/painel/loja/${lojaId}` : '';

  const handleSelect = useCallback((item: NavEntry) => {
    const target = item.absolute ? item.path : `${basePath}${item.path}`;
    navigate(target);
    setOpen(false);
    setQuery('');
  }, [navigate, basePath]);

  const handleProductSelect = useCallback((product: LojaProduct) => {
    navigate(`${basePath}/produtos?produto=${product._id}`);
    setOpen(false);
    setQuery('');
  }, [navigate, basePath]);

  const handlePedidoSelect = useCallback((pedido: Pedido) => {
    navigate(`${basePath}/pedidos?pedido=${pedido._id}`);
    setOpen(false);
    setQuery('');
  }, [navigate, basePath]);

  const handleClienteSelect = useCallback((cliente: ClienteData) => {
    navigate(`${basePath}/clientes?search=${encodeURIComponent(cliente.nome)}`);
    setOpen(false);
    setQuery('');
  }, [navigate, basePath]);

  const hasDynamicResults = dynProducts.length > 0 || dynPedidos.length > 0 || dynClientes.length > 0;
  const showDynamicSection = debouncedQuery.length >= 2;

  return (
    <>
      {/* ── Trigger bar ── */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full max-w-sm rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline flex-1 text-left">Buscar...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* ── Command Dialog ── */}
      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
        <CommandInput
          placeholder="Buscar páginas, produtos, pedidos, clientes..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            {dynLoading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Buscando...</span>
              </div>
            ) : (
              'Nenhum resultado encontrado.'
            )}
          </CommandEmpty>

          {/* ── Static Navigation Groups ── */}
          {Object.entries(groupedNav).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map(item => (
                <CommandItem
                  key={item.path}
                  value={`${item.title} ${item.subtitle} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {/* ── Dynamic Results ── */}
          {showDynamicSection && (
            <>
              {(hasDynamicResults || dynLoading) && <CommandSeparator />}

              {dynLoading && !hasDynamicResults && (
                <div className="flex items-center justify-center gap-2 py-4 px-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Buscando dados...</span>
                </div>
              )}

              {dynProducts.length > 0 && (
                <CommandGroup heading="Produtos">
                  {dynProducts.map(p => (
                    <CommandItem
                      key={p._id}
                      value={`produto ${p.name}`}
                      onSelect={() => handleProductSelect(p)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover shrink-0 border border-border" />
                      ) : (
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {dynPedidos.length > 0 && (
                <CommandGroup heading="Pedidos">
                  {dynPedidos.map(p => (
                    <CommandItem
                      key={p._id}
                      value={`pedido ${p.numero} ${p.cliente?.nome || ''}`}
                      onSelect={() => handlePedidoSelect(p)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Pedido #{p.numero}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.cliente?.nome || '—'} · {formatPrice(p.total)}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {dynClientes.length > 0 && (
                <CommandGroup heading="Clientes">
                  {dynClientes.map(c => (
                    <CommandItem
                      key={c._id}
                      value={`cliente ${c.nome} ${c.email}`}
                      onSelect={() => handleClienteSelect(c)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
