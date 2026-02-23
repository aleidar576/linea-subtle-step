import { useEffect, useRef, useCallback, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader2, Store, Search, X, MessageCircle, User } from 'lucide-react';
import { useLojaByDomain } from '@/hooks/useLojaPublica';
import { LojaProvider } from '@/contexts/LojaContext';
import { useCart } from '@/contexts/CartContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FooterConfig, LogoConfig } from '@/services/saas-api';

// ── Hex to HSL converter ──
function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: hue = ((b - r) / d + 2) * 60; break;
      case b: hue = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// Pixel init
const initializedPixels = new Set<string>();

function initFBPixel(pixelId: string) {
  const key = `fb_${pixelId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);
  const w = window as any;
  if (!w.fbq) {
    const n: any = (w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(s);
  }
  w.fbq('init', pixelId);
}

function initTTPixel(pixelId: string) {
  const key = `tt_${pixelId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);
  const w = window as any;
  if (!w.ttq) {
    const ttq: any = (w.ttq = w.ttq || []);
    ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
    ttq.setAndDefer = function (t: any, e: string) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t: string) { const e = ttq._i[t] || []; for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
    ttq.load = function (e: string) { const r = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; const o = document.createElement('script'); o.type = 'text/javascript'; o.async = true; o.src = r + '?sdkid=' + e + '&lib=ttq'; document.head.appendChild(o); };
    ttq.load(pixelId);
  } else {
    w.ttq.load(pixelId);
  }
}

function firePixelEvent(event: string, data?: Record<string, any>) {
  const w = window as any;
  if (w.fbq) { data ? w.fbq('track', event, data) : w.fbq('track', event); }
  if (w.ttq) { data ? w.ttq.track(event, data) : w.ttq.track(event); }
}

const GENERIC_BAG_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/%3E%3Cline x1='3' y1='6' x2='21' y2='6'/%3E%3Cpath d='M16 10a4 4 0 0 1-8 0'/%3E%3C/svg%3E";

// ── Logo Renderer ──
function HeaderLogo({ logo, icone, nome }: { logo: LogoConfig | null; icone: string; nome: string }) {
  const maxH = logo?.tamanho || 48;
  if (logo) {
    if ((logo.tipo === 'upload' || logo.tipo === 'url') && logo.imagem_url) {
      return <img src={logo.imagem_url} alt={nome} style={{ maxHeight: `${maxH}px` }} className="object-contain" />;
    }
    if (logo.tipo === 'texto' && logo.texto) {
      return <span className="font-bold text-foreground truncate max-w-[200px]" style={{ fontFamily: logo.fonte, fontSize: `${Math.min(maxH * 0.5, 32)}px` }}>{logo.texto}</span>;
    }
  }
  // Fallback: icon + name
  return (
    <>
      {icone && <img src={icone} alt="" className="h-8 w-8 rounded" />}
      <span className="text-lg font-bold text-foreground">{nome}</span>
    </>
  );
}

