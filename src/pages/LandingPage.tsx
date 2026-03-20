import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X, Menu, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater, DynamicIcon } from '@/components/SaaSBrand';
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

/* ───────── Loading skeleton ───────── */

const LandingSkeleton = () => (
  <div className="min-h-screen bg-white">
    <div className="h-16 border-b border-zinc-100" />
    <div className="container mx-auto px-4 pt-20 pb-16">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <Skeleton className="h-12 w-3/4 bg-zinc-100" />
          <Skeleton className="h-12 w-1/2 bg-zinc-100" />
          <Skeleton className="h-5 w-full bg-zinc-100" />
          <Skeleton className="h-5 w-2/3 bg-zinc-100" />
          <Skeleton className="h-12 w-80 bg-zinc-100 rounded-full" />
        </div>
        <Skeleton className="h-72 w-full bg-zinc-100 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ───────── main component ───────── */

const LandingPage = () => {
  const navigate = useNavigate();
  const { brandName, slogan, isLoading: brandLoading } = useSaaSBrand();
  useFaviconUpdater();

  const [cms, setCms] = useState<LandingPageCMSData | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ─── data fetching ─── */
  useEffect(() => {
    Promise.all([publicLandingApi.getCMS(), publicLandingApi.getPlanos()])
      .then(([cmsRes, planosRes]) => {
        setCms(cmsRes);
        setPlanos((Array.isArray(planosRes) ? planosRes : []).filter(p => p.is_active).sort((a, b) => a.ordem - b.ordem));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── document title ─── */
  useEffect(() => {
    if (brandLoading) return;
    document.title = slogan ? `${slogan} | ${brandName}` : brandName;
  }, [brandName, slogan, brandLoading]);

  if (loading || !cms) return <LandingSkeleton />;

  const hero = cms.hero;

  /* ─── WhatsApp link builder ─── */
  const buildWhatsAppLink = (numero: string, mensagem: string) => {
    const clean = numero.replace(/\D/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(mensagem)}`;
  };

  /* ─── smooth scroll ─── */
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 scroll-smooth">
      {/* ══════════════ HEADER ══════════════ */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          <SaaSLogo context="home" theme="light" nameClassName="text-xl text-zinc-900 tracking-tight" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo('recursos')} className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Recursos
            </button>
            <button onClick={() => scrollTo('planos')} className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Planos
            </button>
            <Button variant="ghost" className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => navigate('/login')}>
              Fazer login
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
              onClick={() => navigate('/registro')}
            >
              Criar conta gratuita
            </Button>
          </nav>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-zinc-700" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-zinc-100 px-4 pb-4 space-y-3">
            <button onClick={() => scrollTo('recursos')} className="block w-full text-left text-sm text-zinc-600 py-2">Recursos</button>
            <button onClick={() => scrollTo('planos')} className="block w-full text-left text-sm text-zinc-600 py-2">Planos</button>
            <Button variant="outline" className="w-full border-zinc-200 text-zinc-700" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
              Fazer login
            </Button>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
              onClick={() => { setMobileMenuOpen(false); navigate('/registro'); }}
            >
              Criar conta gratuita
            </Button>
          </div>
        )}
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <motion.div {...reveal()}>
              {hero.titulo && (
                <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.08] tracking-tight text-zinc-900 mb-6">
                  {hero.titulo}
                </h1>
              )}
              {hero.subtitulo && (
                <p className="text-lg md:text-xl text-zinc-500 leading-relaxed mb-8 max-w-lg">
                  {hero.subtitulo}
                </p>
              )}

              {/* Email input group */}
              <div
                className="flex items-center bg-white border border-zinc-200 rounded-full shadow-lg shadow-zinc-900/5 max-w-md overflow-hidden"
              >
                <Input
                  type="email"
                  placeholder="Seu email"
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-12 pl-5 text-zinc-900 placeholder:text-zinc-400 rounded-full"
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/registro')}
                />
                <Button
                  className="rounded-full h-10 px-6 mr-1 text-white shrink-0 gap-1.5"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                  onClick={() => navigate('/registro')}
                >
                  {hero.ctaTexto || 'Começar grátis'} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {hero.bottomTexto && (
                <p className="text-xs text-zinc-400 mt-4">{hero.bottomTexto}</p>
              )}
            </motion.div>

            {/* Image */}
            {hero.imagemUrl && (
              <motion.div {...reveal(0.15)}>
                <img
                  src={hero.imagemUrl}
                  alt="Plataforma"
                  className="w-full h-auto object-contain rounded-2xl shadow-2xl"
                  loading="eager"
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ INTEGRATIONS STRIP ══════════════ */}
      {cms.integrations.length > 0 && (
        <section className="bg-zinc-50 border-y border-zinc-100 py-12">
          <div className="container mx-auto px-4">
            <motion.p {...reveal()} className="text-xs font-semibold tracking-widest text-zinc-400 text-center uppercase mb-8">
              Já integrada com tudo que você precisa
            </motion.p>
            <motion.div {...reveal(0.1)} className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {cms.integrations.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Integração ${i + 1}`}
                  className="max-h-10 md:max-h-12 object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                  loading="lazy"
                />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════ MINI FEATURES GRID ══════════════ */}
      {cms.miniFeatures.length > 0 && (
        <section id="recursos" className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">
                Plataforma completa para criar sua loja online
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {cms.miniFeatures.map((f, i) => (
                <motion.div key={i} {...reveal(0.05 * i)} className="text-center md:text-left">
                  <div
                    className="inline-flex items-center justify-center h-11 w-11 rounded-xl mb-4"
                    style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                  >
                    <DynamicIcon name={f.iconeNome || 'boxes'} className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-1.5 text-sm md:text-base">{f.titulo}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{f.descricao}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ Z-PATTERN BLOCKS ══════════════ */}
      {cms.zPatternBlocks.map((block, i) => (
        <section
          key={i}
          className={i % 2 === 0 ? 'bg-zinc-50' : 'bg-white'}
        >
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              {/* Image */}
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

              {/* Text */}
              <motion.div {...reveal()}>
                <h2 className="text-2xl md:text-4xl font-bold text-zinc-900 tracking-tight mb-5 leading-tight">
                  {block.titulo}
                </h2>
                <p className="text-base md:text-lg text-zinc-500 leading-relaxed whitespace-pre-line">
                  {block.descricao}
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* ══════════════ PRICING ══════════════ */}
      {planos.length > 0 && (
        <section id="planos" className="bg-zinc-50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight mb-3">
                Comece pelo plano ideal
              </h2>
              <p className="text-zinc-500 max-w-lg mx-auto">
                Escolha o plano que se encaixa no seu momento. Sem surpresas, sem taxas escondidas.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {planos.map((plano, i) => {
                const isHighlight = plano.destaque;
                const isSobMedida = plano.isSobMedida;
                const hasPriceDiscount = plano.preco_original > 0 && plano.preco_promocional > 0 && plano.preco_original !== plano.preco_promocional;

                return (
                  <motion.div
                    key={plano._id}
                    {...reveal(0.08 * i)}
                    className={`relative bg-white rounded-2xl p-7 flex flex-col transition-shadow duration-300 ${
                      isHighlight
                        ? 'border-2 shadow-lg hover:shadow-xl'
                        : 'border border-zinc-200 shadow-sm hover:shadow-md'
                    }`}
                    style={isHighlight ? { borderColor: 'hsl(var(--primary))' } : undefined}
                  >
                    {/* Highlight badge */}
                    {isHighlight && (
                      <div
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                      >
                        Mais popular
                      </div>
                    )}

                    {/* Plan name */}
                    <h3 className="text-lg font-bold text-zinc-900">{plano.nome}</h3>
                    {plano.subtitulo && (
                      <p className="text-sm text-zinc-500 mt-1">{plano.subtitulo}</p>
                    )}

                    {/* Price */}
                    <div className="my-6">
                      {isSobMedida && plano.preco_promocional === 0 ? (
                        <p className="text-2xl font-bold text-zinc-900">Sob Medida</p>
                      ) : (
                        <>
                          {hasPriceDiscount && (
                            <p className="text-sm text-zinc-400 line-through">
                              {formatCurrency(plano.preco_original)}/mês
                            </p>
                          )}
                          <p className="text-3xl font-extrabold text-zinc-900">
                            {plano.preco_promocional === 0 ? 'Grátis' : (
                              <>
                                {formatCurrency(plano.preco_promocional)}
                                <span className="text-sm font-normal text-zinc-500">
                                  {plano.isPagamentoUnico ? ' único' : '/mês'}
                                </span>
                              </>
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    {isSobMedida ? (
                      <a
                        href={buildWhatsAppLink(plano.whatsappNumero, plano.whatsappMensagem || `Olá! Tenho interesse no plano ${plano.nome}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg h-11 px-6 text-sm font-semibold text-white transition-colors"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                      >
                        {plano.textoBotao || 'Falar com especialista'} <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Button
                        className="w-full h-11 rounded-lg text-white"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                        onClick={() => navigate('/registro')}
                      >
                        {plano.textoBotao || 'Criar conta gratuita'} <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Features */}
                    <ul className="mt-6 space-y-2.5 flex-1">
                      {plano.vantagens.map((v, vi) => (
                        <li key={vi} className="flex items-start gap-2 text-sm text-zinc-600">
                          <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                          <span>{v}</span>
                        </li>
                      ))}
                      {plano.desvantagens.map((d, di) => (
                        <li key={`d-${di}`} className="flex items-start gap-2 text-sm text-zinc-400">
                          <X className="h-4 w-4 shrink-0 mt-0.5 text-zinc-300" />
                          <span className="line-through">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ FAQ ══════════════ */}
      {cms.faq.length > 0 && (
        <section className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">
                Dúvidas frequentes
              </h2>
            </motion.div>
            <motion.div {...reveal(0.1)} className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {cms.faq.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border border-zinc-200 rounded-xl px-5 data-[state=open]:shadow-sm transition-shadow"
                  >
                    <AccordionTrigger className="text-left font-medium text-zinc-900 hover:no-underline py-4">
                      {item.pergunta}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-500 leading-relaxed pb-4">
                      {item.resposta}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="bg-zinc-950 text-zinc-400">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <SaaSLogo context="home" theme="dark" nameClassName="text-lg text-white tracking-tight" />
              <p className="text-sm text-zinc-500 mt-3 max-w-xs">
                A plataforma de e-commerce mais rápida do Brasil.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Produto</h4>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => scrollTo('recursos')} className="hover:text-white transition-colors">Recursos</button></li>
                <li><button onClick={() => scrollTo('planos')} className="hover:text-white transition-colors">Planos e preços</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Conta</h4>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Fazer login</button></li>
                <li><button onClick={() => navigate('/registro')} className="hover:text-white transition-colors">Criar conta gratuita</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => navigate('/privacidade')} className="hover:text-white transition-colors">Política de privacidade</button></li>
                <li><button onClick={() => navigate('/termos')} className="hover:text-white transition-colors">Termos de uso</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-10 pt-6 text-center text-xs text-zinc-600">
            © {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
