import { useEffect, useRef, useCallback, useState } from 'react';
import { getSavedUtmParams } from '@/hooks/useUtmParams';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader2, Store, Search, X, MessageCircle, User, Instagram, Facebook, Youtube, Music2, Gift, Tag } from 'lucide-react';
import { useLojaByDomain } from '@/hooks/useLojaPublica';
import { LojaProvider } from '@/contexts/LojaContext';
import { useCart } from '@/contexts/CartContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { leadsApi, cuponsPopupApi } from '@/services/saas-api';
import type { FooterConfig, LogoConfig } from '@/services/saas-api';
import { toast } from 'sonner';

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

interface LojaPixelConfig {
  platform: 'facebook' | 'tiktok' | 'google_ads' | 'gtm';
  pixel_id: string;
  access_token?: string;
  conversion_label?: string;
  events?: string[];
  trigger_pages?: string[];
  is_active: boolean;
}

let _activePixels: LojaPixelConfig[] = [];

function setActivePixels(pixels: LojaPixelConfig[]) {
  _activePixels = pixels;
}

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

function initGoogleAds(conversionId: string) {
  const key = `gads_${conversionId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    const s = document.createElement('script'); s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(s);
  }
  w.gtag('config', conversionId);
}

function initGTM(containerId: string) {
  const key = `gtm_${containerId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  (function (w2: any, d: Document, s: string, l: string, i: string) {
    w2[l] = w2[l] || [];
    w2[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s) as HTMLScriptElement;
    const dl = l !== 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f?.parentNode?.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', containerId);
}

// Map current pathname to a page type for trigger_pages filtering
function getCurrentPageType(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'homepage';
  if (pathname.startsWith('/categoria')) return 'categorias';
  if (pathname.startsWith('/produto')) return 'produtos';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/carrinho') || pathname.startsWith('/cart')) return 'checkout';
  if (pathname.startsWith('/sucesso')) return 'checkout';
  return 'other';
}

function firePixelEvent(event: string, data?: Record<string, any>) {
  const w = window as any;
  const pathname = window.location.pathname;
  const currentPage = getCurrentPageType(pathname);

  for (const pixel of _activePixels) {
    // Check events filter: if pixel has specific events, only fire if event is in list
    if (pixel.events && pixel.events.length > 0 && !pixel.events.includes(event)) continue;

    // Check trigger_pages filter: if pixel has specific pages, check current page
    if (pixel.trigger_pages && pixel.trigger_pages.length > 0 && !pixel.trigger_pages.includes('all')) {
      if (!pixel.trigger_pages.includes(currentPage)) continue;
    }

    if (pixel.platform === 'facebook' && w.fbq) {
      data ? w.fbq('track', event, data) : w.fbq('track', event);
    } else if (pixel.platform === 'tiktok' && w.ttq) {
      data ? w.ttq.track(event, data) : w.ttq.track(event);
    } else if (pixel.platform === 'google_ads' && w.gtag) {
      const gadsEventMap: Record<string, string> = { PageView: 'page_view', ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', AddPaymentInfo: 'add_payment_info', Purchase: 'purchase' };
      const gEvent = gadsEventMap[event] || event;
      if (event === 'Purchase' && pixel.conversion_label) {
        w.gtag('event', 'conversion', { send_to: `${pixel.pixel_id}/${pixel.conversion_label}`, value: data?.value || 0, currency: data?.currency || 'BRL', transaction_id: data?.content_id || '' });
      } else {
        w.gtag('event', gEvent, { currency: data?.currency || 'BRL', value: data?.value || 0, ...(data?.contents ? { items: data.contents } : {}) });
      }
    } else if (pixel.platform === 'gtm' && w.dataLayer) {
      const gtmEventMap: Record<string, string> = { PageView: 'page_view', ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', AddPaymentInfo: 'add_payment_info', Purchase: 'purchase' };
      w.dataLayer.push({ event: gtmEventMap[event] || event, ecommerce: data || {} });
    }
  }
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

// ── Full Footer (Premium Responsivo) ──
function FooterCustomLogo({ footerLogo, nome }: { footerLogo: NonNullable<FooterConfig['footer_logo']>; nome: string }) {
  if ((footerLogo.tipo === 'upload' || footerLogo.tipo === 'url') && footerLogo.imagem_url) {
    return <img src={footerLogo.imagem_url} alt={nome} style={{ maxHeight: `${footerLogo.tamanho || 48}px` }} className="object-contain" />;
  }
  if (footerLogo.tipo === 'texto' && footerLogo.texto) {
    return <span className="font-bold" style={{ fontFamily: footerLogo.fonte, fontSize: `${Math.min((footerLogo.tamanho || 48) * 0.5, 32)}px` }}>{footerLogo.texto}</span>;
  }
  return <span className="font-semibold">{nome}</span>;
}

function LojaFooter({ footer, nome, slug, lojaId, logo, icone }: { footer: FooterConfig | null; nome: string; slug: string; lojaId: string; logo: LogoConfig | null; icone: string }) {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/produto/');
  const [nlEmail, setNlEmail] = useState('');
  const [nlLoading, setNlLoading] = useState(false);

  if (!footer) {
    return (
      <footer className={`border-t border-border bg-card ${isProductPage ? 'pt-4 pb-20' : 'py-6'}`}>
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {nome}. Todos os direitos reservados.</p>
        </div>
      </footer>
    );
  }

  const footerBg = footer.cores?.fundo || undefined;
  const footerText = footer.cores?.texto || undefined;
  const redes = footer.redes_sociais || {};
  const activeRedes = Object.entries(redes).filter(([, v]) => v?.ativo);

  const redeIcons: Record<string, any> = { instagram: Instagram, tiktok: Music2, facebook: Facebook, youtube: Youtube };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(nlEmail)) { toast.error('E-mail inválido'); return; }
    setNlLoading(true);
    try {
      await leadsApi.subscribe(lojaId, nlEmail, 'FOOTER');
      toast.success('Inscrito com sucesso!');
      setNlEmail('');
    } catch { toast.error('Erro ao inscrever'); }
    finally { setNlLoading(false); }
  };

  const colunasComLinks = footer.colunas?.filter(c => c.links.length > 0) || [];
  const gridCols = Math.min(colunasComLinks.length + 1, 5);

  return (
    <footer className={isProductPage ? 'pb-20' : ''} style={{ backgroundColor: footerBg, color: footerText }}>
      {/* BLOCO 1 - Newsletter (design "FIQUE POR DENTRO") */}
      {footer.newsletter && (() => {
        const nlCores = footer.newsletter_cores;
        const nlBg = nlCores?.fundo || footerBg;
        const nlText = nlCores?.texto || footerText;
        return (
        <div className="border-b border-border" style={nlBg ? { backgroundColor: nlBg, borderColor: nlText ? `${nlText}22` : undefined } : { backgroundColor: 'hsl(var(--card))' }}>
          <div className="container py-10 flex flex-col items-center text-center gap-4">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: nlText }}>FIQUE POR DENTRO</h3>
            <p className="text-sm opacity-70" style={{ color: nlText }}>Receba nossa newsletter com novidades e promoções!</p>
            <form onSubmit={handleNewsletterSubmit} className="w-full max-w-md mt-2">
              <div className="relative border-b-2 border-current opacity-60 focus-within:opacity-100 transition-opacity" style={{ borderColor: nlText || 'currentColor' }}>
                <input
                  value={nlEmail}
                  onChange={e => setNlEmail(e.target.value)}
                  placeholder="E-MAIL"
                  type="email"
                  className="w-full bg-transparent py-3 pr-12 text-sm placeholder:tracking-widest placeholder:text-current/50 focus:outline-none"
                  style={{ color: nlText }}
                />
                <button
                  type="submit"
                  disabled={nlLoading}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-80 transition-opacity"
                  style={{ color: nlText }}
                  aria-label="Inscrever"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* BLOCO 2 - Grid de Navegação e Marca */}
      <div className={`border-t border-border ${!footer.newsletter ? '' : ''}`} style={{ backgroundColor: footerBg }}>
        <div className="container py-8">
          {/* Desktop */}
          <div className={`hidden md:grid gap-8`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
            {/* Logo + Redes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {footer.footer_logo?.ativo ? (
                  <FooterCustomLogo footerLogo={footer.footer_logo} nome={nome} />
                ) : (
                  <HeaderLogo logo={logo} icone={icone} nome={nome} />
                )}
              </div>
              {activeRedes.length > 0 && (
                <div className="flex items-center gap-4 mt-2">
                  {activeRedes.map(([key, val]) => {
                    const Icon = redeIcons[key] || MessageCircle;
                    const hasLink = val.url && val.url !== '#' && val.url.trim() !== '';
                    return hasLink ? (
                      <a key={key} href={val.url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                        <Icon className="h-6 w-6" />
                      </a>
                    ) : (
                      <span key={key} className="opacity-70"><Icon className="h-6 w-6" /></span>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Colunas */}
            {colunasComLinks.map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-sm mb-3">{col.titulo}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => {
                    const linkName = link.nome || (link as any).label || '';
                    const linkUrl = link.url || (link as any).pagina_slug ? `/${(link as any).pagina_slug ? `pagina/${(link as any).pagina_slug}` : ''}` : '';
                    const finalUrl = link.url || (link as any).pagina_slug ? (link.url || `/pagina/${(link as any).pagina_slug}`) : '#';
                    const isInternal = finalUrl.startsWith('/') || finalUrl.startsWith('#');
                    return (
                      <li key={j}>
                        {isInternal ? (
                          <Link to={finalUrl} className="text-sm opacity-70 hover:opacity-100 transition-opacity">{linkName}</Link>
                        ) : (
                          <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-sm opacity-70 hover:opacity-100 transition-opacity">{linkName}</a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-6">
            <div className="flex flex-col items-center gap-3">
              {footer.footer_logo?.ativo ? (
                <FooterCustomLogo footerLogo={footer.footer_logo} nome={nome} />
              ) : (
                <HeaderLogo logo={logo} icone={icone} nome={nome} />
              )}
              {activeRedes.length > 0 && (
                <div className="flex items-center gap-5 mt-1">
                  {activeRedes.map(([key, val]) => {
                    const Icon = redeIcons[key] || MessageCircle;
                    const hasLink = val.url && val.url !== '#' && val.url.trim() !== '';
                    return hasLink ? (
                      <a key={key} href={val.url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                        <Icon className="h-7 w-7" />
                      </a>
                    ) : (
                      <span key={key} className="opacity-70"><Icon className="h-7 w-7" /></span>
                    );
                  })}
                </div>
              )}
            </div>
            {colunasComLinks.length > 0 && (
              <Accordion type="multiple" className="w-full">
                {colunasComLinks.map((col, i) => (
                  <AccordionItem key={i} value={`col-${i}`}>
                    <AccordionTrigger className="text-sm font-semibold">{col.titulo}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 py-1">
                        {col.links.map((link, j) => {
                          const linkName = link.nome || (link as any).label || '';
                          const finalUrl = link.url || ((link as any).pagina_slug ? `/pagina/${(link as any).pagina_slug}` : '#');
                          const isInternal = finalUrl.startsWith('/') || finalUrl.startsWith('#');
                          return (
                            <li key={j}>
                              {isInternal ? (
                                <Link to={finalUrl} className="text-sm opacity-70 hover:opacity-100">{linkName}</Link>
                              ) : (
                                <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-sm opacity-70 hover:opacity-100">{linkName}</a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>

      {/* BLOCO 3 - Créditos */}
      <div className="border-t" style={{ borderColor: footerText ? `${footerText}33` : undefined }}>
        <div className="container py-4">
          <div className="flex flex-col items-center text-center gap-1 md:flex-row md:justify-between md:text-left">
            <p className="text-sm opacity-70">
              {footer.texto_copyright || `© ${new Date().getFullYear()} ${nome}. Todos os direitos reservados.`}
            </p>
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:gap-3 md:items-center">
              {footer.texto_cnpj && <p className="text-xs opacity-50">{footer.texto_cnpj}</p>}
              {footer.texto_endereco && <p className="text-xs opacity-50">{footer.texto_endereco}</p>}
            </div>
          </div>
        </div>
      </div>

      {footer.selos?.ativo && footer.selos?.url && (
        <div className="flex justify-center py-2" style={{ backgroundColor: footerBg }}>
          <img src={footer.selos.url} alt="Selos de segurança" className="max-h-12 object-contain" />
        </div>
      )}
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
function WelcomePopup({ config, lojaId }: { config: any; lojaId: string }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [cuponsLoaded, setCuponsLoaded] = useState<Array<{ _id: string; codigo: string; tipo: string; valor: number }>>([]);
  const [cuponsReady, setCuponsReady] = useState(false);
  const location = useLocation();

  // For CUPONS type: fetch coupons FIRST, then show popup only after data is loaded
  // For other types: show popup directly after the delay
  useEffect(() => {
    if (!config?.ativo) return;
    const seen = sessionStorage.getItem('popup_seen');
    if (seen) return;

    const isCuponsType = config?.tipo === 'CUPONS' && config?.cupons_ids?.length > 0;

    if (isCuponsType) {
      // Fetch coupons first, then show after delay
      cuponsPopupApi.getBulk(lojaId, config.cupons_ids)
        .then(data => {
          setCuponsLoaded(data);
          setCuponsReady(true);
        })
        .catch(() => setCuponsReady(true));
    } else {
      setCuponsReady(true);
    }
  }, [config?.ativo, config?.tipo, config?.cupons_ids, lojaId]);

  // Show popup only after cupons are ready (or immediately for non-coupon types)
  useEffect(() => {
    if (!config?.ativo || !cuponsReady) return;
    const seen = sessionStorage.getItem('popup_seen');
    if (seen) return;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [config?.ativo, cuponsReady]);

  if (!visible) return null;

  const handleClose = () => {
    sessionStorage.setItem('popup_seen', 'true');
    setVisible(false);
  };

  const popupBg = config.cores?.fundo || undefined;
  const popupText = config.cores?.texto || undefined;
  const btnBg = config.cores?.botao_fundo || undefined;
  const btnText = config.cores?.botao_texto || undefined;

  const handleResgatarCupons = () => {
    cuponsLoaded.forEach(c => {
      const key = `cupom_resgatado_${c.codigo}`;
      localStorage.setItem(key, JSON.stringify(c));
    });
    sessionStorage.setItem('popup_seen', 'true');
    setVisible(false);
    toast.success('Cupons resgatados!');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
        style={{ backgroundColor: popupBg || 'hsl(var(--card))', color: popupText }}
        onClick={e => e.stopPropagation()}
      >
        {config.imagem_url && (
          <img src={config.imagem_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-6 space-y-4 text-center">
          {/* CUPONS type */}
          {config.tipo === 'CUPONS' && (
            <>
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: popupText ? `${popupText}10` : 'hsl(var(--muted))' }}>
                  <Gift className="h-7 w-7" style={{ color: popupText || 'hsl(var(--foreground))' }} />
                </div>
              </div>
              <h2 className="text-lg font-bold" style={{ color: popupText }}>{config.titulo || '🎉 Parabéns!'}</h2>
              {config.subtitulo && <p className="text-sm opacity-70" style={{ color: popupText }}>{config.subtitulo}</p>}
              {cuponsLoaded.length > 0 && (
                <div className="space-y-2 text-left">
                  {cuponsLoaded.map(c => (
                    <div key={c._id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: popupText ? `${popupText}20` : 'hsl(var(--border))' }}>
                      <div>
                        <p className="font-bold text-sm" style={{ color: popupText }}>{c.codigo}</p>
                        <p className="text-xs opacity-60" style={{ color: popupText }}>
                          {c.tipo === 'percentual' ? `${c.valor}% de desconto` : c.valor === 0 ? 'Frete grátis' : `R$ ${c.valor.toFixed(2)} de desconto`}
                        </p>
                      </div>
                      <Tag className="h-5 w-5 opacity-40" style={{ color: popupText }} />
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleResgatarCupons}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: btnBg || 'hsl(var(--foreground))',
                  color: btnText || 'hsl(var(--background))',
                }}
              >
                <Gift className="h-4 w-4" />
                {config.texto_botao || 'RESGATAR CUPONS'}
              </button>
              <button onClick={handleClose} className="text-xs opacity-50 hover:opacity-80 underline" style={{ color: popupText }}>
                Não, obrigado
              </button>
            </>
          )}

          {/* NEWSLETTER type */}
          {(config.tipo === 'NEWSLETTER' || config.tipo === 'newsletter') && (
            <>
              <h2 className="text-lg font-bold" style={{ color: popupText }}>{config.titulo || 'Bem-vindo!'}</h2>
              {config.subtitulo && <p className="text-sm opacity-70" style={{ color: popupText }}>{config.subtitulo}</p>}
              <div className="space-y-2">
                <Input value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Seu melhor e-mail" />
                <button
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: btnBg || 'hsl(var(--primary))',
                    color: btnText || 'hsl(var(--primary-foreground))',
                  }}
                  onClick={() => { handleClose(); }}
                >
                  {config.texto_botao || 'Quero participar!'}
                </button>
              </div>
              <button onClick={handleClose} className="text-xs opacity-50 hover:opacity-80" style={{ color: popupText }}>
                Fechar
              </button>
            </>
          )}

          {/* BANNER type */}
          {config.tipo === 'BANNER' && (
            <>
              <h2 className="text-lg font-bold" style={{ color: popupText }}>{config.titulo || 'Bem-vindo!'}</h2>
              {config.subtitulo && <p className="text-sm opacity-70" style={{ color: popupText }}>{config.subtitulo}</p>}
              {config.texto_botao && (
                <button
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: btnBg || 'hsl(var(--primary))',
                    color: btnText || 'hsl(var(--primary-foreground))',
                  }}
                  onClick={handleClose}
                >
                  {config.texto_botao}
                </button>
              )}
              <button onClick={handleClose} className="text-xs opacity-50 hover:opacity-80" style={{ color: popupText }}>
                Fechar
              </button>
            </>
          )}

          {/* Legacy aviso type */}
          {config.tipo === 'aviso' && (
            <>
              <h2 className="text-lg font-bold" style={{ color: popupText }}>{config.titulo || 'Bem-vindo!'}</h2>
              {config.subtitulo && <p className="text-sm opacity-70" style={{ color: popupText }}>{config.subtitulo}</p>}
              {config.texto_botao && (
                <button
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm"
                  style={{ backgroundColor: btnBg || 'hsl(var(--primary))', color: btnText || 'hsl(var(--primary-foreground))' }}
                  onClick={handleClose}
                >
                  {config.texto_botao}
                </button>
              )}
              <button onClick={handleClose} className="text-xs opacity-50 hover:opacity-80" style={{ color: popupText }}>Fechar</button>
            </>
          )}
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

  // 🔗 Capture UTMs on first load (before any navigation loses them)
  useEffect(() => {
    getSavedUtmParams();
  }, []);

  // Init pixels (all 4 platforms)
  useEffect(() => {
    if (!loja?.pixels) return;
    setActivePixels(loja.pixels as LojaPixelConfig[]);
    loja.pixels.forEach((p: any) => {
      if (p.platform === 'facebook') initFBPixel(p.pixel_id);
      else if (p.platform === 'tiktok') initTTPixel(p.pixel_id);
      else if (p.platform === 'google_ads') initGoogleAds(p.pixel_id);
      else if (p.platform === 'gtm') initGTM(p.pixel_id);
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

  // White-label blocking: if store owner is delinquent/blocked, show blank page (NO branding)
  if ((loja as any)?.is_blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground text-lg font-medium text-center px-4">
          Regularize seu plano para continuar a vender.
        </p>
      </div>
    );
  }

  if (isError || !loja || (loja as any)?.offline) {
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
        <LojaFooter footer={footerConfig} nome={displayName} slug={loja.slug} lojaId={loja._id} logo={logoConfig} icone={loja.icone || ''} />

        {/* WhatsApp */}
        <WhatsAppFloat numero={whatsappNumero} />

        {/* Cookie Consent */}
        <CookieConsent ativo={homepageConfig?.cookie_consent?.ativo ?? false} />

        {/* Welcome Popup */}
        <WelcomePopup config={homepageConfig?.popup} lojaId={loja._id} />
      </div>
    </LojaProvider>
  );
}

export { firePixelEvent };
