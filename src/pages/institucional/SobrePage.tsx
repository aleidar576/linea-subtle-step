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

const SobrePage = () => {
  const [cms, setCms] = useState<LandingPageCMSData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicLandingApi.getCMS()
      .then(setCms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <InstitucionalLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <Skeleton className="h-72 bg-zinc-100 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4 bg-zinc-100" />
              <Skeleton className="h-5 w-full bg-zinc-100" />
              <Skeleton className="h-5 w-full bg-zinc-100" />
              <Skeleton className="h-5 w-2/3 bg-zinc-100" />
            </div>
          </div>
        </div>
      </InstitucionalLayout>
    );
  }

  const sobre = cms?.sobre || { titulo: '', conteudo: '', imagemUrl: '' };

  return (
    <InstitucionalLayout>
      <section className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-5xl mx-auto">
            {/* Image */}
            {sobre.imagemUrl && (
              <motion.div {...reveal(0.1)}>
                <img
                  src={sobre.imagemUrl}
                  alt={sobre.titulo || 'Sobre nós'}
                  className="w-full h-auto object-contain rounded-xl shadow-2xl"
                />
              </motion.div>
            )}

            {/* Text */}
            <motion.div {...reveal()}>
              <h1 className="text-3xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-6 leading-tight">
                {sobre.titulo || 'Sobre nós'}
              </h1>
              <p className="text-base md:text-lg text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {sobre.conteudo || 'Em breve mais informações sobre nossa empresa.'}
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </InstitucionalLayout>
  );
};

export default SobrePage;
