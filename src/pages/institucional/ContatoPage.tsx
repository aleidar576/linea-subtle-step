import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import InstitucionalLayout from '@/components/InstitucionalLayout';
import { publicLandingApi, type LandingPageCMSData } from '@/services/saas-api';

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, delay, ease },
});

const ContatoPage = () => {
  const { toast } = useToast();
  const [cms, setCms] = useState<LandingPageCMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ nome: '', email: '', mensagem: '' });

  useEffect(() => {
    publicLandingApi.getCMS()
      .then(setCms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Mensagem enviada com sucesso!', description: 'Entraremos em contato em breve.' });
    setFormData({ nome: '', email: '', mensagem: '' });
  };

  if (loading) {
    return (
      <InstitucionalLayout>
        <div className="container mx-auto px-4 py-20 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-4 bg-zinc-100" />
          <Skeleton className="h-5 w-96 mb-12 bg-zinc-100" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="h-80 bg-zinc-100 rounded-xl" />
            <Skeleton className="h-80 bg-zinc-100 rounded-xl" />
          </div>
        </div>
      </InstitucionalLayout>
    );
  }

  const contato = cms?.contato || { email: '', whatsapp: '', textoApoio: '' };
  const whatsappClean = (contato.whatsapp || '').replace(/\D/g, '');

  return (
    <InstitucionalLayout>
      <section className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div {...reveal()} className="text-center mb-14">
            <h1 className="text-3xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-3">
              Entre em contato
            </h1>
            {contato.textoApoio && (
              <p className="text-zinc-500 max-w-lg mx-auto">{contato.textoApoio}</p>
            )}
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Form */}
            <motion.div {...reveal()}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-zinc-700">Nome</Label>
                  <Input
                    required
                    value={formData.nome}
                    onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Email</Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Mensagem</Label>
                  <Textarea
                    required
                    value={formData.mensagem}
                    onChange={e => setFormData(prev => ({ ...prev, mensagem: e.target.value }))}
                    placeholder="Como podemos ajudar?"
                    rows={5}
                    className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-300"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-white"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                  Enviar mensagem
                </Button>
              </form>
            </motion.div>

            {/* Contact card */}
            <motion.div {...reveal(0.15)} className="flex flex-col gap-6">
              {contato.email && (
                <div className="rounded-xl border border-zinc-200 p-6 bg-zinc-50">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-zinc-500" />
                    <h3 className="font-semibold text-zinc-900">Email</h3>
                  </div>
                  <a href={`mailto:${contato.email}`} className="text-zinc-600 hover:text-zinc-900 transition-colors text-sm">
                    {contato.email}
                  </a>
                </div>
              )}

              {whatsappClean && (
                <div className="rounded-xl border border-zinc-200 p-6 bg-zinc-50 flex flex-col items-center text-center gap-4">
                  <MessageCircle className="h-8 w-8 text-emerald-500" />
                  <h3 className="font-semibold text-zinc-900 text-lg">Fale pelo WhatsApp</h3>
                  <p className="text-sm text-zinc-500">Atendimento rápido e direto com nossa equipe.</p>
                  <Button
                    className="w-full h-12 text-base font-semibold text-white"
                    style={{ backgroundColor: '#25D366' }}
                    onClick={() => window.open(`https://wa.me/${whatsappClean}`, '_blank')}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Abrir WhatsApp
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </InstitucionalLayout>
  );
};

export default ContatoPage;
