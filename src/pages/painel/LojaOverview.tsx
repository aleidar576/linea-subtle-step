import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { 
  Loader2, Eye, ShoppingCart, DollarSign, TrendingUp, CalendarDays, 
  Package, Search, Users, Activity, ExternalLink, ArrowUpRight, ArrowDownRight, 
  Settings, Truck, CreditCard, ChevronRight, Rocket, Check, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { relatoriosApi, type RelatorioData } from '@/services/saas-api';
import { getStoreDateRange, type PeriodoRange } from '@/lib/store-timezone';

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: '7 Dias', value: '7d' },
  { label: '30 Dias', value: '30d' },
  { label: 'Mês', value: 'month' },
  { label: 'Personalizado', value: 'custom' },
];

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LojaOverview = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const [periodo, setPeriodo] = useState('30d');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [draftDateFrom, setDraftDateFrom] = useState<Date | undefined>();
  const [draftDateTo, setDraftDateTo] = useState<Date | undefined>();
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  const dateRange = useMemo(() => getStoreDateRange(periodo as PeriodoRange, dateFrom, dateTo), [periodo, dateFrom, dateTo]);

  const periodoLabel = useMemo(() => {
    if (periodo === 'custom' && dateFrom && dateTo) {
      return `${format(dateFrom, 'dd/MM/yyyy', { locale: ptBR })} → ${format(dateTo, 'dd/MM/yyyy', { locale: ptBR })}`;
    }

    switch (periodo) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case 'month': return 'Este mês';
      case 'custom': return 'Período personalizado';
      default: return 'Últimos 30 dias';
    }
  }, [periodo, dateFrom, dateTo]);

  const canApplyCustomRange = !!draftDateFrom && !!draftDateTo;

  const handleSelectPreset = (value: string) => {
    setPeriodo(value);
    if (value !== 'custom') {
      setPopoverOpen(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (!draftDateFrom || !draftDateTo) return;
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setPeriodo('custom');
    setPopoverOpen(false);
  };

  const handleClearCustomRange = () => {
    setDraftDateFrom(undefined);
    setDraftDateTo(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPeriodo('30d');
  };

  useEffect(() => {
    if (!id) return;
    setLoadingRelatorio(true);
    relatoriosApi.get(id, dateRange.from, dateRange.to)
      .then(data => setRelatorio(data))
      .catch(() => setRelatorio(null))
      .finally(() => setLoadingRelatorio(false));
  }, [id, dateRange.from, dateRange.to]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!id) return null; // Prevenção contra undefined params se vazou da rota
  if (!loja) return <p className="text-muted-foreground">Loja não encontrada.</p>;

  const totalPedidos = relatorio?.totais?.pedidos || 0;
  const totalReceita = relatorio?.totais?.receita || 0;
  const ticketMedio = totalPedidos > 0 ? Math.round(totalReceita / totalPedidos) : 0;

  const totalVisitantes = relatorio?.totais?.visitantes || 0;

  const visitantesChartData = (relatorio?.visitantes_por_dia || []).map(d => ({
    date: d.date_key?.substring(5) || d.date_key,
    visitantes: d.visitantes_unicos || 0,
  }));

  const chartData = (relatorio?.vendas_por_dia || []).map(d => ({
    date: d._id?.substring(5) || d._id, // MM-DD
    valor: d.total / 100,
    pedidos: d.count,
  }));

  // Meta fictícia: R$ 10.000,00
  const metaValor = 1000000;
  const porcentagemMeta = Math.min(100, Math.round((totalReceita / metaValor) * 100));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* Header (Page Title & Actions) */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground font-medium">Performance em tempo real da loja <span className="text-primary font-bold">{loja.nome}</span>.</p>
        </div>
        
        <div className="flex gap-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="bg-card border border-border px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>{periodoLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-4 flex flex-col gap-4 bg-card border-border text-foreground rounded-2xl shadow-2xl">
                <div className="flex flex-col gap-2">
                   <div>
                     <p className="text-sm font-bold text-foreground">Período do dashboard</p>
                     <p className="text-xs text-muted-foreground mt-1">Escolha um período rápido ou personalize o intervalo.</p>
                   </div>
                   {PERIODOS.map(p => (
                     <button
                       key={p.value}
                       onClick={() => handleSelectPreset(p.value)}
                       className={`px-4 py-2 text-sm text-left rounded-lg transition-all ${
                         periodo === p.value 
                           ? 'bg-primary/20 text-primary font-bold' 
                           : 'hover:bg-accent text-muted-foreground'
                       }`}
                     >
                       {p.label}
                     </button>
                   ))}
                </div>

                {periodo === 'custom' && (
                  <div className="rounded-2xl border border-border bg-background/70 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start rounded-xl"
                        onClick={() => {}}
                      >
                        <CalendarDays className="w-4 h-4 mr-2" />
                        {draftDateFrom ? format(draftDateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start rounded-xl"
                        onClick={() => {}}
                      >
                        <CalendarDays className="w-4 h-4 mr-2" />
                        {draftDateTo ? format(draftDateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-2 flex justify-center">
                      <Calendar
                        mode="range"
                        selected={draftDateFrom || draftDateTo ? { from: draftDateFrom, to: draftDateTo } : undefined}
                        onSelect={(range: any) => {
                          setDraftDateFrom(range?.from);
                          setDraftDateTo(range?.to);
                        }}
                        locale={ptBR}
                        numberOfMonths={1}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Button type="button" variant="ghost" className="rounded-xl" onClick={handleClearCustomRange}>
                        Limpar
                      </Button>
                      <Button type="button" className="rounded-xl" onClick={handleApplyCustomRange} disabled={!canApplyCustomRange}>
                        Aplicar intervalo
                      </Button>
                    </div>
                  </div>
                )}
            </PopoverContent>
          </Popover>

          <button className="bg-card border border-border px-4 py-2 rounded-xl text-sm font-bold text-primary hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1: Visitantes */}
        <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-all shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
               —
            </span>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Visitantes</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {loadingRelatorio ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : totalVisitantes}
            </h3>
          </div>
          <div className="mt-auto h-8 flex items-end gap-1">
            {visitantesChartData.slice(-7).length > 0 ? visitantesChartData.slice(-7).map((d, i) => (
              <div key={i} className="flex-1 bg-primary/60 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${Math.max(10, (d.visitantes / (Math.max(...visitantesChartData.map(c => c.visitantes)) || 1)) * 100)}%` }}></div>
            )) : (
              <>
                <div className="flex-1 bg-primary/20 h-3 rounded-t-sm"></div>
                <div className="flex-1 bg-primary/40 h-5 rounded-t-sm"></div>
                <div className="flex-1 bg-primary/30 h-4 rounded-t-sm"></div>
                <div className="flex-1 bg-primary/50 h-6 rounded-t-sm"></div>
                <div className="flex-1 bg-primary h-8 rounded-t-sm"></div>
                <div className="flex-1 bg-primary/60 h-5 rounded-t-sm"></div>
                <div className="flex-1 bg-primary/40 h-7 rounded-t-sm"></div>
              </>
            )}
          </div>
        </div>

        {/* KPI 2: Pedidos */}
        <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-all shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Pedidos</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
               {loadingRelatorio ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : totalPedidos}
            </h3>
          </div>
          <div className="mt-auto h-8 flex items-end gap-1">
             {chartData.slice(-7).map((d, i) => (
                <div key={i} className="flex-1 bg-primary/60 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${Math.max(10, (d.pedidos / (Math.max(...chartData.map(c => c.pedidos)) || 1)) * 100)}%` }}></div>
             ))}
          </div>
        </div>

        {/* KPI 3: Vendas */}
        <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-all shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Vendas</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
               {loadingRelatorio ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : formatPrice(totalReceita)}
            </h3>
          </div>
           <div className="mt-auto h-8 flex items-end gap-1">
             {chartData.slice(-7).map((d, i) => (
                <div key={i} className="flex-1 bg-primary/80 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${Math.max(10, (d.valor / (Math.max(...chartData.map(c => c.valor)) || 1)) * 100)}%` }}></div>
             ))}
          </div>
        </div>

        {/* KPI 4: Ticket Médio */}
        <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-all shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
               {loadingRelatorio ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : formatPrice(ticketMedio)}
            </h3>
          </div>
          <div className="mt-auto h-8 flex items-end gap-1">
            <div className="flex-1 bg-primary/20 h-6 rounded-t-sm"></div>
            <div className="flex-1 bg-primary/40 h-5 rounded-t-sm"></div>
            <div className="flex-1 bg-primary/30 h-4 rounded-t-sm"></div>
            <div className="flex-1 bg-primary/50 h-3 rounded-t-sm"></div>
            <div className="flex-1 bg-primary h-4 rounded-t-sm"></div>
            <div className="flex-1 bg-primary/60 h-5 rounded-t-sm"></div>
            <div className="flex-1 bg-primary/40 h-3 rounded-t-sm"></div>
          </div>
        </div>

      </div>

      {/* Main Chart & Side Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Faturamento Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8 flex flex-col min-h-[450px] shadow-xl relative overflow-hidden">
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-headline font-bold text-foreground">Faturamento</h3>
              <p className="text-sm text-muted-foreground mt-1">Vendas líquidas no período selecionado</p>
            </div>
            <div className="flex gap-2 p-1 bg-background rounded-full border border-border">
              <button className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">Dia</button>
              <button className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">Semana</button>
              <button className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">Mês</button>
            </div>
          </div>

          <div className="flex-1 w-full relative z-10">
            {loadingRelatorio ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                 <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                 <p className="font-medium">Carregando dados...</p>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    tickFormatter={v => `R$${v}`} 
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '12px', 
                      color: 'hsl(var(--card-foreground))',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: 'hsl(var(--card-foreground))', fontWeight: 'bold' }}
                    formatter={(value: number) => [formatPrice(value * 100), 'Receita']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValor)" 
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-6">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-headline font-bold text-foreground mb-2">Nenhum dado para exibir ainda</h4>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Comece a vender para visualizar o crescimento do seu faturamento aqui.
                </p>
                <Button variant="link" className="mt-6 font-bold text-primary" onClick={() => window.open(loja.dominio_customizado ? `https://${loja.dominio_customizado}` : `https://${loja.slug}.dusking.com.br`, '_blank')}>
                   <ExternalLink className="w-4 h-4 mr-2" /> Saber mais sobre relatórios
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Meta & Próximos Passos */}
        <div className="space-y-6">
          
          {/* Meta Mensal */}
          <div className="bg-card border border-border rounded-xl p-8 relative overflow-hidden shadow-xl">
             <h3 className="text-lg font-headline font-bold text-foreground mb-8">Meta Mensal (Exemplo)</h3>
             
             <div className="relative w-40 h-40 mx-auto">
                {/* Circular Progress SVG */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-border" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="10"></circle>
                  <circle 
                    className="text-primary transition-all duration-1000 ease-out" 
                    cx="80" cy="80" fill="transparent" r="70" 
                    stroke="currentColor" 
                    strokeDasharray="439.8" 
                    strokeDashoffset={439.8 - (439.8 * porcentagemMeta) / 100} 
                    strokeLinecap="round" 
                    strokeWidth="10">
                  </circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-primary">{porcentagemMeta}%</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Concluído</span>
                </div>
             </div>
             
             <div className="mt-6 text-center">
               <p className="text-sm font-medium text-muted-foreground">
                 <span className="font-bold text-foreground">{formatPrice(totalReceita)}</span> de {formatPrice(metaValor)}
               </p>
             </div>
          </div>

          {/* Próximos Passos (Checklist Setup) */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
               <Rocket className="w-5 h-5 text-primary" />
               <h3 className="text-lg font-headline font-bold text-foreground">Setup da Loja</h3>
             </div>
             
             <ul className="space-y-5">
                <li className="flex items-start gap-4">
                   <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">Cadastrar primeiro produto</p>
                     <p className="text-xs text-muted-foreground mt-1">Adicione fotos e descrições para começar.</p>
                   </div>
                </li>
                <li className="flex items-start gap-4 opacity-60">
                   <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-foreground">
                     <Check className="w-3 h-3" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground line-through">Configurar meios de pagamento</p>
                     <p className="text-xs text-muted-foreground mt-1">Checkout configurado com sucesso.</p>
                   </div>
                </li>
                <li className="flex items-start gap-4">
                   <div className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 mt-0.5"></div>
                   <div>
                     <p className="text-sm font-bold text-foreground">Personalizar o tema da loja</p>
                     <p className="text-xs text-muted-foreground mt-1">Dê a cara da sua marca para sua loja.</p>
                   </div>
                </li>
             </ul>
             
             <Button variant="outline" className="w-full mt-6 border-border text-primary font-bold rounded-xl py-6">
                Ver Checklist Completo
             </Button>
          </div>

        </div>
      </section>

      {/* Bottom Section: Produtos Mais Vendidos / Últimos Pedidos */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-headline font-bold text-foreground">Top Produtos</h3>
          <Button variant="link" className="text-primary font-bold px-0 gap-1">
             Ver Relatórios <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Vendas</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                 {loadingRelatorio ? (
                   <tr>
                     <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td>
                   </tr>
                 ) : relatorio?.vendas_por_produto && relatorio.vendas_por_produto.length > 0 ? (
                   relatorio.vendas_por_produto.slice(0, 5).map((p, i) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground font-bold text-xs">
                                 #{i+1}
                              </div>
                              <span className="text-sm font-bold text-foreground">{p.nome}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground text-right font-medium">
                           {p.quantidade} un.
                        </td>
                        <td className="px-6 py-4 text-sm text-primary font-bold text-right">
                           {formatPrice(p.receita)}
                        </td>
                      </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={3} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                           <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-2">
                             <Package className="w-8 h-8 text-muted-foreground/50" />
                           </div>
                           <p className="font-headline font-bold text-foreground">Nenhum produto vendido</p>
                           <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                              Assim que uma compra for realizada, os produtos em destaque aparecerão aqui.
                           </p>
                        </div>
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </section>

    </div>
  );
};

export default LojaOverview;
