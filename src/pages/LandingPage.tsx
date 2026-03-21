import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DynamicIcon, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';
import InstitucionalLayout from '@/components/InstitucionalLayout';
import { publicLandingApi, type LandingPageCMSData, type Plano } from '@/services/saas-api';

/* ───────── helpers ───────── */

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ease = [0.16, 1, 0.3, 1] as const;

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, delay, ease },
});

const buildWhatsAppLink = (numero: string, mensagem: string) => {
  const clean = (numero || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensagem)}`;
};

/* ───────── Loading skeleton ───────── */

const LandingSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border" />
    <div className="container mx-auto px-4 pt-20 pb-16">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <Skeleton className="h-12 w-3/4 bg-muted" />
          <Skeleton className="h-12 w-1/2 bg-muted" />
          <Skeleton className="h-5 w-full bg-muted" />
          <Skeleton className="h-5 w-2/3 bg-muted" />
          <Skeleton className="h-12 w-80 bg-muted rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full bg-muted rounded-xl" />
      </div>
    </div>
  </div>
);

/* ───────── FAQ Column ───────── */

const FAQColumn = ({ items, offset = 0 }: { items: { pergunta: string; resposta: string }[]; offset?: number }) => (
  <Accordion type="single" collapsible className="space-y-3">
    {items.map((item, i) => (
      <AccordionItem
        key={i}
        value={`faq-${offset + i}`}
        className="border border-border rounded-xl px-5 data-[state=open]:shadow-sm transition-shadow"
      >
        <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
          {item.pergunta}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
          {item.resposta}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

/* ───────── Pricing Card ───────── */

const PricingCard = ({ plano, index, navigate }: { plano: Plano; index: number; navigate: (path: string) => void }) => {
  const isHighlight = plano.destaque;
  const isSobMedida = plano.isSobMedida;
  const hasPriceDiscount = plano.preco_original > 0 && plano.preco_promocional > 0 && plano.preco_original !== plano.preco_promocional;

  return (
    <motion.div
      {...reveal(0.08 * index)}
      className={`relative bg-card rounded-2xl p-7 flex flex-col transition-shadow duration-300 ${
        isHighlight
          ? 'border-2 border-primary shadow-lg hover:shadow-xl'
          : 'border border-border shadow-sm hover:shadow-md'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
          Mais popular
        </div>
      )}

      <h3 className="text-lg font-bold text-foreground">{plano.nome}</h3>
      {plano.subtitulo && (
        <p className="text-sm text-muted-foreground mt-1">{plano.subtitulo}</p>
      )}

      <div className="my-6">
        {isSobMedida && plano.preco_promocional === 0 ? (
          <p className="text-2xl font-bold text-foreground">Sob Medida</p>
        ) : (
          <>
            {hasPriceDiscount && (
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrency(plano.preco_original)}/mês
              </p>
            )}
            <p className="text-3xl font-extrabold text-foreground">
              {plano.preco_promocional === 0 ? 'Grátis' : (
                <>
                  {formatCurrency(plano.preco_promocional)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {plano.isPagamentoUnico ? ' único' : '/mês'}
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </div>

      {isSobMedida ? (
        <a
          href={buildWhatsAppLink(plano.whatsappNumero, plano.whatsappMensagem || `Olá! Tenho interesse no plano ${plano.nome}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground transition-colors hover:opacity-90"
        >
          {plano.textoBotao || 'Falar com especialista'} <ArrowRight className="h-4 w-4" />
        </a>
      ) : (
        <Button
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:opacity-90"
          onClick={() => navigate('/registro')}
        >
          {plano.textoBotao || 'Criar conta gratuita'} <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      <ul className="mt-6 space-y-2.5 flex-1">
        {(plano.vantagens || []).map((v, vi) => (
          <li key={vi} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{v}</span>
          </li>
        ))}
        {(plano.desvantagens || []).map((d, di) => (
          <li key={`d-${di}`} className="flex items-start gap-2 text-sm text-muted-foreground/50">
            <X className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/30" />
            <span className="line-through">{d}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

/* ───────── main component ───────── */

const LandingPage = () => {
  const navigate = useNavigate();
  const { brandName, slogan, isLoading: brandLoading } = useSaaSBrand();
  useFaviconUpdater();

  const [cms, setCms] = useState<LandingPageCMSData | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([publicLandingApi.getCMS(), publicLandingApi.getPlanos()])
      .then(([cmsRes, planosRes]) => {
        setCms(cmsRes);
        setPlanos((Array.isArray(planosRes) ? planosRes : []).filter(p => p.is_active).sort((a, b) => a.ordem - b.ordem));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (brandLoading) return;
    document.title = slogan ? `${slogan} | ${brandName}` : brandName;
  }, [brandName, slogan, brandLoading]);

  if (loading || !cms) return <LandingSkeleton />;

  const hero = cms.hero;
  const ctaInt = cms.ctaIntermediario;
  const ctaFin = cms.ctaFinal;

  /* Split planos by isSobMedida */
  const planosSaaS = planos.filter(p => !p.isSobMedida);
  const planosLojaPronta = planos.filter(p => p.isSobMedida);

  /* Split FAQ into 2 columns */
  const faqHalf = Math.ceil((cms.faq || []).length / 2);
  const faqLeft = (cms.faq || []).slice(0, faqHalf);
  const faqRight = (cms.faq || []).slice(faqHalf);

  /* CTA link handler */
  const handleCtaLink = (link: string) => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  return (
    <InstitucionalLayout>
      {/* ══════════════ HERO ══════════════ */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="flex flex-col-reverse gap-8 md:grid md:grid-cols-2 items-center md:gap-16">
            {/* Text */}
            <motion.div {...reveal()} className="max-w-xl">
              {hero.titulo && (
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-foreground">
                  {hero.titulo}
                </h1>
              )}
              {hero.subtitulo && (
                <p className="text-lg md:text-xl text-muted-foreground font-medium mt-5 mb-8">
                  {hero.subtitulo}
                </p>
              )}

              {/* CTA inline on desktop, stacked on mobile */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <input
                  type="email"
                  placeholder="Seu melhor email"
                  className="flex-1 h-12 rounded-xl px-5 border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/registro')}
                />
                <Button
                  className="h-12 rounded-xl px-8 text-base font-semibold gap-2 bg-primary text-primary-foreground hover:opacity-90 whitespace-nowrap"
                  onClick={() => navigate('/registro')}
                >
                  {hero.ctaTexto || 'Começar grátis'} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {hero.bottomTexto && (
                <p className="text-xs text-muted-foreground mt-3">{hero.bottomTexto}</p>
              )}
            </motion.div>

            {/* Image */}
            {hero.imagemUrl && (
              <motion.div {...reveal(0.15)} className="flex justify-center md:justify-end">
                <img
                  src={hero.imagemUrl}
                  alt="Plataforma"
                  className="w-full h-auto object-contain max-w-[500px] max-h-[500px] rounded-3xl shadow-2xl"
                  loading="eager"
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ INTEGRATIONS — INFINITE CAROUSEL ══════════════ */}
      {cms.integrations.length > 0 && (
        <section className="bg-muted/50 border-y border-border py-12 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.p {...reveal()} className="text-xs font-semibold tracking-widest text-muted-foreground text-center uppercase mb-8">
              Já integrada com tudo que você precisa
            </motion.p>
          </div>
          <div className="relative">
            <div className="flex items-center gap-12 md:gap-16 animate-scroll-infinite" style={{ width: 'max-content' }}>
              {[...cms.integrations, ...cms.integrations].map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Integração ${(i % cms.integrations.length) + 1}`}
                  className="max-h-10 md:max-h-12 object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300 shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ MINI FEATURES GRID ══════════════ */}
      {cms.miniFeatures.length > 0 && (
        <section id="recursos" className="bg-background py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Plataforma completa para criar sua loja online
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {cms.miniFeatures.map((f, i) => (
                <motion.div key={i} {...reveal(0.05 * i)} className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl mb-4 bg-primary/10">
                    <DynamicIcon name={f.iconeNome || 'boxes'} className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-sm md:text-base">{f.titulo}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.descricao}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ Z-PATTERN BLOCKS ══════════════ */}
      {cms.zPatternBlocks.map((block, i) => (
        <section key={i} className={i % 2 === 0 ? 'bg-muted/50' : 'bg-background'}>
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <motion.div
                {...reveal(0.1)}
                className={block.alinhamentoImagem === 'direita' ? 'md:order-last' : ''}
              >
                {block.imagemUrl && (
                  <img
                    src={block.imagemUrl}
                    alt={block.titulo}
                    className="w-full h-auto object-contain rounded-xl shadow-2xl"
                    loading="lazy"
                  />
                )}
              </motion.div>
              <motion.div {...reveal()}>
                <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-5 leading-tight">
                  {block.titulo}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                  {block.descricao}
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* ══════════════ CTA INTERMEDIÁRIO ══════════════ */}
      {ctaInt?.titulo && (
        <section className="bg-primary py-16 md:py-20">
          <div className="container mx-auto px-4 text-center">
            <motion.div {...reveal()}>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
                {ctaInt.titulo}
              </h2>
              {ctaInt.subtitulo && (
                <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                  {ctaInt.subtitulo}
                </p>
              )}
              <Button
                size="lg"
                className="rounded-xl h-12 px-10 text-base font-semibold gap-2 bg-background text-foreground hover:bg-background/90"
                onClick={() => handleCtaLink(ctaInt.link || '/registro')}
              >
                {ctaInt.textoBotao || 'Começar agora'} <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════ PRICING — SaaS ══════════════ */}
      {planosSaaS.length > 0 && (
        <section id="planos" className="bg-muted/50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
                Comece pelo plano ideal
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Escolha o plano que se encaixa no seu momento. Sem surpresas, sem taxas escondidas.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {planosSaaS.map((plano, i) => (
                <PricingCard key={plano._id} plano={plano} index={i} navigate={navigate} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ PRICING — LOJA PRONTA ══════════════ */}
      {planosLojaPronta.length > 0 && (
        <section className="bg-background py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
                Loja Pronta
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Sua loja online montada por especialistas, pronta para vender.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {planosLojaPronta.map((plano, i) => (
                <PricingCard key={plano._id} plano={plano} index={i} navigate={navigate} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ FAQ — 2 COLUMNS ══════════════ */}
      {cms.faq.length > 0 && (
        <section className="bg-muted/50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Dúvidas frequentes
              </h2>
            </motion.div>
            <motion.div {...reveal(0.1)} className="max-w-5xl mx-auto grid md:grid-cols-2 gap-x-8 gap-y-0">
              <FAQColumn items={faqLeft} offset={0} />
              {faqRight.length > 0 && <FAQColumn items={faqRight} offset={faqHalf} />}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════ CTA FINAL ══════════════ */}
      {ctaFin?.titulo && (
        <section className="bg-foreground py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <motion.div {...reveal()}>
                <h2 className="text-3xl md:text-4xl font-bold text-background tracking-tight mb-4 leading-tight">
                  {ctaFin.titulo}
                </h2>
                {ctaFin.subtitulo && (
                  <p className="text-lg text-background/70 mb-8 leading-relaxed">
                    {ctaFin.subtitulo}
                  </p>
                )}
                <Button
                  size="lg"
                  className="rounded-xl h-12 px-10 text-base font-semibold gap-2 bg-primary text-primary-foreground hover:opacity-90"
                  onClick={() => handleCtaLink(ctaFin.link || '/registro')}
                >
                  {ctaFin.textoBotao || 'Criar minha loja grátis'} <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>

              {ctaFin.imagemUrl && (
                <motion.div {...reveal(0.15)} className="flex justify-center md:justify-end">
                  <img
                    src={ctaFin.imagemUrl}
                    alt="Mockup"
                    className="w-full h-auto object-contain max-w-[480px] rounded-2xl shadow-2xl"
                    loading="lazy"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}
    </InstitucionalLayout>
  );
};

export default LandingPage;
