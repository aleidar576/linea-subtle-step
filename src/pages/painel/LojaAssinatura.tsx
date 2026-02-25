import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Crown, Zap, Loader2, ExternalLink, AlertTriangle, RefreshCw, Receipt, Info, ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { planosApi, stripeApi, lojistaApi, type Plano, type LojistaProfile } from '@/services/saas-api';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  trialing: { label: 'Trial Ativo', className: 'bg-blue-500/10 text-blue-600' },
  active: { label: 'Ativa', className: 'bg-green-500/10 text-green-600' },
  past_due: { label: 'Atrasada', className: 'bg-destructive/10 text-destructive' },
  canceled: { label: 'Cancelada', className: 'bg-muted text-muted-foreground' },
};

const LojaAssinatura = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [profile, setProfile] = useState<LojistaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [payManualLoading, setPayManualLoading] = useState(false);

  const fetchData = useCallback(() => {
    return Promise.all([planosApi.list(), lojistaApi.perfil()])
      .then(([p, prof]) => { setPlanos(p); setProfile(prof); })
      .catch(() => toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' }));
  }, [toast]);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !loading) {
        setRefreshing(true);
        fetchData().finally(() => setRefreshing(false));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchData, loading]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: '🎉 Assinatura ativada!', description: 'Seu trial de 7 dias começou.' });
    }
  }, [searchParams]);

  const hasSubscription = profile?.subscription_status && ['trialing', 'active', 'past_due'].includes(profile.subscription_status);
  const currentPlano = planos.find(p => p._id === profile?.plano_id) || null;

  const handleCheckout = async (planoId: string) => {
    if (!profile?.cpf_cnpj || !profile?.telefone) {
      toast({
        title: 'Dados incompletos',
        description: 'Complete seus dados pessoais clicando aqui para liberar a assinatura',
        variant: 'destructive',
        action: <Button variant="outline" size="sm" onClick={() => navigate('/painel/perfil')}>Completar dados</Button>,
      });
      return;
    }
    setCheckoutLoading(planoId);
    try {
      const { url } = await stripeApi.createCheckout(planoId);
      window.location.href = url;
    } catch (err: any) {
      toast({ title: 'Erro no checkout', description: err?.details || err?.message || 'Erro desconhecido', variant: 'destructive' });
    } finally { setCheckoutLoading(null); }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await stripeApi.createPortal();
      window.open(url, '_blank');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setPortalLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: 'Atualizado', description: 'Dados da assinatura atualizados.' });
  };

  const handlePayManual = async () => {
    setPayManualLoading(true);
    try {
      const result = await stripeApi.pagarTaxasManual();
      toast({ title: '✅ Pagamento realizado!', description: result.message });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Pagamento recusado', description: err?.message || 'Cartão recusado. Tente novamente.', variant: 'destructive' });
    } finally { setPayManualLoading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // === ACTIVE SUBSCRIPTION VIEW ===
  if (hasSubscription && profile) {
    const isCancelScheduled = profile.cancel_at_period_end === true;
    const status = isCancelScheduled
      ? { label: 'Cancelamento Programado', className: 'bg-orange-500/10 text-orange-600 border-orange-300' }
      : STATUS_MAP[profile.subscription_status!] || { label: profile.subscription_status, className: '' };
    const planoNome = currentPlano?.nome || profile.plano || 'Free';
    const precoPromocional = currentPlano?.preco_promocional ?? null;
    const cancelDate = profile.cancel_at || profile.data_vencimento;
    const taxasAcumuladas = profile.taxas_acumuladas || 0;
    const dataVencimentoTaxas = profile.data_vencimento_taxas;
    const isTrial = profile.subscription_status === 'trialing';
    const taxaVigente = isTrial
      ? (currentPlano?.taxa_transacao_trial ?? 2.0)
      : (currentPlano?.taxa_transacao_percentual ?? currentPlano?.taxa_transacao ?? 1.5);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold mb-2">Sua Assinatura</h1>
        </div>

        <div className="space-y-6">
          {/* BLOCO 1: Mensalidade do Plano */}
          <div className="bg-card border border-border rounded-xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Mensalidade do Plano</p>
                <p className="text-2xl font-bold">{planoNome}</p>
              </div>
              <Badge className={status.className}>{status.label}</Badge>
            </div>

            {precoPromocional !== null && (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">
                  R$ {precoPromocional.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-sm text-muted-foreground">/ mês</span>
              </div>
            )}

            {isCancelScheduled && cancelDate && (
              <div className="flex items-center gap-3 rounded-lg bg-orange-500/10 p-4 border border-orange-300">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">
                  Sua assinatura foi cancelada, mas você tem acesso garantido até{' '}
                  <strong>{new Date(cancelDate).toLocaleDateString('pt-BR')}</strong>.
                </p>
              </div>
            )}

            {!isCancelScheduled && profile.subscription_status === 'past_due' && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive font-medium">
                  Seu pagamento falhou. Regularize para evitar o bloqueio da sua loja.
                </p>
              </div>
            )}

            {!isCancelScheduled && profile.data_vencimento && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {isTrial ? 'Primeira cobrança em:' : 'Próxima renovação:'}
                </span>
                <span className="font-medium">{new Date(profile.data_vencimento).toLocaleDateString('pt-BR')}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handlePortal} disabled={portalLoading} className="flex-1 gap-2">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Gerenciar Assinatura
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* BLOCO 2: Taxas de Transação Acumuladas */}
          <div className="bg-card border border-border rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Taxas de Transação Acumuladas</p>
            </div>

            {isTrial && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3 border border-blue-300">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700 font-medium">
                  Taxa vigente durante o trial: <strong>{taxaVigente}%</strong> por transação.
                </p>
              </div>
            )}

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-foreground">
                R$ {taxasAcumuladas.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {taxasAcumuladas > 0 && dataVencimentoTaxas ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Será debitado do seu cartão em:</span>
                <span className="font-medium">{new Date(dataVencimentoTaxas).toLocaleDateString('pt-BR')}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma taxa acumulada no momento.</p>
            )}

            {!isTrial && currentPlano && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa por transação:</span>
                <span className="font-medium">
                  {taxaVigente}%{(currentPlano.taxa_transacao_fixa || 0) > 0 ? ` + R$ ${currentPlano.taxa_transacao_fixa.toFixed(2).replace('.', ',')}` : ''}
                </span>
              </div>
            )}

            {/* Banner: Falha na cobrança */}
            {profile.status_taxas === 'falha' && taxasAcumuladas > 0 && (
              <div className="rounded-lg bg-orange-500/10 p-4 border border-orange-300 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                  <p className="text-sm text-orange-700 font-medium">
                    Atenção: Não conseguimos debitar as taxas de R$ {taxasAcumuladas.toFixed(2).replace('.', ',')} do seu cartão.
                    {dataVencimentoTaxas && <> O sistema tentará novamente em <strong>{new Date(dataVencimentoTaxas).toLocaleDateString('pt-BR')}</strong>.</>}
                  </p>
                </div>
                <Button onClick={handlePayManual} disabled={payManualLoading} variant="outline" className="w-full gap-2 border-orange-400 text-orange-700 hover:bg-orange-500/10">
                  {payManualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Regularizar Pagamento Agora
                </Button>
              </div>
            )}

            {/* Banner: Bloqueado — limite de tentativas */}
            {profile.status_taxas === 'bloqueado' && taxasAcumuladas > 0 && (
              <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/30 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive font-medium">
                    Ação Necessária: O limite de tentativas automáticas foi atingido. As taxas de R$ {taxasAcumuladas.toFixed(2).replace('.', ',')} estão pendentes. Regularize imediatamente para evitar a suspensão da sua loja.
                  </p>
                </div>
                <Button onClick={handlePayManual} disabled={payManualLoading} variant="destructive" className="w-full gap-2">
                  {payManualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Regularizar Pagamento Agora
                </Button>
              </div>
            )}
          </div>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa de transação: {plano.taxa_transacao_percentual ?? plano.taxa_transacao}%
                  {(plano.taxa_transacao_fixa || 0) > 0 ? ` + R$ ${plano.taxa_transacao_fixa.toFixed(2).replace('.', ',')}` : ''}
                </p>
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
                {checkoutLoading === plano._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
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
