import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminsApi, type AdminLojista } from '@/services/api';
import { platformApi } from '@/services/saas-api';
import { useToast } from '@/hooks/use-toast';
import {
  Store, Loader2, Ban, CheckCircle2, Crown, Eye,
  ExternalLink, Package, ShoppingCart, DollarSign, ArrowDown, Power, Globe, ArrowLeft, ShieldOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type ViewMode = 'list' | 'editor';

const AdminLojistas = () => {
  const { data: lojistas, isLoading } = useQuery({
    queryKey: ['admin-lojistas'],
    queryFn: adminsApi.listLojistas,
  });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<ViewMode>('list');
  const [selectedLojista, setSelectedLojista] = useState<AdminLojista | null>(null);
  const [toleranciaForm, setToleranciaForm] = useState({ modo_amigo: false, tolerancia_extra_dias: 0 });
  const [savingTolerancia, setSavingTolerancia] = useState(false);
  const [metrics, setMetrics] = useState<{ totalProdutos: number; totalPedidos: number; totalVendas: number; lojas?: Array<{ slug: string; nome: string }> } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [activatingManual, setActivatingManual] = useState(false);
  const [platformDomain, setPlatformDomain] = useState('');

  useEffect(() => {
    platformApi.getDomain().then(r => setPlatformDomain(r.domain)).catch(() => setPlatformDomain('dusking.com.br'));
  }, []);

  const toggleBloqueio = useMutation({
    mutationFn: (id: string) => adminsApi.toggleBloqueio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-lojistas'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const openDetails = (l: AdminLojista) => {
    setSelectedLojista(l);
    setToleranciaForm({
      modo_amigo: l.modo_amigo || false,
      tolerancia_extra_dias: l.tolerancia_extra_dias || 0,
    });
    setMetrics(null);
    setMetricsLoading(true);
    setMode('editor');
    adminsApi.getLojistaMetrics(l._id)
      .then(setMetrics)
      .catch(() => setMetrics(null))
      .finally(() => setMetricsLoading(false));
  };

  const goBack = () => {
    setMode('list');
    setSelectedLojista(null);
  };

  const handleSaveTolerancia = async () => {
    if (!selectedLojista) return;
    setSavingTolerancia(true);
    try {
      await adminsApi.updateTolerancia(selectedLojista._id, toleranciaForm);
      qc.invalidateQueries({ queryKey: ['admin-lojistas'] });
      toast({ title: 'Configurações salvas!' });
      goBack();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingTolerancia(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedLojista) return;
    setImpersonating(true);
    try {
      const { token } = await adminsApi.impersonate(selectedLojista._id);
      localStorage.setItem('lojista_token', token);
      window.open('/painel', '_blank');
      toast({ title: 'Sessão iniciada', description: `Acedendo como ${selectedLojista.nome || selectedLojista.email}` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setImpersonating(false);
    }
  };

  const handleToggleBloqueioAcesso = async () => {
    if (!selectedLojista) return;
    setActivatingManual(true);
    try {
      const result = await adminsApi.toggleBloqueioAcesso(selectedLojista._id);
      setSelectedLojista({ ...selectedLojista, acesso_bloqueado: result.acesso_bloqueado });
      qc.invalidateQueries({ queryKey: ['admin-lojistas'] });
      toast({ title: result.acesso_bloqueado ? 'Acesso bloqueado' : 'Acesso liberado' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActivatingManual(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; }
  };

  const formatCurrency = (v: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const planoBadge = (plano: string) => {
    const colors: Record<string, string> = {
      free: 'bg-muted text-muted-foreground',
      plus: 'bg-primary/10 text-primary',
    };
    return <Badge className={colors[plano] || 'bg-muted text-muted-foreground'}>{plano.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============ EDITOR MODE ============
  if (mode === 'editor' && selectedLojista) {
    return (
      <div>
        {/* Top Bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold">{selectedLojista.nome || selectedLojista.email}</h1>
          {planoBadge(selectedLojista.plano)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Info básica */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="font-semibold">Informações</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span className="font-medium">{selectedLojista.nome || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium">{selectedLojista.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lojas:</span><span className="font-medium">{selectedLojista.qtd_lojas}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em:</span><span className="font-medium">{formatDate(selectedLojista.criado_em)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email verificado:</span><span>{selectedLojista.email_verificado ? 'Sim' : selectedLojista.verificacao_ignorada ? 'Ignorado' : 'Pendente'}</span></div>
                {!selectedLojista.email_verificado && !selectedLojista.verificacao_ignorada && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={async () => {
                      try {
                        await adminsApi.ignorarVerificacao(selectedLojista._id);
                        setSelectedLojista({ ...selectedLojista, verificacao_ignorada: true });
                        qc.invalidateQueries({ queryKey: ['admin-lojistas'] });
                        toast({ title: 'Verificação ignorada', description: 'O lojista pode acessar o painel agora.' });
                      } catch (err: any) {
                        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                      }
                    }}
                  >
                    <ShieldOff className="h-4 w-4" /> Ignorar Verificação de Email
                  </Button>
                )}
              </div>
            </div>

            {/* Gestão de Plano */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-semibold">Gestão de Plano</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano Atual:</span>
                <span className="font-medium capitalize">{selectedLojista.plano}</span>
              </div>
              {selectedLojista.subscription_status && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status Assinatura:</span>
                  <Badge className={selectedLojista.subscription_status === 'active' ? 'bg-green-500/10 text-green-600' : selectedLojista.subscription_status === 'trialing' ? 'bg-blue-500/10 text-blue-600' : 'bg-destructive/10 text-destructive'}>
                    {selectedLojista.subscription_status}
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Modo Amigo</Label>
                  <p className="text-xs text-muted-foreground">Se ativado, este lojista NUNCA será bloqueado e terá acesso completo.</p>
                </div>
                <Switch
                  checked={toleranciaForm.modo_amigo}
                  onCheckedChange={(checked) => setToleranciaForm(f => ({ ...f, modo_amigo: checked }))}
                />
              </div>

              <Button
                onClick={handleToggleBloqueioAcesso}
                disabled={activatingManual}
                variant={selectedLojista.acesso_bloqueado ? 'outline' : 'destructive'}
                className="w-full gap-2"
              >
                {activatingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                {selectedLojista.acesso_bloqueado ? 'Liberar Acesso do Lojista' : 'Bloquear Acesso do Lojista'}
              </Button>
              <p className="text-xs text-muted-foreground">Impede o login do lojista. Ele verá uma mensagem para contatar o suporte.</p>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Liberar Visualização do Subdomínio</Label>
                  <p className="text-xs text-muted-foreground">Se ativado, o lojista poderá ver (mas não editar) o subdomínio interno no painel.</p>
                </div>
                <Switch
                  checked={selectedLojista.liberar_visualizacao_subdominio || false}
                  onCheckedChange={async () => {
                    try {
                      const result = await adminsApi.toggleVerSubdominio(selectedLojista._id);
                      setSelectedLojista({ ...selectedLojista, liberar_visualizacao_subdominio: result.liberar_visualizacao_subdominio });
                      qc.invalidateQueries({ queryKey: ['admin-lojistas'] });
                      toast({ title: 'Visualização do subdomínio atualizada' });
                    } catch (err: any) {
                      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                    }
                  }}
                />
              </div>
            </div>

            {/* Tolerância */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-semibold">Controle de Tolerância</h2>
              <div>
                <Label>Dias Extras de Tolerância</Label>
                <p className="text-xs text-muted-foreground mb-2">Dias adicionais somados à regra global especificamente para este lojista.</p>
                <Input
                  type="number"
                  min="0"
                  value={toleranciaForm.tolerancia_extra_dias}
                  onChange={(e) => setToleranciaForm(f => ({ ...f, tolerancia_extra_dias: Number(e.target.value) || 0 }))}
                  disabled={toleranciaForm.modo_amigo}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Acesso de Suporte */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="font-semibold">Acesso de Suporte</h2>

              {metrics?.lojas && metrics.lojas.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> URL de Inspeção</Label>
                  {metrics.lojas.map(l => (
                    <div key={l.slug} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-muted-foreground truncate">{l.slug}.{platformDomain || '...'}</span>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`https://${l.slug}.${platformDomain}`, '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleImpersonate} disabled={impersonating} variant="outline" className="w-full gap-2">
                {impersonating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Aceder à Loja (Suporte)
              </Button>
            </div>

            {/* Métricas */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="font-semibold">Métricas da Loja</h2>
              {metricsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas...
                </div>
              ) : metrics ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{metrics.totalProdutos}</p>
                    <p className="text-xs text-muted-foreground">Produtos</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{metrics.totalPedidos}</p>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{formatCurrency(metrics.totalVendas)}</p>
                    <p className="text-xs text-muted-foreground">Vendas</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar métricas.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={handleSaveTolerancia} disabled={savingTolerancia} className="gap-2">
            {savingTolerancia && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    );
  }

  // ============ LIST MODE ============
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestão de Lojistas</h1>

      {!lojistas || lojistas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum lojista cadastrado</h2>
          <p className="text-muted-foreground">Quando lojistas se registrarem na plataforma, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Lojas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lojistas.map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="font-medium">
                    <button onClick={() => openDetails(l)} className="hover:text-primary underline-offset-2 hover:underline">
                      {l.nome || '-'}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.email}</TableCell>
                  <TableCell>{planoBadge(l.plano)}</TableCell>
                  <TableCell>{l.qtd_lojas}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {l.bloqueado ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : l.email_verificado ? (
                        <Badge className="bg-primary/10 text-primary">Ativo</Badge>
                      ) : l.verificacao_ignorada ? (
                        <Badge className="bg-yellow-500/10 text-yellow-600">Ignorado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                      {l.modo_amigo && (
                        <Badge className="bg-primary/10 text-primary gap-1 text-[10px]">Amigo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(l.criado_em)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">Ações</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetails(l)} className="gap-2">
                          <Eye className="h-4 w-4" /> Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleBloqueio.mutate(l._id)}
                          className="gap-2"
                        >
                          {l.bloqueado ? (
                            <><CheckCircle2 className="h-4 w-4" /> Desbloquear</>
                          ) : (
                            <><Ban className="h-4 w-4" /> Bloquear</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDetails(l)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" /> Ver Detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminLojistas;
