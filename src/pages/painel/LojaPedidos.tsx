import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { usePedidos, useCarrinhosAbandonados, usePedido, useAddRastreio, useAddObservacao, useAlterarStatus } from '@/hooks/usePedidos';
import { ShoppingCart, Search, Filter, Package, Eye, Truck, Copy, Check, X, ChevronLeft, ChevronRight, ExternalLink, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { Pedido, CarrinhoAbandonado } from '@/services/saas-api';

// === STATUS UNIVERSAL (BYOG-ready) ===
const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  pendente:   { label: 'Aguardando Pagamento', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  em_analise: { label: 'Em Análise',           classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  pago:       { label: 'Pago',                 classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  recusado:   { label: 'Cancelado / Recusado',  classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  estornado:  { label: 'Reembolsado',           classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400' },
  chargeback: { label: 'Chargeback',            classes: 'bg-red-200 text-red-900 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
  // Legados (fallback visual)
  enviado:    { label: 'Enviado (legado)',       classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  entregue:   { label: 'Entregue (legado)',      classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelado:  { label: 'Cancelado (legado)',     classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function getStatusBadge(status: string) {
  const mapped = STATUS_MAP[status];
  if (mapped) return mapped;
  // Fallback para qualquer status desconhecido
  return { label: status.charAt(0).toUpperCase() + status.slice(1), classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
}

const ETAPA_LABELS: Record<string, string> = {
  customer: 'Dados Pessoais',
  shipping: 'Endereço',
  payment: 'Pagamento',
};

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const LojaPedidos = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const filters = {
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: perPage,
  };

  const { data: pedidosData, isLoading } = usePedidos(id, filters);
  const { data: carrinhos = [] } = useCarrinhosAbandonados(id);

  // Detail panel
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const { data: selectedPedido } = usePedido(selectedPedidoId || undefined);

  // Abandoned cart detail
  const [selectedCarrinho, setSelectedCarrinho] = useState<CarrinhoAbandonado | null>(null);

  // Carrinhos search & filter
  const [carrinhoSearch, setCarrinhoSearch] = useState('');
  const [carrinhoEtapaFilter, setCarrinhoEtapaFilter] = useState('all');

  const filteredCarrinhos = useMemo(() => {
    let filtered = carrinhos;
    if (carrinhoEtapaFilter !== 'all') {
      filtered = filtered.filter((c: CarrinhoAbandonado) => c.etapa === carrinhoEtapaFilter);
    }
    if (carrinhoSearch.trim()) {
      const q = carrinhoSearch.toLowerCase();
      filtered = filtered.filter((c: CarrinhoAbandonado) =>
        (c.cliente?.nome || '').toLowerCase().includes(q) ||
        (c.cliente?.email || '').toLowerCase().includes(q) ||
        (c.cliente?.telefone || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [carrinhos, carrinhoSearch, carrinhoEtapaFilter]);

  const addRastreio = useAddRastreio();
  const addObservacao = useAddObservacao();
  const alterarStatus = useAlterarStatus();

  const [rastreioInput, setRastreioInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const obsDebounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (selectedPedido) {
      setRastreioInput(selectedPedido.rastreio || '');
      setObsInput(selectedPedido.observacoes_internas || '');
    }
  }, [selectedPedido?._id]);

  const handleObsChange = useCallback((text: string) => {
    setObsInput(text);
    if (obsDebounceRef.current) clearTimeout(obsDebounceRef.current);
    obsDebounceRef.current = setTimeout(() => {
      if (selectedPedidoId) {
        addObservacao.mutate({ id: selectedPedidoId, texto: text });
      }
    }, 1500);
  }, [selectedPedidoId, addObservacao]);

  const handleSaveRastreio = () => {
    if (!selectedPedidoId || !rastreioInput.trim()) return;
    addRastreio.mutate({ id: selectedPedidoId, codigo: rastreioInput.trim() }, {
      onSuccess: () => toast.success('Rastreio salvo e cliente notificado!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedPedidoId) return;
    alterarStatus.mutate({ id: selectedPedidoId, status: newStatus }, {
      onSuccess: () => toast.success('Status atualizado!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  // CSV Export for carrinhos
  const exportCarrinhosCSV = () => {
    if (!carrinhos.length) return toast.error('Nenhum dado para exportar');
    const header = 'Data,Nome,Email,Celular,Etapa,Valor,PIX Code,UTMs\n';
    const rows = carrinhos.map((c: CarrinhoAbandonado) =>
      `"${formatDate(c.criado_em)}","${c.cliente?.nome || ''}","${c.cliente?.email || ''}","${c.cliente?.telefone || ''}","${ETAPA_LABELS[c.etapa] || c.etapa}","${formatPrice(c.total)}","${c.pix_code || ''}","${JSON.stringify(c.utms || {})}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'carrinhos-abandonados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const [copiedPix, setCopiedPix] = useState<string | null>(null);
  const copyPix = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedPix(code);
    toast.success('PIX copiado!');
    setTimeout(() => setCopiedPix(null), 2000);
  };

  // Generate recovery link for abandoned cart
  const getRecoveryLink = (c: CarrinhoAbandonado) => {
    const productIds = c.itens?.map(i => `${i.product_id}:${i.quantity}`).join(',') || '';
    return `/checkout?recovery=${encodeURIComponent(productIds)}`;
  };

  const copyRecoveryLink = async (c: CarrinhoAbandonado) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}${getRecoveryLink(c)}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link de recuperação copiado!');
  };

  const totalPages = pedidosData ? Math.ceil(pedidosData.total / perPage) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos — {loja?.nome}</h1>

      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">Meus Pedidos</TabsTrigger>
          <TabsTrigger value="abandonados">Carrinho Abandonado ({carrinhos.length})</TabsTrigger>
        </TabsList>

        {/* ====== PEDIDOS TAB ====== */}
        <TabsContent value="pedidos" className="mt-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº, nome ou email..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="recusado">Cancelado / Recusado</SelectItem>
                <SelectItem value="estornado">Reembolsado</SelectItem>
                <SelectItem value="chargeback">Chargeback</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20/pág</SelectItem>
                <SelectItem value="50">50/pág</SelectItem>
                <SelectItem value="100">100/pág</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : !pedidosData?.pedidos?.length ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Nenhum pedido registrado</p>
              <p className="text-sm text-muted-foreground">Os pedidos aparecerão aqui quando seus clientes comprarem.</p>
            </div>
          ) : (
            <>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Valor</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Data</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Rastreio</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosData.pedidos.map((p: Pedido) => (
                      <tr key={p._id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedPedidoId(p._id)}>
                        <td className="p-3 font-mono font-bold">{p.numero}</td>
                        <td className="p-3">
                          <p className="font-medium truncate max-w-[150px]">{p.cliente?.nome || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{p.cliente?.email || ''}</p>
                        </td>
                        <td className="p-3 hidden sm:table-cell font-semibold">{formatPrice(p.total)}</td>
                        <td className="p-3">
                          {(() => { const b = getStatusBadge(p.status); return (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.classes}`}>{b.label}</span>
                          ); })()}
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(p.criado_em)}</td>
                        <td className="p-3 hidden md:table-cell">
                          {p.rastreio ? <Truck className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">{pedidosData.total} pedido(s)</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ====== CARRINHOS ABANDONADOS TAB ====== */}
        <TabsContent value="abandonados" className="mt-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou celular..."
                className="pl-9"
                value={carrinhoSearch}
                onChange={e => setCarrinhoSearch(e.target.value)}
              />
            </div>
            <Select value={carrinhoEtapaFilter} onValueChange={v => setCarrinhoEtapaFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Etapas</SelectItem>
                <SelectItem value="customer">Dados Pessoais</SelectItem>
                <SelectItem value="shipping">Endereço</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCarrinhosCSV}>Exportar CSV</Button>
          </div>

          {!filteredCarrinhos.length ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Nenhum carrinho abandonado</p>
              <p className="text-sm text-muted-foreground">Carrinhos serão registrados quando clientes avançarem nas etapas do checkout.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Celular</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Valor</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Pagamento</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCarrinhos.map((c: CarrinhoAbandonado) => (
                    <tr key={c._id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedCarrinho(c)}>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(c.criado_em)}</td>
                      <td className="p-3 font-medium truncate max-w-[120px]">{c.cliente?.nome || '—'}</td>
                      <td className="p-3 hidden sm:table-cell truncate max-w-[150px]">{c.cliente?.email || '—'}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{c.cliente?.telefone || '—'}</td>
                      <td className="p-3 hidden sm:table-cell font-semibold">{formatPrice(c.total)}</td>
                      <td className="p-3 hidden md:table-cell">
                        {c.pix_code ? (
                          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); copyPix(c.pix_code!); }}>
                            {copiedPix === c.pix_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            Copiar PIX
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">{ETAPA_LABELS[c.etapa] || c.etapa}</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ====== PEDIDO DETAIL SHEET ====== */}
      <Sheet open={!!selectedPedidoId} onOpenChange={open => !open && setSelectedPedidoId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedPedido && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Pedido #{selectedPedido.numero}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={selectedPedido.status} onValueChange={handleStatusChange}>
                    <SelectTrigger><SelectValue>{getStatusBadge(selectedPedido.status).label}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="recusado">Cancelado / Recusado</SelectItem>
                      <SelectItem value="estornado">Reembolsado</SelectItem>
                      <SelectItem value="chargeback">Chargeback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cliente */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Cliente</h4>
                  <div className="text-sm space-y-1">
                    <p>{selectedPedido.cliente?.nome || '—'}</p>
                    <p className="text-muted-foreground">{selectedPedido.cliente?.email}</p>
                    <p className="text-muted-foreground">{selectedPedido.cliente?.telefone}</p>
                    <p className="text-muted-foreground">CPF: {selectedPedido.cliente?.cpf}</p>
                  </div>
                </div>

                {/* Endereço */}
                {selectedPedido.endereco && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Endereço</h4>
                    <p className="text-sm">
                      {selectedPedido.endereco.rua}, {selectedPedido.endereco.numero}
                      {selectedPedido.endereco.complemento ? ` - ${selectedPedido.endereco.complemento}` : ''}
                      <br />{selectedPedido.endereco.bairro} - {selectedPedido.endereco.cidade}/{selectedPedido.endereco.estado}
                      <br />CEP: {selectedPedido.endereco.cep}
                    </p>
                  </div>
                )}

                {/* Itens */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Itens</h4>
                  <div className="space-y-2">
                    {selectedPedido.itens.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                        {item.image && <img src={item.image} alt={item.name} className="h-10 w-8 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.variacao && <p className="text-xs text-muted-foreground">{item.variacao}</p>}
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(selectedPedido.subtotal)}</span></div>
                  {selectedPedido.desconto > 0 && <div className="flex justify-between text-primary"><span>Desconto</span><span>-{formatPrice(selectedPedido.desconto)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{selectedPedido.frete === 0 ? 'Grátis' : formatPrice(selectedPedido.frete)}</span></div>
                  {selectedPedido.cupom && <div className="flex justify-between text-primary"><span>Cupom: {selectedPedido.cupom.codigo}</span><span>-{formatPrice(selectedPedido.cupom.valor)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatPrice(selectedPedido.total)}</span></div>
                </div>

                {/* Rastreio */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Código de Rastreio</label>
                  <div className="flex gap-2">
                    <Input value={rastreioInput} onChange={e => setRastreioInput(e.target.value)} placeholder="BR123456789XX" />
                    <Button size="sm" onClick={handleSaveRastreio} disabled={addRastreio.isPending}>
                      {addRastreio.isPending ? '...' : 'Salvar e Notificar'}
                    </Button>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações Internas</label>
                  <Textarea
                    value={obsInput}
                    onChange={e => handleObsChange(e.target.value)}
                    placeholder="Notas internas sobre este pedido..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Salvo automaticamente</p>
                </div>

                {/* UTMs */}
                {selectedPedido.utms && Object.keys(selectedPedido.utms).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Tag className="h-4 w-4" /> UTMs</h4>
                    <div className="text-xs space-y-1 font-mono">
                      {Object.entries(selectedPedido.utms).map(([k, v]) => (
                        <p key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ====== CARRINHO ABANDONADO DETAIL SHEET ====== */}
      <Sheet open={!!selectedCarrinho} onOpenChange={open => !open && setSelectedCarrinho(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCarrinho && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho Abandonado
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Etapa */}
                <div>
                  <Badge variant="outline" className="text-xs">{ETAPA_LABELS[selectedCarrinho.etapa] || selectedCarrinho.etapa}</Badge>
                  <span className="text-xs text-muted-foreground ml-2">{formatDate(selectedCarrinho.criado_em)}</span>
                </div>

                {/* Cliente */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Cliente</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Nome:</span> {selectedCarrinho.cliente?.nome || '—'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedCarrinho.cliente?.email || '—'}</p>
                    <p><span className="text-muted-foreground">Celular:</span> {selectedCarrinho.cliente?.telefone || '—'}</p>
                    <p><span className="text-muted-foreground">CPF:</span> {selectedCarrinho.cliente?.cpf || '—'}</p>
                  </div>
                </div>

                {/* Endereço (if available) */}
                {selectedCarrinho.endereco && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Endereço</h4>
                    <p className="text-sm">
                      {selectedCarrinho.endereco.rua}, {selectedCarrinho.endereco.numero}
                      {selectedCarrinho.endereco.complemento ? ` - ${selectedCarrinho.endereco.complemento}` : ''}
                      <br />{selectedCarrinho.endereco.bairro} - {selectedCarrinho.endereco.cidade}/{selectedCarrinho.endereco.estado}
                      <br />CEP: {selectedCarrinho.endereco.cep}
                    </p>
                  </div>
                )}

                {/* Itens */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Produtos Abandonados</h4>
                  {selectedCarrinho.itens?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCarrinho.itens.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum item registrado</p>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{formatPrice(selectedCarrinho.total)}</span>
                  </div>
                </div>

                {/* PIX */}
                {selectedCarrinho.pix_code && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Código PIX</label>
                    <div className="flex gap-2">
                      <Input value={selectedCarrinho.pix_code} readOnly className="text-xs font-mono" />
                      <Button variant="outline" size="sm" onClick={() => copyPix(selectedCarrinho.pix_code!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* UTMs */}
                {selectedCarrinho.utms && Object.keys(selectedCarrinho.utms).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Tag className="h-4 w-4" /> UTMs</h4>
                    <div className="text-xs space-y-1 font-mono">
                      {Object.entries(selectedCarrinho.utms).map(([k, v]) => (
                        <p key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recovery Link */}
                {selectedCarrinho.itens?.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Link de Recuperação</label>
                    <div className="flex gap-2">
                      <Input value={`${window.location.origin}${getRecoveryLink(selectedCarrinho)}`} readOnly className="text-xs" />
                      <Button variant="outline" size="sm" onClick={() => copyRecoveryLink(selectedCarrinho)} className="gap-1 shrink-0">
                        <Copy className="h-4 w-4" /> Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Envie este link ao cliente para ele retomar a compra</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LojaPedidos;
