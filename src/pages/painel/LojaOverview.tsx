import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { Loader2, Eye, ShoppingCart, DollarSign, TrendingUp, CalendarDays, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { relatoriosApi, type RelatorioData } from '@/services/saas-api';

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: '7 Dias', value: '7d' },
  { label: '30 Dias', value: '30d' },
  { label: 'Todo o tempo', value: 'all' },
  { label: 'Personalizado', value: 'custom' },
];

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LojaOverview = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const [periodo, setPeriodo] = useState('7d');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodo) {
      case 'hoje': return { from: format(startOfDay(now), 'yyyy-MM-dd'), to: format(endOfDay(now), 'yyyy-MM-dd') };
      case 'ontem': { const y = subDays(now, 1); return { from: format(startOfDay(y), 'yyyy-MM-dd'), to: format(endOfDay(y), 'yyyy-MM-dd') }; }
      case '7d': return { from: format(subDays(now, 7), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
      case '30d': return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
      case 'all': return { from: undefined, to: undefined };
      case 'custom': return {
        from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      };
      default: return { from: format(subDays(now, 7), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    }
  }, [periodo, dateFrom, dateTo]);

  useEffect(() => {
    if (!id) return;
    setLoadingRelatorio(true);
    relatoriosApi.get(id, dateRange.from, dateRange.to)
      .then(data => setRelatorio(data))
      .catch(() => setRelatorio(null))
      .finally(() => setLoadingRelatorio(false));
  }, [id, dateRange.from, dateRange.to]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!loja) return <p className="text-muted-foreground">Loja não encontrada.</p>;

  const totalPedidos = relatorio?.totais?.pedidos || 0;
  const totalReceita = relatorio?.totais?.receita || 0;

  const chartData = (relatorio?.vendas_por_dia || []).map(d => ({
    date: d._id?.substring(5) || d._id, // MM-DD
    valor: d.total / 100,
    pedidos: d.count,
  }));

  const cards = [
    { label: 'Visitantes', value: '—', icon: Eye, color: 'text-chart-1' },
    { label: 'Pedidos', value: String(totalPedidos), icon: ShoppingCart, color: 'text-chart-2' },
    { label: 'Vendas', value: formatPrice(totalReceita), icon: DollarSign, color: 'text-chart-3' },
    { label: 'Ticket Médio', value: totalPedidos > 0 ? formatPrice(Math.round(totalReceita / totalPedidos)) : 'R$ 0,00', icon: TrendingUp, color: 'text-chart-4' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{loja.nome}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PERIODOS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  periodo === p.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodo === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <CalendarDays className="h-3 w-3" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'De'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <CalendarDays className="h-3 w-3" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Até'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{loadingRelatorio ? '...' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Faturamento</h2>
        {loadingRelatorio ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatPrice(value * 100), 'Receita']}
              />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Aguardando primeira venda</p>
            <p className="text-sm text-muted-foreground mt-1">Os dados de faturamento aparecerão aqui assim que houver pedidos pagos.</p>
          </div>
        )}
      </div>

      {/* Top produtos */}
      {relatorio?.vendas_por_produto && relatorio.vendas_por_produto.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Produtos Mais Vendidos</h2>
          <div className="space-y-3">
            {relatorio.vendas_por_produto.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                  <span className="text-sm font-medium">{p.nome}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{formatPrice(p.receita)}</p>
                  <p className="text-xs text-muted-foreground">{p.quantidade} vendidos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!relatorio?.vendas_por_produto?.length && !loadingRelatorio && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Últimos Pedidos</h2>
          <p className="text-muted-foreground text-sm text-center py-6">Nenhum pedido registrado.</p>
        </div>
      )}
    </div>
  );
};

export default LojaOverview;