// ── Full Footer ──
function LojaFooter({ footer, nome, slug }: { footer: FooterConfig | null; nome: string; slug: string }) {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/produto/');

  if (!footer) {
    return (
      <footer className={`border-t border-border bg-card ${isProductPage ? 'pt-4 pb-20' : 'py-6'}`}>
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {nome}. Todos os direitos reservados.</p>
        </div>
      </footer>
    );
  }

  const hasColunas = footer.colunas?.some(c => c.links.length > 0);
  const redes = footer.redes_sociais || {};
  const activeRedes = Object.entries(redes).filter(([, v]) => v?.ativo && v?.url);

  return (
    <footer className={`border-t border-border bg-card ${isProductPage ? 'pt-4 pb-20' : 'py-8'}`}>
      <div className="container space-y-6">
        {hasColunas && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {footer.colunas.filter(c => c.links.length > 0).map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-foreground text-sm mb-3">{col.titulo}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      {link.pagina_slug ? (
                        <Link to={`/pagina/${link.pagina_slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {link.label}
                        </Link>
                      ) : link.url ? (
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeRedes.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            {activeRedes.map(([key, val]) => (
              <a key={key} href={val.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-sm capitalize">
                {key}
              </a>
            ))}
          </div>
        )}

        {footer.selos?.ativo && footer.selos?.url && (
          <div className="flex justify-center">
            <img src={footer.selos.url} alt="Selos de segurança" className="max-h-12 object-contain" />
          </div>
        )}

        <div className="border-t border-border pt-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            {footer.texto_copyright || `© ${new Date().getFullYear()} ${nome}. Todos os direitos reservados.`}
          </p>
          {footer.texto_cnpj && <p className="text-xs text-muted-foreground">{footer.texto_cnpj}</p>}
          {footer.texto_endereco && <p className="text-xs text-muted-foreground">{footer.texto_endereco}</p>}
        </div>
      </div>
    </footer>
  );
}

// ── Cookie Consent ──
function CookieConsent({ ativo }: { ativo: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ativo) return;
    const accepted = localStorage.getItem('cookie_consent');
    if (!accepted) setTimeout(() => setVisible(true), 1500);
  }, [ativo]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 space-y-3">
        <p className="text-sm text-foreground font-medium">🍪 Cookies</p>
        <p className="text-xs text-muted-foreground">
          Utilizamos cookies para melhorar sua experiência de navegação e personalizar conteúdo.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { localStorage.setItem('cookie_consent', 'accepted'); setVisible(false); }} className="flex-1">
            Aceitar
          </Button>
          <Button size="sm" variant="outline" onClick={() => { localStorage.setItem('cookie_consent', 'declined'); setVisible(false); }} className="flex-1">
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Welcome Popup ──
function WelcomePopup({ config }: { config: any }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (!config?.ativo || location.pathname !== '/') return;
    const seen = sessionStorage.getItem('popup_seen');
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [config?.ativo, location.pathname]);

  if (!visible) return null;

  const handleClose = () => {
    sessionStorage.setItem('popup_seen', 'true');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0" onClick={e => e.stopPropagation()}>
        {config.imagem_url && (
          <img src={config.imagem_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-6 space-y-3 text-center">
          <h2 className="text-lg font-bold text-foreground">{config.titulo || 'Bem-vindo!'}</h2>
          {config.subtitulo && <p className="text-sm text-muted-foreground">{config.subtitulo}</p>}
          {config.tipo === 'newsletter' && (
            <div className="space-y-2">
              <Input value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Seu melhor e-mail" />
              <Button className="w-full" onClick={() => { handleClose(); }}>
                {config.botao_texto || 'Quero meu cupom!'}
              </Button>
            </div>
          )}
          {config.tipo === 'aviso' && config.botao_texto && (
            <Button className="w-full" onClick={handleClose}>
              {config.botao_texto}
            </Button>
          )}
          {config.cupom_codigo && (
            <div className="bg-primary/10 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Use o cupom:</p>
              <p className="text-lg font-bold text-primary">{config.cupom_codigo}</p>
            </div>
          )}
          <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp Float ──
function WhatsAppFloat({ numero }: { numero: string }) {
  const location = useLocation();
  if (!numero) return null;
  const clean = numero.replace(/\D/g, '');
  const isProductPage = location.pathname.startsWith('/produto/');
  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg hover:scale-110 transition-transform ${isProductPage ? 'bottom-20' : 'bottom-6'}`}
      style={{ backgroundColor: 'hsl(var(--whatsapp-button))' }}
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

interface LojaLayoutProps {
  hostname: string;
}

export default function LojaLayout({ hostname }: LojaLayoutProps) {
  const { data: loja, isLoading, isError } = useLojaByDomain(hostname);
  const location = useLocation();
  const navigate = useNavigate();
  const lastPageView = useRef('');
  const { totalItems } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Init pixels
  useEffect(() => {
    if (!loja?.pixels) return;
    loja.pixels.forEach(p => {
      if (p.platform === 'facebook') initFBPixel(p.pixel_id);
      else if (p.platform === 'tiktok') initTTPixel(p.pixel_id);
    });
  }, [loja?.pixels]);

  // PageView on route change
  useEffect(() => {
    if (!loja?.pixels?.length) return;
    const path = location.pathname + location.search;
    if (lastPageView.current === path) return;
    lastPageView.current = path;
    firePixelEvent('PageView');
  }, [location.pathname, location.search, loja?.pixels]);

  // Dynamic favicon only (title handled by each page component)
  useEffect(() => {
    if (!loja) return;
    const faviconHref = loja.favicon || GENERIC_BAG_FAVICON;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = faviconHref;
  }, [loja]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !loja) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Loja não encontrada</h1>
        <p className="text-muted-foreground">Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  const config = loja.configuracoes || {} as any;
  const customCss = config.custom_css || '';
  const produtoConfig = config.produto_config;
  const searchEnabled = produtoConfig?.barra_pesquisa?.ativo ?? false;
  const chatbotEnabled = produtoConfig?.chatbot?.ativo ?? false;
  const coresGlobais = config.cores_globais || null;
  const logoConfig: LogoConfig | null = config.logo || null;
  const footerConfig: FooterConfig | null = config.footer || null;
  const whatsappNumero: string = config.whatsapp_numero || '';
  const homepageConfig = config.homepage_config || null;

  // Normalize cores_globais: legacy migration + defaults
  const normalizeCores = (raw: any) => {
    if (!raw) return null;
    // Legacy migration: old fields -> new semantic fields
    if (raw.cor_primaria && !raw.brand_primary) {
      return {
        brand_primary: raw.cor_primaria,
        brand_secondary: raw.cor_secundaria || '#F1F1F2',
        bg_base: raw.cor_fundo || '#F8F8F8',
        bg_surface: '#FFFFFF',
        text_primary: raw.cor_texto || '#111111',
        whatsapp_button: '#25D366',
      };
    }
    return raw;
  };

  const normalizedCores = normalizeCores(coresGlobais);

  // Derive foreground color based on luminosity
  function hslDarken(hsl: string, amount: number): string {
    const parts = hsl.split(' ');
    const l = parseFloat(parts[2]);
    return `${parts[0]} ${parts[1]} ${Math.max(0, l - amount)}%`;
  }
  function hslLighten(hsl: string, amount: number): string {
    const parts = hsl.split(' ');
    const l = parseFloat(parts[2]);
    return `${parts[0]} ${parts[1]} ${Math.min(100, l + amount)}%`;
  }
  function hslMix(a: string, b: string): string {
    const pa = a.split(' '), pb = b.split(' ');
    const h = (parseFloat(pa[0]) + parseFloat(pb[0])) / 2;
    const s = (parseFloat(pa[1]) + parseFloat(pb[1])) / 2;
    const l = (parseFloat(pa[2]) + parseFloat(pb[2])) / 2;
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
  }

  // Build dynamic theme CSS with semantic variables
  const dynamicThemeCss = (() => {
    if (!normalizedCores?.brand_primary) return '';
    const primary = hexToHsl(normalizedCores.brand_primary);
    const primaryFg = isLightColor(normalizedCores.brand_primary) ? '222 47% 11%' : '0 0% 100%';
    const secondary = normalizedCores.brand_secondary ? hexToHsl(normalizedCores.brand_secondary) : '240 5% 95%';
    const secondaryFg = normalizedCores.brand_secondary && isLightColor(normalizedCores.brand_secondary) ? '222 47% 11%' : '0 0% 100%';
    const bgBase = normalizedCores.bg_base ? hexToHsl(normalizedCores.bg_base) : '0 0% 97%';
    const bgSurface = normalizedCores.bg_surface ? hexToHsl(normalizedCores.bg_surface) : '0 0% 100%';
    const textPrimary = normalizedCores.text_primary ? hexToHsl(normalizedCores.text_primary) : '0 0% 7%';
    const whatsappHsl = normalizedCores.whatsapp_button ? hexToHsl(normalizedCores.whatsapp_button) : '142 70% 49%';

    // Derived colors
    const border = hslDarken(bgSurface, 6);
    const muted = hslDarken(bgBase, 3);
    const mutedFg = hslMix(textPrimary, bgBase);

    let css = ':root {\n';
    // Brand primary -> primary, accent, ring
    css += `  --primary: ${primary};\n`;
    css += `  --primary-foreground: ${primaryFg};\n`;
    css += `  --accent: ${primary};\n`;
    css += `  --accent-foreground: ${primaryFg};\n`;
    css += `  --ring: ${primary};\n`;
    // Brand secondary
    css += `  --secondary: ${secondary};\n`;
    css += `  --secondary-foreground: ${secondaryFg};\n`;
    // Background
    css += `  --background: ${bgBase};\n`;
    // Surface -> card, popover
    css += `  --card: ${bgSurface};\n`;
    css += `  --popover: ${bgSurface};\n`;
    // Text
    css += `  --foreground: ${textPrimary};\n`;
    css += `  --card-foreground: ${textPrimary};\n`;
    css += `  --popover-foreground: ${textPrimary};\n`;
    // Derived
    css += `  --border: ${border};\n`;
    css += `  --input: ${border};\n`;
    css += `  --muted: ${muted};\n`;
    css += `  --muted-foreground: ${mutedFg};\n`;
    // WhatsApp isolated
    css += `  --whatsapp-button: ${whatsappHsl};\n`;
    css += '}';
    return css;
  })();

  const exigirCadastro = config.exigir_cadastro_cliente ?? false;

  const ctxValue = {
    lojaId: loja._id,
    slug: loja.slug,
    nome: loja.nome,
    nomeExibicao: loja.nome_exibicao || loja.nome,
    favicon: loja.favicon || '',
    icone: loja.icone || '',
    tema: config.tema || 'market-tok',
    categoriaHomeId: config.categoria_home_id || null,
    sealpayKey: config.sealpay_api_key || null,
    customCss,
    pixels: loja.pixels || [],
    searchEnabled,
    chatbotEnabled,
    coresGlobais: normalizedCores,
    homepageConfig,
    footer: footerConfig,
    logo: logoConfig,
    whatsappNumero,
    exigirCadastro,
    slogan: (loja as any).slogan || '',
    cartConfig: config.cart_config || null,
    isLoading: false,
    notFound: false,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
    }
  };

  const displayName = loja.nome_exibicao || loja.nome;

  return (
    <LojaProvider value={ctxValue}>
      {dynamicThemeCss && <style id="dynamic-store-theme" dangerouslySetInnerHTML={{ __html: dynamicThemeCss }} />}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
          <div className={`container flex h-14 items-center gap-3 ${logoConfig?.posicao === 'centro' ? 'justify-between' : 'justify-between'}`}>
            <Link to="/" className={`flex items-center gap-2 shrink-0 ${logoConfig?.posicao === 'centro' ? 'absolute left-1/2 -translate-x-1/2' : ''}`}>
              <HeaderLogo logo={logoConfig} icone={loja.icone || ''} nome={displayName} />
            </Link>

            {searchEnabled && (
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar produtos..." className="pl-9 h-9" />
                </div>
              </form>
            )}

            <div className="flex items-center gap-2">
              {searchEnabled && (
                <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </button>
              )}
              {exigirCadastro && (
                <Link to="/conta/login" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5" />
                </Link>
              )}
              <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {searchEnabled && searchOpen && (
            <div className="md:hidden border-t border-border px-4 py-2">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar produtos..." className="pl-9" autoFocus />
                </div>
              </form>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <LojaFooter footer={footerConfig} nome={displayName} slug={loja.slug} />

        {/* WhatsApp */}
        <WhatsAppFloat numero={whatsappNumero} />

        {/* Cookie Consent */}
        <CookieConsent ativo={homepageConfig?.cookie_consent?.ativo ?? false} />

        {/* Welcome Popup */}
        <WelcomePopup config={homepageConfig?.popup} />
      </div>
    </LojaProvider>
  );
}

export { firePixelEvent };
