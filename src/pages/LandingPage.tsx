import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Store, Zap, BarChart3, CreditCard, Globe, ShieldCheck,
  ArrowRight, ShoppingCart, Timer, Users, Star, Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { settingsApi } from '@/services/api';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';

interface Depoimento {
  nome: string;
  cargo: string;
  texto: string;
}

const FALLBACK_DEPOIMENTOS: Depoimento[] = [
  { nome: 'Maria S.', cargo: 'Lojista', texto: 'Minha conversão de PIX dobrou com o checkout nativo. Nunca mais volto para outra plataforma.' },
  { nome: 'Carlos R.', cargo: 'Empreendedor', texto: 'Melhor alternativa à Shopify para o mercado brasileiro. Zero taxas e suporte real.' },
  { nome: 'Ana P.', cargo: 'E-commerce', texto: 'Em 2 meses recuperei mais de R$ 15.000 em carrinhos abandonados. Ferramenta absurda.' },
];

const features = [
  { icon: CreditCard, title: 'PIX Nativo com SealPay', desc: 'Receba pagamentos instantâneos sem intermediários. Zero taxa sobre vendas.' },
  { icon: ShoppingCart, title: 'Recuperação de Carrinho', desc: 'Saiba exatamente quem abandonou e em qual etapa. Recupere vendas perdidas.' },
  { icon: Zap, title: 'SPA Ultra-Rápido', desc: 'Sua loja carrega em milissegundos. Sem reloads, sem espera. Conversão máxima.' },
  { icon: Store, title: 'Multi-Loja num Painel', desc: 'Gerencie 10 lojas com 1 login. Dados isolados por loja e seguros.' },
  { icon: Globe, title: 'Domínio Próprio', desc: 'Conecte o seu domínio com verificação automática. Presença profissional.' },
  { icon: BarChart3, title: 'Tracking Inteligente', desc: 'Pixels do Facebook e TikTok integrados automaticamente em cada loja.' },
];

const metrics = [
  { value: '0%', label: 'Taxas sobre vendas' },
  { value: '3s', label: 'Checkout PIX completo' },
  { value: '∞', label: 'Lojas por conta' },
  { value: '24/7', label: 'Uptime garantido' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>(FALLBACK_DEPOIMENTOS);
  const { brandName, slogan, isLoading: brandLoading } = useSaaSBrand();
  useFaviconUpdater();

  // Dynamic title: {slogan} | {brandName} — only after data loaded
  useEffect(() => {
    if (brandLoading) return;
    document.title = slogan ? `${slogan} | ${brandName}` : brandName;
  }, [brandName, slogan, brandLoading]);

  useEffect(() => {
    settingsApi.getByKeys(['depoimentos_landing_page']).then(settings => {
      try {
        const raw = settings.find(s => s.key === 'depoimentos_landing_page')?.value;
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setDepoimentos(parsed);
      } catch { /* fallback keeps showing */ }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <SaaSLogo context="home" theme="dark" nameClassName="text-xl text-white tracking-tight" />
          <div className="flex gap-3">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-white" asChild>
              <Link to="/registro">Comece Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-24 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-8">
            <Zap className="h-3.5 w-3.5" /> Plataforma #1 para lojas brasileiras
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
            Sua loja online
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              pronta em minutos
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie, gerencie e escale múltiplas lojas com pagamentos PIX nativos, recuperação de carrinho abandonado e domínio próprio. <strong className="text-slate-200">Sem taxas sobre vendas.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 text-base px-8 h-12" onClick={() => navigate('/registro')}>
              Criar minha loja agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 h-12" onClick={() => navigate('/login')}>
              Já tenho conta
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">{m.value}</p>
                <p className="text-sm text-slate-400 mt-1">{m.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Tudo o que precisa para vender online</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">Ferramentas profissionais que grandes plataformas cobram fortunas. Aqui, está tudo incluído.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/40 transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <f.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-slate-100">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-800 bg-slate-900/30 py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
            <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-center mb-12">O que nossos lojistas dizem</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {depoimentos.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative"
              >
                <Quote className="h-8 w-8 text-emerald-500/20 absolute top-4 right-4" />
                <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {d.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{d.nome}</p>
                    <p className="text-xs text-slate-500">{d.cargo}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para escalar?</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">Crie a sua conta gratuita e lance a sua primeira loja em menos de 5 minutos. Sem cartão de crédito.</p>
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 text-base px-8 h-12" onClick={() => navigate('/registro')}>
              Criar Conta Grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
