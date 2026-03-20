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
import InstitucionalLayout from '@/components/InstitucionalLayout';
import { publicLandingApi, type LandingPageCMSData, type Plano } from '@/services/saas-api';

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

const PlanosPage = () => {
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <InstitucionalLayout>
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-10 w-64 mx-auto mb-4 bg-zinc-100" />
          <Skeleton className="h-5 w-96 mx-auto mb-12 bg-zinc-100" />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 bg-zinc-100 rounded-2xl" />)}
          </div>
        </div>
      </InstitucionalLayout>
    );
  }

  return (
    <InstitucionalLayout>
      {/* Pricing */}
      <section className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div {...reveal()} className="text-center mb-14">
            <h1 className="text-3xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-3">
              Planos e preços
            </h1>
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
                    isHighlight ? 'border-2 shadow-lg hover:shadow-xl' : 'border border-zinc-200 shadow-sm hover:shadow-md'
                  }`}
                  style={isHighlight ? { borderColor: 'hsl(var(--primary))' } : undefined}
                >
                  {isHighlight && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
                      Mais popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-zinc-900">{plano.nome}</h3>
                  {plano.subtitulo && <p className="text-sm text-zinc-500 mt-1">{plano.subtitulo}</p>}

                  <div className="my-6">
                    {isSobMedida && plano.preco_promocional === 0 ? (
                      <p className="text-2xl font-bold text-zinc-900">Sob Medida</p>
                    ) : (
                      <>
                        {hasPriceDiscount && (
                          <p className="text-sm text-zinc-400 line-through">{formatCurrency(plano.preco_original)}/mês</p>
                        )}
                        <p className="text-3xl font-extrabold text-zinc-900">
                          {plano.preco_promocional === 0 ? 'Grátis' : (
                            <>{formatCurrency(plano.preco_promocional)}<span className="text-sm font-normal text-zinc-500">{plano.isPagamentoUnico ? ' único' : '/mês'}</span></>
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
                      className="inline-flex items-center justify-center gap-2 rounded-lg h-11 px-6 text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
                      {plano.textoBotao || 'Falar com especialista'} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Button className="w-full h-11 rounded-lg text-white" style={{ backgroundColor: 'hsl(var(--primary))' }} onClick={() => navigate('/registro')}>
                      {plano.textoBotao || 'Criar conta gratuita'} <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

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

      {/* FAQ */}
      {cms && cms.faq.length > 0 && (
        <section className="bg-zinc-50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div {...reveal()} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Dúvidas frequentes</h2>
            </motion.div>
            <motion.div {...reveal(0.1)} className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {cms.faq.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border border-zinc-200 rounded-xl px-5 data-[state=open]:shadow-sm transition-shadow bg-white">
                    <AccordionTrigger className="text-left font-medium text-zinc-900 hover:no-underline py-4">{item.pergunta}</AccordionTrigger>
                    <AccordionContent className="text-zinc-500 leading-relaxed pb-4">{item.resposta}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>
      )}
    </InstitucionalLayout>
  );
};

export default PlanosPage;
