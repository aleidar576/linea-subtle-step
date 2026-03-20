import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X as XIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaaSLogo, useSaaSBrand } from '@/components/SaaSBrand';

interface Props {
  children: React.ReactNode;
}

const InstitucionalLayout = ({ children }: Props) => {
  const navigate = useNavigate();
  const { brandName } = useSaaSBrand();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation is handled via <Link> components — no scrollTo needed

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      {/* ══════════════ HEADER ══════════════ */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          <Link to="/">
            <SaaSLogo context="home" theme="light" nameClassName="text-xl text-zinc-900 tracking-tight" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <Link to="/planos" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Planos
            </Link>
            <Link to="/sobre" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Sobre
            </Link>
            <Link to="/contato" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Contato
            </Link>
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
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left text-sm text-zinc-600 py-2">Home</Link>
            <Link to="/planos" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left text-sm text-zinc-600 py-2">Planos</Link>
            <Link to="/sobre" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left text-sm text-zinc-600 py-2">Sobre</Link>
            <Link to="/contato" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left text-sm text-zinc-600 py-2">Contato</Link>
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

      {/* ══════════════ CONTENT ══════════════ */}
      <main>{children}</main>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="bg-zinc-950 text-zinc-400">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <SaaSLogo context="home" theme="dark" nameClassName="text-lg text-white tracking-tight" />
              <p className="text-sm text-zinc-500 mt-3 max-w-xs">
                A plataforma de e-commerce mais rápida do Brasil.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Produto</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/planos" className="hover:text-white transition-colors">Planos e preços</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Empresa</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre nós</Link></li>
                <li><Link to="/contato" className="hover:text-white transition-colors">Contato</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/privacidade" className="hover:text-white transition-colors">Política de privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-white transition-colors">Termos de uso</Link></li>
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

export default InstitucionalLayout;
