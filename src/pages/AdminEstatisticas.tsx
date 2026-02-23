import { useQuery } from '@tanstack/react-query';
import { adminsApi, type AdminStats } from '@/services/api';
import { Loader2, Users, Store, Ban, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminEstatisticas = () => {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: adminsApi.getStats,
  });

  if (isLoading || !stats) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const cards = [
    { label: 'Total Lojistas', value: stats.totalLojistas, icon: Users, color: 'text-primary' },
    { label: 'Lojistas Ativos', value: stats.lojistasAtivos, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Bloqueados', value: stats.lojistasBloqueados, icon: Ban, color: 'text-destructive' },
    { label: 'Total Lojas', value: stats.totalLojas, icon: Store, color: 'text-chart-1' },
    { label: 'Lojas Ativas', value: stats.lojasAtivas, icon: TrendingUp, color: 'text-chart-2' },
  ];

  const chartData = stats.cadastrosPorMes.map(item => ({
    mes: item._id,
    cadastros: item.count,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Estatísticas</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Novos Cadastros por Mês</h2>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Sem dados suficientes ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="cadastros" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AdminEstatisticas;
