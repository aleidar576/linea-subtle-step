import { useNavigate } from 'react-router-dom';
import { useLojas } from '@/hooks/useLojas';
import { Store, CheckCircle2, Circle, Loader2, Package, ShoppingCart, Settings, ExternalLink, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { lojaProductsApi, pedidosApi, lojistaApi, type Loja } from '@/services/saas-api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PainelInicio = () => {
  const { data: lojas, isLoading } = useLojas();
  const activeLojas = (lojas || []).filter(l => l.is_active);
  const hasLojas = activeLojas.length > 0;
  const hasDomain = activeLojas.some(l => l.dominio_customizado);
  const navigate = useNavigate();

  const [checkResults, setCheckResults] = useState({
    produto: false,
    gateway: false,
    dadosPessoais: false,
    venda: false,
  });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!activeLojas.length) { setChecked(true); return; }

    const checkAll = async () => {
      try {
        const [allProducts, profile, allPedidos] = await Promise.all([
          Promise.all(activeLojas.map(l =>
            lojaProductsApi.list(l._id, { limit: 1 }).catch(() => [])
          )),
          lojistaApi.perfil().catch(() => null),
          Promise.all(activeLojas.map(l =>
            pedidosApi.list(l._id, { status: 'pago', per_page: 1 }).catch(() => ({ pedidos: [], total: 0 }))
          )),
        ]);

        setCheckResults({
          produto: allProducts.some(p => p.length > 0),
          gateway: !!(profile as any)?.gateway_ativo,
          dadosPessoais: !!((profile as any)?.cpf_cnpj && (profile as any)?.telefone),
          venda: allPedidos.some(r => r.total > 0),
        });
      } catch { /* ignore */ }
      setChecked(true);
    };
    checkAll();
  }, [activeLojas.length]);

  const checklist = [
    { label: 'Crie a sua primeira loja', done: hasLojas },
    { label: 'Complete o seu cadastro', done: checkResults.dadosPessoais, link: '/painel/perfil' },
    { label: 'Configure um domínio', done: hasDomain },
    { label: 'Cadastre o seu primeiro produto', done: checkResults.produto },
    { label: 'Configure um gateway de pagamento', done: checkResults.gateway, link: activeLojas[0] ? `/painel/loja/${activeLojas[0]._id}/gateways` : undefined },
    { label: 'Faça a sua primeira venda paga!', done: checkResults.venda },
  ];

  const isOnboardingCompleted = checklist.every(item => item.done);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Início</h1>

      {/* KPI Cards - always visible */}
      {hasLojas && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground">Lojas Ativas</p>
            <p className="text-3xl font-bold">{activeLojas.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground">Vendas Hoje</p>
            <p className="text-3xl font-bold">R$ 0,00</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground">Pedidos</p>
            <p className="text-3xl font-bold">0</p>
          </div>
        </div>
      )}

      {/* Onboarding Checklist - Progressive Disclosure */}
      {!isOnboardingCompleted && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Primeiros Passos</h3>
            <div className="space-y-3">
              {checklist.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 ${item.link && !item.done ? 'cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2' : ''}`}
                  onClick={() => { if (item.link && !item.done) navigate(item.link); }}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={item.done ? 'text-muted-foreground line-through' : ''}>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Grid */}
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Suas Lojas</h2>

      {activeLojas.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center animate-in fade-in-50">
          <Store className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma loja encontrada</h3>
          <p className="text-sm text-muted-foreground mb-6">Você ainda não possui nenhuma loja configurada.</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Loja
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeLojas.map((loja) => (
            <Card key={loja._id} className="hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="truncate pr-2">{loja.nome}</span>
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 shrink-0">Ativa</Badge>
                </CardTitle>
                <CardDescription className={loja.dominio_customizado ? '' : 'text-muted-foreground italic'}>
                  {loja.dominio_customizado || 'Configuração pendente'}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/produtos`)}>
                    <Package className="w-4 h-4 mr-2" />
                    Produtos
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/pedidos`)}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Pedidos
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/configuracoes`)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground" asChild>
                    <a href={loja.dominio_customizado ? `https://${loja.dominio_customizado}` : `/loja/${loja.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visitar Loja
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PainelInicio;
