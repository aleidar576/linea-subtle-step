import { useNavigate } from 'react-router-dom';
import { useLojas } from '@/hooks/useLojas';
import { Store, CheckCircle2, Circle, Loader2, Package, ShoppingCart, Settings, ExternalLink, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { lojaProductsApi, pedidosApi, lojistaApi, type Loja } from '@/services/saas-api';
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

    setChecked(false);

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
    <div className="w-full space-y-10 pb-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-headline font-extrabold tracking-tight text-foreground">Início</h1>
        <p className="text-muted-foreground">Resumo geral das suas lojas e próximos passos.</p>
      </div>

      {/* KPI Cards - always visible */}
      {hasLojas && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Lojas Ativas</p>
            <p className="text-3xl font-bold">{activeLojas.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Vendas Hoje</p>
            <p className="text-3xl font-bold">R$ 0,00</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Pedidos</p>
            <p className="text-3xl font-bold">0</p>
          </div>
        </div>
      )}

      {!checked ? (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-[180px] rounded-xl" />
            <Skeleton className="h-[180px] rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Onboarding Checklist - Progressive Disclosure */}
          {!isOnboardingCompleted && checked && (
            <div className="mb-8 bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Primeiros Passos</h3>
                <div className="space-y-3">
                  {checklist.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 ${item.link && !item.done ? 'cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2' : ''}`}
                      onClick={() => { if (item.link && !item.done) navigate(item.link); }}
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={item.done ? 'text-muted-foreground line-through' : ''}>{item.label}</span>
                    </div>
                  ))}
                </div>
            </div>
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
              {activeLojas.map((loja) => {
                const dominioExterno = loja.dominio_customizado && !loja.dominio_customizado.includes('dusking')
                  ? loja.dominio_customizado
                  : null;

                return (
                <div key={loja._id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col">
                  <div className="pb-4">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span className="truncate pr-2">{loja.nome}</span>
                      <Badge variant="success" className="border-0 shrink-0">Ativa</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {dominioExterno ? (
                        <a
                          href={`https://${dominioExterno}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {dominioExterno}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Domínio pendente</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-0">
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/produtos`)}>
                        <Package className="w-4 h-4 mr-2" />
                        Produtos
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/pedidos`)}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Pedidos
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(`/painel/loja/${loja._id}/configuracoes`)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full justify-start text-xs font-medium bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground" asChild>
                        <a href={loja.dominio_customizado ? `https://${loja.dominio_customizado}` : `/loja/${loja.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visitar Loja
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PainelInicio;
