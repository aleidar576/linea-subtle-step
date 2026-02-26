import { Link, useNavigate } from 'react-router-dom';
import { useLojas } from '@/hooks/useLojas';
import { Store, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { lojaProductsApi, pedidosApi, lojistaApi, type Loja } from '@/services/saas-api';

const PainelInicio = () => {
  const { data: lojas, isLoading } = useLojas();
  const activeLojas = (lojas || []).filter(l => l.is_active);
  const hasLojas = activeLojas.length > 0;
  const hasDomain = activeLojas.some(l => l.dominio_customizado);

  const [hasProduto, setHasProduto] = useState(false);
  const [hasGateway, setHasGateway] = useState(false);
  const [hasVenda, setHasVenda] = useState(false);
  const [hasDadosPessoais, setHasDadosPessoais] = useState(false);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeLojas.length) { setChecked(true); return; }

    const checkAll = async () => {
      try {
        // Check products
        const productsPromises = activeLojas.map(l => lojaProductsApi.list(l._id).catch(() => []));
        const allProducts = await Promise.all(productsPromises);
        setHasProduto(allProducts.some(p => p.length > 0));

        // Check gateway (from lojista profile)
        try {
          const profile = await lojistaApi.perfil();
          setHasGateway(!!profile.gateway_ativo);
          setHasDadosPessoais(!!(profile.cpf_cnpj && profile.telefone));
        } catch {
          setHasGateway(false);
          setHasDadosPessoais(false);
        }

        // Check paid orders
        const pedidosPromises = activeLojas.map(l =>
          pedidosApi.list(l._id, { status: 'pago', per_page: 1 }).catch(() => ({ pedidos: [], total: 0 }))
        );
        const allPedidos = await Promise.all(pedidosPromises);
        setHasVenda(allPedidos.some(r => r.total > 0));
      } catch { /* ignore */ }
      setChecked(true);
    };
    checkAll();
  }, [activeLojas.length]);

  const checklist = [
    { label: 'Crie a sua primeira loja', done: hasLojas },
    { label: 'Complete o seu cadastro', done: hasDadosPessoais, link: '/painel/perfil' },
    { label: 'Configure um domínio', done: hasDomain },
    { label: 'Cadastre o seu primeiro produto', done: hasProduto },
    { label: 'Configure um gateway de pagamento', done: hasGateway, link: activeLojas[0] ? `/painel/loja/${activeLojas[0]._id}/gateways` : undefined },
    { label: 'Faça a sua primeira venda paga!', done: hasVenda },
  ];

  if (isLoading || !checked) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Início</h1>

      {!hasLojas && (
        <div className="bg-card border border-border rounded-xl p-12 text-center mb-8">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Crie a sua primeira loja</h2>
          <p className="text-muted-foreground mb-4">Comece agora a vender online com a sua loja personalizada.</p>
          <p className="text-sm text-muted-foreground">Use o botão <span className="font-semibold text-primary">+ Nova Loja</span> no menu lateral.</p>
        </div>
      )}

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

      <div className="bg-card border border-border rounded-xl p-6">
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
      </div>
    </div>
  );
};

export default PainelInicio;
