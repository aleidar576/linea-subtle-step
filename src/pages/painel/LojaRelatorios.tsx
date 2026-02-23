import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useQuery } from '@tanstack/react-query';
import { relatoriosApi } from '@/services/saas-api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Download, CalendarDays, BarChart3, TrendingUp, Package, Mail, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: '7 Dias', value: '7d' },
  { label: '30 Dias', value: '30d' },
  { label: 'Todo o tempo', value: 'all' },
  { label: 'Personalizado', value: 'custom' },
];

function getDateRange(periodo: string, dateFrom?: Date, dateTo?: Date) {
  const now = new Date();
  if (periodo === 'hoje') {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), to: now.toISOString() };
  }
  if (periodo === 'ontem') {
    const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    return { from: d.toISOString(), to: e.toISOString() };
  }
  if (periodo === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), to: now.toISOString() };
  }
  if (periodo === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), to: now.toISOString() };
  }
  if (periodo === 'custom' && dateFrom && dateTo) {
    const f = new Date(dateFrom); f.setHours(0, 0, 0, 0);
    const t = new Date(dateTo); t.setHours(23, 59, 59, 999);
    return { from: f.toISOString(), to: t.toISOString() };
  }
  return { from: undefined, to: undefined };
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

function exportXLSX(data: any[], filename: string) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

const LojaRelatorios = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading: lojaLoading } = useLoja(id);
  const [periodo, setPeriodo] = useState('30d');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const range = getDateRange(periodo, dateFrom, dateTo);

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ['relatorios', id, periodo, range.from, range.to],
    queryFn: () => relatoriosApi.get(id!, range.from, range.to),
    enabled: !!id && (periodo !== 'custom' || (!!dateFrom && !!dateTo)),
  });

  if (lojaLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const isAsync = relatorio?.status === 'async_report';
  const vendasDia = Array.isArray(relatorio?.vendas_por_dia) ? relatorio.vendas_por_dia : [];
  const vendasProduto = Array.isArray(relatorio?.vendas_por_produto) ? relatorio.vendas_por_produto : [];
  const totais = relatorio?.totais || { pedidos: 0, receita: 0 };

  const vendasDiaExport = vendasDia.map((v: any) => ({ Data: v._id, Pedidos: v.count, 'Receita (R$)': v.total.toFixed(2) }));
  const produtosExport = vendasProduto.map((v: any) => ({ Produto: v.nome, Quantidade: v.quantidade, 'Receita (R$)': v.receita.toFixed(2) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios — {loja?.nome}</h1>
          <p className="text-sm text-muted-foreground">Dados gerenciais da sua loja</p>
        </div>
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

      {/* Async Report Alert */}
      {isAsync && (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Mail className="h-5 w-5 text-primary" />
          <AlertTitle className="text-base font-semibold">📊 Relatório Extenso Detectado</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1">
            O período selecionado contém um alto volume de dados ({relatorio?.docCount?.toLocaleString('pt-BR')} pedidos).
            Para não comprometer a velocidade da plataforma, o relatório completo está sendo processado em nossos servidores
            e será enviado para o seu e-mail em formato <strong>Excel (.xlsx)</strong> e <strong>CSV</strong> em alguns minutos.
          </AlertDescription>
        </Alert>
      )}

      {/* Totais - only show when not async */}
      {!isAsync && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-chart-1" /><span className="text-sm text-muted-foreground">Total de Pedidos</span></div>
                <p className="text-3xl font-bold">{totais.pedidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-chart-2" /><span className="text-sm text-muted-foreground">Receita Total</span></div>
                <p className="text-3xl font-bold">R$ {totais.receita.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-chart-3" /><span className="text-sm text-muted-foreground">Ticket Médio</span></div>
                <p className="text-3xl font-bold">R$ {totais.pedidos > 0 ? (totais.receita / totais.pedidos).toFixed(2) : '0.00'}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList>
              <TabsTrigger value="timeline" className="gap-1"><BarChart3 className="h-3 w-3" /> Vendas ao Longo do Tempo</TabsTrigger>
              <TabsTrigger value="products" className="gap-1"><Package className="h-3 w-3" /> Vendas por Produto</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Vendas por Dia</CardTitle>
                  <ExportDropdown data={vendasDiaExport} filename="vendas-por-dia" disabled={!vendasDia.length} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : vendasDia.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vendasDia}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="_id" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-12">Nenhum dado de vendas para o período selecionado.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Vendas por Produto</CardTitle>
                  <ExportDropdown data={produtosExport} filename="vendas-por-produto" disabled={!vendasProduto.length} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : vendasProduto.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd Vendida</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendasProduto.map((v: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{v.nome}</TableCell>
                            <TableCell className="text-right">{v.quantidade}</TableCell>
                            <TableCell className="text-right">R$ {v.receita.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-12">Nenhum dado de vendas por produto.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

// Export dropdown component
function ExportDropdown({ data, filename, disabled }: { data: any[]; filename: string; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={disabled}>
          <Download className="h-3 w-3" /> Exportar <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(data, filename)} className="gap-2">
          <FileText className="h-4 w-4" /> Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXLSX(data, filename)} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Exportar Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LojaRelatorios;
