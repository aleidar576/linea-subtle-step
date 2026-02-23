import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Star, ChevronLeft, ChevronRight, ShieldCheck, Truck, CreditCard, Zap, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, ZoomIn } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { useLojaPublicaProducts } from '@/hooks/useLojaPublica';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/ImageLightbox';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Truck, CreditCard, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, Flame,
};

const LojaHome = () => {
  const { lojaId, nomeExibicao, categoriaHomeId, homepageConfig, slogan } = useLoja();
  const { data: products = [], isLoading } = useLojaPublicaProducts(lojaId);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [currentBanner, setCurrentBanner] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Dynamic title: Início · {nomeExibicao} · {slogan}
  useEffect(() => {
    const parts = ['Início', nomeExibicao];
    if (slogan) parts.push(slogan);
    document.title = parts.join(' · ');
  }, [nomeExibicao, slogan]);

  const hp = homepageConfig || {} as any;
  const banners = hp.banners || [];
  const socialProof = hp.social_proof;
  const tarja = hp.tarja;
  const trustBadges = hp.trust_badges || [];
  const tarjaTopo = hp.tarja_topo;
  const destaques = hp.destaques;

  // Build sections from new array format or fallback to old format
  const secoesRaw: Array<{ titulo: string; categoria_id: string }> = hp.secoes_produtos && Array.isArray(hp.secoes_produtos) && hp.secoes_produtos.length > 0
    ? hp.secoes_produtos
    : [
        { titulo: hp.titulo_secao_produtos || 'Mais Vendidos', categoria_id: categoriaHomeId || 'all' },
        ...(hp.secao_secundaria?.ativo && hp.secao_secundaria?.categoria_id
          ? [{ titulo: hp.secao_secundaria.titulo || 'Novidades', categoria_id: hp.secao_secundaria.categoria_id }]
          : []),
      ];

  const setaFundo = hp.setas_cor_fundo || '#ffffff';
  const setaSeta = hp.setas_cor_seta || '#000000';
  const setaInvisivel = hp.setas_fundo_invisivel || false;

  const touchStart = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null || banners.length <= 1) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setCurrentBanner(c => diff > 0 ? (c + 1) % banners.length : (c - 1 + banners.length) % banners.length);
    }
    touchStart.current = null;
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrentBanner(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  // Build filtered products per section
  const sectionProducts = secoesRaw.map(secao => {
    let items = products;
    if (secao.categoria_id && secao.categoria_id !== 'all') {
      items = items.filter(p => {
        const catIds = (p as any).category_ids;
        return Array.isArray(catIds) ? catIds.includes(secao.categoria_id) : p.category_id === secao.categoria_id;
      });
    }
    if (searchQuery) {
      items = items.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return { ...secao, items };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const spActive = socialProof?.ativo !== false && socialProof?.titulo && socialProof.comentarios?.length > 0;

  const renderProductGrid = (items: any[]) => (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {items.map((product, index) => {
        const discount = product.original_price
          ? Math.round((1 - product.price / product.original_price) * 100)
          : 0;
        return (
          <motion.div key={product._id || product.product_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Link to={`/produto/${product.slug}`} className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
              <div className="relative aspect-square overflow-hidden bg-secondary">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                {((product as any).badge_imagem || discount > 0) && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
                    {(product as any).badge_imagem || `-${discount}%`}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm">{product.name}</h3>
                <div className="mt-1 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-[10px] text-muted-foreground">{Number(product.rating || 5).toFixed(1)} ({product.rating_count || '+100'})</span>
                </div>
                <div className="mt-1.5 flex items-end gap-1.5 flex-wrap">
                  <span className="text-base font-bold text-primary sm:text-lg">{formatPrice(product.price)}</span>
                  {product.original_price && (
                    <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                  )}
                </div>
                {product.promotion && (
                  <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block">{product.promotion}</span>
                )}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Tarja Topo */}
      {tarjaTopo?.ativo && tarjaTopo?.texto && (
        <div className="w-full py-2.5" style={{ backgroundColor: tarjaTopo.cor_fundo || 'hsl(var(--primary))' }}>
          <div className="container flex items-center justify-center gap-3 text-center">
            {tarjaTopo.icone_ativo && tarjaTopo.icone && (() => {
              const Icon = ICON_MAP[tarjaTopo.icone];
              return Icon ? <Icon className="h-5 w-5 shrink-0" style={{ color: tarjaTopo.cor_texto || '#ffffff' }} /> : null;
            })()}
            <span
              className={`text-sm text-center ${tarjaTopo.negrito ? 'font-bold' : 'font-medium'}`}
              style={{ color: tarjaTopo.cor_texto || '#ffffff', fontFamily: tarjaTopo.fonte || 'inherit' }}
            >
              {tarjaTopo.texto}
            </span>
            {tarjaTopo.icone_ativo && tarjaTopo.icone && (() => {
              const Icon = ICON_MAP[tarjaTopo.icone];
              return Icon ? <Icon className="h-5 w-5 shrink-0" style={{ color: tarjaTopo.cor_texto || '#ffffff' }} /> : null;
            })()}
          </div>
        </div>
      )}

      {/* Banner Carrossel */}
      {banners.length > 0 && (
        <section
          className="relative w-full overflow-hidden bg-muted"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={(() => {
            const hd = hp.banner_altura_desktop || 'medio';
            const hm = hp.banner_altura_mobile || 'medio';
            const desktopMap: Record<string, string> = { pequeno: 'sm:aspect-[3/1]', medio: 'sm:aspect-[2.5/1]', grande: 'sm:aspect-[2/1]' };
            const mobileMap: Record<string, string> = { pequeno: 'aspect-[16/9]', medio: 'aspect-square', grande: 'aspect-[3/4]' };
            return `relative ${mobileMap[hm] || 'aspect-square'} ${desktopMap[hd] || 'sm:aspect-[2.5/1]'}`;
          })()}>
            {banners.map((banner: any, i: number) => {
              const imgMain = banner.imagem || '';
              const hasMobileSpecific = banner.imagem_mobile_ativo && banner.imagem_mobile;
              const imgDesktop = imgMain;
              const imgMobile = hasMobileSpecific ? banner.imagem_mobile : imgMain;
              const BadgeIcon = banner.badge_icone ? ICON_MAP[banner.badge_icone] : null;
              const badgeBgOpacity = (banner.badge_transparencia ?? 100) / 100;

              return (
                <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${i === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {imgDesktop && <img src={imgDesktop} alt={banner.titulo || ''} className="hidden sm:block h-full w-full object-cover" style={banner.blur_ativo ? { filter: `blur(${(banner.blur_intensidade || 30) * 0.2}px)`, transform: 'scale(1.05)' } : undefined} />}
                  {imgMobile && <img src={imgMobile} alt={banner.titulo || ''} className="sm:hidden h-full w-full object-cover" style={banner.blur_ativo ? { filter: `blur(${(banner.blur_intensidade || 30) * 0.2}px)`, transform: 'scale(1.05)' } : undefined} />}

                  {(banner.titulo || banner.subtitulo || banner.badge_texto) && (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <div className="container mx-auto h-full flex items-center">
                        <div className="max-w-[55%] sm:max-w-[45%] ml-[5%] sm:ml-[6%]">
                          {banner.badge_texto && (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-2"
                              style={{
                                color: banner.badge_cor_texto || '#ffffff',
                                backgroundColor: banner.badge_cor_fundo || '#ff6666',
                                opacity: badgeBgOpacity,
                              }}
                            >
                              {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                              {banner.badge_texto}
                            </span>
                          )}
                          {banner.titulo && (
                            <h2 className={`font-bold mb-1 leading-tight ${banner.titulo_tamanho || 'text-2xl'}`} style={{ color: banner.titulo_cor || '#000' }}>
                              {banner.titulo}
                            </h2>
                          )}
                          {banner.subtitulo && (
                            <p className={`leading-snug ${banner.subtitulo_tamanho || 'text-sm'}`} style={{ color: banner.subtitulo_cor || '#666' }}>
                              {banner.subtitulo}
                            </p>
                          )}
                          {banner.botao_ativo && banner.botao_texto && (
                            <Link to={banner.botao_link || '/'} className="pointer-events-auto inline-block">
                              <Button className="mt-3" style={{ backgroundColor: banner.botao_cor_fundo || '#000', color: banner.botao_cor_texto || '#fff' }}>
                                {banner.botao_texto}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {banners.length > 1 && (
            <>
              <button onClick={() => setCurrentBanner(c => (c - 1 + banners.length) % banners.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 z-20" style={{ backgroundColor: setaInvisivel ? 'transparent' : setaFundo }}>
                <ChevronLeft className="h-5 w-5" style={{ color: setaSeta }} />
              </button>
              <button onClick={() => setCurrentBanner(c => (c + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 z-20" style={{ backgroundColor: setaInvisivel ? 'transparent' : setaFundo }}>
                <ChevronRight className="h-5 w-5" style={{ color: setaSeta }} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {banners.map((_: any, i: number) => (
                  <button key={i} onClick={() => setCurrentBanner(i)} className={`h-2 w-2 rounded-full transition-colors ${i === currentBanner ? 'bg-primary' : 'bg-primary/30'}`} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Destaques Bar */}
      {destaques?.ativo && destaques.itens?.length > 0 && (
        <section className="py-4 border-b border-border/50" style={{ backgroundColor: destaques.cor_fundo || '#f5f5f5' }}>
          <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {destaques.itens.map((item: any, i: number) => {
              const Icon = ICON_MAP[item.icone] || CheckCircle;
              return (
                <div key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: destaques.cor_texto || '#555555' }}>
                  <Icon className="h-4 w-4" />
                  <span>{item.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Product Sections */}
      {sectionProducts.map((secao, sIdx) => (
        <section key={sIdx} className={`py-8 lg:py-12 ${sIdx > 0 ? 'border-t border-border/50' : ''}`}>
          <div className="container">
            <div className="mb-6 flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                {searchQuery && sIdx === 0 ? `Resultados para "${searchQuery}"` : (secao.titulo || 'Produtos')}
              </h2>
            </div>
            {secao.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {searchQuery ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível no momento.'}
              </p>
            ) : renderProductGrid(secao.items)}
          </div>
        </section>
      ))}

      {/* Social Proof */}
      {spActive && (
        <section className="py-8 bg-muted/30">
          <div className="container">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-foreground">{socialProof.titulo}</h2>
              <div className="flex items-center justify-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => {
                  const filled = s <= Math.floor(socialProof.nota_media);
                  const half = !filled && s - 0.5 <= socialProof.nota_media;
                  return (
                    <Star key={s} className={`h-4 w-4 ${filled || half ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  );
                })}
                <span className="text-sm font-semibold text-foreground ml-1">{Number(socialProof.nota_media).toFixed(1)}</span>
              </div>
              {socialProof.subtexto && <p className="text-xs text-muted-foreground mt-1">{socialProof.subtexto}</p>}
            </div>

            {socialProof.imagem_url && (
              <div className="mb-6 flex justify-center">
                <div className="relative group cursor-pointer max-w-md" onClick={() => setLightboxOpen(true)}>
                  <img src={socialProof.imagem_url} alt="Avaliações" className="rounded-xl border border-border w-full object-cover max-h-64" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {socialProof.comentarios.map((c: any, i: number) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {c.foto && c.foto_url ? (
                      <img src={c.foto_url} alt={c.nome} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {c.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => {
                          const filled = s <= Math.floor(c.nota);
                          const half = !filled && s - 0.5 <= c.nota;
                          return (
                            <Star key={s} className={`h-3 w-3 ${filled || half ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                          );
                        })}
                        <span className="text-[10px] text-muted-foreground ml-1">{Number(c.nota).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      {trustBadges.length > 0 && (
        <section className="py-6 border-t border-border">
          <div className="container flex flex-wrap items-center justify-center gap-6">
            {trustBadges.map((badge: any, i: number) => {
              const Icon = ICON_MAP[badge.icone] || ShieldCheck;
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{badge.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tarja CTA */}
      {tarja?.titulo && (
        <section className="py-8 text-white" style={{ backgroundColor: tarja.cor_fundo || 'hsl(var(--primary))' }}>
          <div className="container text-center space-y-3">
            <h2 className="text-xl font-bold">{tarja.titulo}</h2>
            {tarja.subtitulo && <p className="text-sm opacity-90">{tarja.subtitulo}</p>}
            {tarja.botao_ativo && tarja.botao_texto && (
              <Link to={tarja.botao_link || '/'}>
                <Button variant="secondary" className="mt-2">{tarja.botao_texto}</Button>
              </Link>
            )}
          </div>
        </section>
      )}

      {socialProof?.imagem_url && (
        <ImageLightbox open={lightboxOpen} onClose={() => setLightboxOpen(false)} images={[socialProof.imagem_url]} initialIndex={0} />
      )}
    </>
  );
};

export default LojaHome;
