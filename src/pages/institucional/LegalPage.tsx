import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import InstitucionalLayout from '@/components/InstitucionalLayout';
import { publicLandingApi, type LandingPageCMSData } from '@/services/saas-api';

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, delay, ease },
});

interface LegalPageProps {
  tipo: 'termos' | 'privacidade';
}

const LegalPage = ({ tipo }: LegalPageProps) => {
  const [cms, setCms] = useState<LandingPageCMSData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicLandingApi.getCMS()
      .then(setCms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const titulo = tipo === 'termos' ? 'Termos de Uso' : 'Política de Privacidade';
  const conteudo = tipo === 'termos'
    ? cms?.legal?.termosUso
    : cms?.legal?.politicaPrivacidade;

  if (loading) {
    return (
      <InstitucionalLayout>
        <div className="container mx-auto px-4 py-20 max-w-4xl">
          <Skeleton className="h-10 w-80 mb-8 bg-zinc-100" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full bg-zinc-100" />)}
          </div>
        </div>
      </InstitucionalLayout>
    );
  }

  return (
    <InstitucionalLayout>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...reveal()} className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight mb-8">
              {titulo}
            </h1>
            <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {conteudo || `Nenhum conteúdo de "${titulo}" cadastrado ainda.`}
            </div>
          </motion.div>
        </div>
      </section>
    </InstitucionalLayout>
  );
};

export default LegalPage;
