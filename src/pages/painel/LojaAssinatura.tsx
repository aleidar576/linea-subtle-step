import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Crown, Zap, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { planosApi, stripeApi, lojistaApi, type Plano, type LojistaProfile } from '@/services/saas-api';

const LojaAssinatura = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [profile, setProfile] = useState<LojistaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([planosApi.list(), lojistaApi.perfil()])
      .then(([p, prof]) => { setPlanos(p); setProfile(prof); })
      .catch(() => toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: '🎉 Assinatura ativada!', description: 'Seu trial de 7 dias começou.' });
    }
  }, [searchParams]);

  const hasSubscription = profile?.subscription_status && ['trialing', 'active', 'past_due'].includes(profile.subscription_status);

  const handleCheckout = async (planoId: string) => {
    if (!profile?.cpf_cnpj || !profile?.telefone) {
      toast({
        title: 'Dados incompletos',
        description: 'Complete seus dados pessoais clicando aqui para liberar a assinatura',
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/painel/perfil')}>
            Completar dados
          </Button>
        ),
      });
      return;
    }

    setCheckoutLoading(planoId);
    try {
      const { url } = await stripeApi.createCheckout(planoId);
      window.location.href = url;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await stripeApi.createPortal();
      window.location.href = url;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // === ACTIVE SUBSCRIPTION VIEW ===
  if (hasSubscription && profile) {
    const statusLabels: Record<string, string> = {
      trialing: 'Trial Ativo',
      active: 'Ativo',
      past_due: 'Pagamento Pendente',
    };
    const statusColors: Record<string, string> = {
      trialing: 'bg-blue-500/10 text-blue-600',
      active: 'bg-green-500/10 text-green-600',
      past_due: 'bg-destructive/10 text-destructive',
    };

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold mb-2">Sua Assinatura</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="text-2xl font-bold capitalize">{profile.plano}</p>
            </div>
            <Badge className={statusColors[profile.subscription_status!] || ''}>
              {statusLabels[profile.subscription_status!] || profile.subscription_status}
            </Badge>
          </div>

          {profile.subscription_status === 'past_due' && (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-medium">
                Seu pagamento falhou. Regularize para evitar o bloqueio da sua loja.
              </p>
            </div>
          )}

          {profile.data_vencimento && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {profile.subscription_status === 'trialing' ? 'Primeira cobrança em:' : 'Próxima cobrança:'}
              </span>
              <span className="font-medium">{new Date(profile.data_vencimento).toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          <Button onClick={handlePortal} disabled={portalLoading} className="w-full gap-2">
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Gerenciar Assinatura
          </Button>
        </div>
      </div>
    );
  }

  // === PLANS SELECTION VIEW ===
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
        <p className="text-muted-foreground">Comece com 7 dias grátis. Cancele quando quiser.</p>
      </div>

      {planos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum plano disponível no momento.</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${planos.length === 1 ? 'max-w-md mx-auto' : planos.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
          {planos.map((plano) => (
            <div
              key={plano._id}
              className={`bg-card rounded-xl p-6 space-y-5 relative ${
                plano.destaque ? 'border-2 border-primary' : 'border border-border'
              }`}
            >
              {plano.destaque && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Recomendado</span>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {plano.destaque && <Zap className="h-5 w-5 text-primary" />}
                  {plano.nome}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Taxa de transação: {plano.taxa_transacao}%</p>
              </div>

              <div>
                {plano.preco_original > 0 && plano.preco_original !== plano.preco_promocional && (
                  <p className="text-sm line-through decoration-destructive/50 text-muted-foreground">
                    R$ {plano.preco_original.toFixed(2).replace('.', ',')}
                    <span className="text-xs">/mês</span>
                  </p>
                )}
                <p className="text-4xl font-extrabold text-foreground">
                  {plano.preco_promocional > 0
                    ? `R$ ${plano.preco_promocional.toFixed(2).replace('.', ',')}`
                    : 'Consultar'}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
              </div>

              {plano.vantagens.length > 0 && (
                <ul className="space-y-2">
                  {plano.vantagens.map((v, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {v}
                    </li>
                  ))}
                </ul>
              )}

              <Button
                className="w-full gap-2"
                variant={plano.destaque ? 'default' : 'outline'}
                onClick={() => handleCheckout(plano._id)}
                disabled={checkoutLoading === plano._id}
              >
                {checkoutLoading === plano._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                Começar 7 Dias Grátis
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        Durante o trial de 7 dias, a taxa de transação aplicada é de 2.0%.
      </p>
    </div>
  );
};

export default LojaAssinatura;
