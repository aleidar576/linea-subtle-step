import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Crown, Zap, Loader2, ExternalLink, AlertTriangle, RefreshCw, Receipt, Info, ShieldAlert, CreditCard, XCircle, CornerDownRight, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const parseBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
      : part
  );
};

const parseAnchor = (text: string) => {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) =>
    part.startsWith('[[') && part.endsWith(']]')
      ? <strong key={i} className="font-bold text-primary">{part.slice(2, -2)}</strong>
      : part
  );
};
import { useToast } from '@/hooks/use-toast';
import { planosApi, stripeApi, lojistaApi, type Plano, type LojistaProfile } from '@/services/saas-api';
import { settingsApi } from '@/services/api';
import { useSaaSPixels } from '@/hooks/useSaaSPixels';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  trialing: { label: 'Trial Ativo', className: 'bg-primary/10 text-primary' },
  active: { label: 'Ativa', className: 'bg-primary/15 text-primary' },
  past_due: { label: 'Atrasada', className: 'bg-destructive/10 text-destructive' },
  canceled: { label: 'Cancelada', className: 'bg-muted text-muted-foreground' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const LojaAssinatura = () => {
  const { trackSaaSEvent } = useSaaSPixels();
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
  const [diasToleranciaTaxas, setDiasToleranciaTaxas] = useState(3);
  const [activeTab, setActiveTab] = useState<'business' | 'loja_pronta'>('business');

  const fetchData = useCallback(() => {
    return Promise.all([planosApi.list(), lojistaApi.perfil()])
      .then(([p, prof]) => { setPlanos(p); setProfile(prof); })
      .catch(() => toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' }));
  }, [toast]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    settingsApi.getByKeys(['dias_tolerancia_taxas']).then(settings => {
      const s = settings.find(s => s.key === 'dias_tolerancia_taxas');
      if (s?.value) setDiasToleranciaTaxas(Number(s.value) || 3);
    }).catch(() => {});
  }, [fetchData]);

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
      trackSaaSEvent('Subscribe', { content_name: 'Assinatura Lojista', currency: 'BRL' });
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
      window.dispatchEvent(new Event('refresh-lojista-profile'));
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
      ? { label: 'Cancelamento Programado', className: 'bg-secondary/15 text-secondary border-secondary/20' }
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
                  {formatCurrency(precoPromocional)}
                </span>
                <span className="text-sm text-muted-foreground">/ mês</span>
              </div>
            )}

            {isTrial && currentPlano && (
              <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-4 border border-primary/30">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground font-medium space-y-1">
                  <p>
                    Você está no <strong className="text-foreground">período trial de 7 dias</strong>. Ao final, será cobrado automaticamente o plano{' '}
                    <strong className="text-foreground">{planoNome}</strong> de{' '}
                    <strong className="text-foreground">{formatCurrency(precoPromocional ?? 0)}/mês</strong>.
                  </p>
                  {profile.data_vencimento && (
                    <p>
                      O trial termina em <strong className="text-foreground">{new Date(profile.data_vencimento).toLocaleDateString('pt-BR')}</strong>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {isCancelScheduled && cancelDate && (
              <div className="flex items-center gap-3 rounded-lg bg-secondary/15 p-4 border border-secondary/20">
                <AlertTriangle className="h-5 w-5 text-secondary shrink-0" />
                <p className="text-sm text-secondary font-medium">
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

          {/* BLOCO 2 REMOVIDO: Taxas de Transação Acumuladas */}
        </div>
      </div>
    );
  }

  // === PLANS SELECTION VIEW ===
  const hasLojaPronta = planos.some(p => (p.categoria || 'business') === 'loja_pronta');
  const filteredPlanos = planos.filter(p => (p.categoria || 'business') === activeTab);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
        <p className="text-muted-foreground">
          {activeTab === 'business'
            ? 'Comece com 7 dias grátis. Cancele quando quiser.'
            : 'Serviços de criação profissional para sua loja.'}
        </p>
      </div>

      {/* Tabs */}
      {hasLojaPronta && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'business'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Planos Business
            </button>
            <button
              onClick={() => setActiveTab('loja_pronta')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'loja_pronta'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Loja Pronta
            </button>
          </div>
        </div>
      )}

      {filteredPlanos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum plano disponível no momento.</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${filteredPlanos.length === 1 ? 'max-w-md mx-auto' : filteredPlanos.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : filteredPlanos.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          {filteredPlanos.map((plano) => (
            <div
              key={plano._id}
              className={`bg-card rounded-2xl p-8 relative flex flex-col ${
                plano.destaque
                  ? 'border-2 border-primary shadow-lg shadow-primary/10'
                  : 'border border-border'
              }`}
            >
              {plano.destaque && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                    Recomendado
                  </span>
                </div>
              )}

              {/* ── HEADER CENTRALIZADO (altura fixa para alinhar cards) ── */}
              <div className="text-center pt-2 h-auto md:h-[140px] flex flex-col justify-start">
                <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
                  {plano.destaque && <Zap className="h-6 w-6 text-primary" />}
                  {plano.nome}
                </h2>
                {plano.subtitulo && (
                  <p className="text-sm text-muted-foreground mt-1">{plano.subtitulo}</p>
                )}
              {/* Taxa de transação removida do visual */}
              </div>

              {/* ── PREÇO MASSIVO (altura fixa para alinhar) ── */}
              <div className="text-center py-8 h-auto md:h-[140px] flex flex-col items-center justify-center">
                {(() => {
                  const precoReal = (plano.preco_promocional > 0 ? plano.preco_promocional : plano.preco_original) || 0;

                  {/* A) Pagamento Único com preço — estilo Tray */}
                  if (plano.isPagamentoUnico && precoReal > 0) {
                    return (
                      <>
                        {plano.preco_original > 0 && plano.preco_original !== plano.preco_promocional && (
                          <p className="text-sm line-through decoration-destructive/50 text-muted-foreground mb-2">
                            {formatCurrency(plano.preco_original)}
                          </p>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-black text-foreground">
                            {plano.maxParcelas > 1 ? `${plano.maxParcelas}x` : '1x'}
                          </span>
                          <span className="text-lg font-medium text-muted-foreground">de</span>
                          <span className="text-4xl font-black text-foreground">
                            {formatCurrency(precoReal / (plano.maxParcelas > 1 ? plano.maxParcelas : 1))}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">
                          ou {formatCurrency(precoReal)} à vista
                        </p>
                      </>
                    );
                  }

                  {/* B) Sob Medida sem preço — fallback enterprise */}
                  if (plano.isSobMedida && precoReal === 0) {
                    return <span className="text-4xl font-black text-foreground">Sob Medida</span>;
                  }

                  {/* C) SaaS recorrente padrão */}
                  return (
                    <>
                      {plano.preco_original > 0 && plano.preco_original !== plano.preco_promocional && (
                        <p className="text-sm line-through decoration-destructive/50 text-muted-foreground mb-2">
                          {formatCurrency(plano.preco_original)}
                        </p>
                      )}
                      {precoReal > 0 ? (
                        <div className="flex items-start justify-center">
                          <span className="text-2xl font-bold text-muted-foreground mt-2">R$</span>
                          <span className="text-6xl font-black text-foreground tracking-tight leading-none mx-1">
                            {precoReal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-4xl font-black text-foreground">Consultar</span>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">/mês</p>
                    </>
                  );
                })()}
              </div>

              {/* ── CTA ACIMA DA LISTA ── */}
              <Button
                className="w-full gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 mb-8 h-12 text-base font-semibold"
                onClick={() => {
                  if (plano.isSobMedida) {
                    window.open(`https://wa.me/${plano.whatsappNumero}?text=${encodeURIComponent(plano.whatsappMensagem || '')}`, '_blank');
                  } else {
                    handleCheckout(plano._id);
                  }
                }}
                disabled={!plano.isSobMedida && checkoutLoading === plano._id}
              >
                {checkoutLoading === plano._id && !plano.isSobMedida ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : plano.isSobMedida ? (
                  <MessageCircle className="h-5 w-5" />
                ) : (
                  <Crown className="h-5 w-5" />
                )}
                {plano.textoBotao || (plano.isSobMedida ? 'Falar com Especialista' : plano.isPagamentoUnico ? 'Contratar Agora' : 'Começar 7 Dias Grátis')}
              </Button>

              {/* ── LISTA DE FEATURES (mt-auto ancora no fundo do card) ── */}
              <div>
              {plano.textoDestaque && (
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <CornerDownRight className="h-4 w-4 text-primary shrink-0" />
                  <span>{parseAnchor(plano.textoDestaque)}</span>
                </div>
              )}

              {/* ── VANTAGENS ── */}
              {plano.vantagens && plano.vantagens.length > 0 && (
                <ul className="space-y-4">
                  {plano.vantagens.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" fill="currentColor" stroke="hsl(var(--card))" />
                      <span className="text-muted-foreground">{parseBold(feat)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* ── DESTAQUES EXTRAS ── */}
              {plano.destaques && plano.destaques.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/30">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">
                    Você também conta com:
                  </p>
                  <ul className="space-y-3">
                    {plano.destaques.map((d, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{parseBold(d)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── DESVANTAGENS ── */}
              {plano.desvantagens && plano.desvantagens.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/30 space-y-3">
                  {plano.desvantagens.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <XCircle className="h-5 w-5 text-destructive/60 shrink-0" />
                      {parseBold(item)}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        {activeTab === 'business'
          ? 'Durante o trial de 7 dias, a taxa de transação aplicada é de 2.0%.'
          : 'Pagamento único. Sem mensalidades adicionais para o serviço contratado.'}
      </p>
    </div>
  );
};

export default LojaAssinatura;
