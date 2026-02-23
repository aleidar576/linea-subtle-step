import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Truck, Shield, Zap, Star, Flame, TrendingUp, CreditCard, Heart, Package, Clock, BadgeCheck, Gift, ThumbsUp, Award, ShoppingCart, Lock, Sparkles, type LucideIcon } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { formatPrice } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { UtmLink } from "@/components/UtmLink";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import type { BenefitItem } from "@/hooks/useHomepageSettings";
import bannerHero from "@/assets/banner-one.webp";
import bannerPromo from "@/assets/banner-two.webp";

const fallbackImages = [bannerHero, bannerPromo];

const iconMap: Record<string, LucideIcon> = {
  Truck, Shield, Zap, CreditCard, Heart, Package, Clock, BadgeCheck, Gift, ThumbsUp, Award, ShoppingCart, Lock, Sparkles, Flame, Star,
};

const Index = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const { data: products = [] } = useProducts();
  const { data: settings } = useHomepageSettings();

  const banners = settings?.banners || [];
  const reviewsConfig = settings?.reviews;
  const ctaConfig = settings?.cta;
  const topBar = settings?.topBar;
  const extras = settings?.extras;

  const benefitsBar = extras?.benefits_bar || [
    { icon: 'Truck', text: 'Entrega Rápida' },
    { icon: 'Shield', text: 'Compra 100% Segura' },
    { icon: 'Zap', text: 'Pagamento Instantâneo' },
  ];
  const sectionTitle = extras?.section_title || 'Mais Vendidos';
  const arrowBg = extras?.banner_arrows?.bg_color || '#ffffff';
  const arrowColor = extras?.banner_arrows?.arrow_color || '#000000';

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => banners.length > 0 && setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => banners.length > 0 && setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

  const currentBannerData = banners[currentBanner];

  return (
    <Layout>
      {/* Live Badge Bar */}
      {topBar?.enabled !== false && (
        <div className="bg-primary py-2">
          <div className="container flex items-center justify-center gap-2 text-center">
            <Flame className="h-4 w-4 animate-pulse text-primary-foreground" />
            <p className="text-xs font-bold uppercase tracking-wide text-primary-foreground sm:text-sm">
              {topBar?.text || 'PROMOÇÃO LIMITADA — Desconto exclusivo por tempo limitado!'}
            </p>
            <Flame className="h-4 w-4 animate-pulse text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Banner Carousel */}
      {banners.length > 0 && (
        <section className="relative overflow-hidden bg-secondary">
          <div className="relative h-[260px] sm:h-[320px] lg:h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <img
                  src={currentBannerData?.image || fallbackImages[currentBanner % fallbackImages.length]}
                  alt={currentBannerData?.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="container">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="max-w-md"
                    >
                      {currentBannerData?.badge_text && (
                        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <TrendingUp className="h-3 w-3" />
                          {currentBannerData.badge_text}
                        </span>
                      )}
                      <h2 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                        {currentBannerData?.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">{currentBannerData?.subtitle}</p>
                      {currentBannerData?.show_cta !== false && (
                        <Button asChild size="lg" className="mt-4 rounded-full font-bold">
                          <UtmLink to={currentBannerData?.link || '/#produtos'}>{currentBannerData?.cta || 'Comprar Agora'}</UtmLink>
                        </Button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
              <>
                <button
                  onClick={prevBanner}
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:opacity-80"
                  style={{ color: arrowColor }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextBanner}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:opacity-80"
                  style={{ color: arrowColor }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBanner(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentBanner ? "w-6 bg-primary" : "w-2 bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Benefits Bar */}
      <section className="border-b border-border bg-card py-3">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 text-center sm:justify-between sm:gap-6">
            {benefitsBar.map(({ icon, text }: BenefitItem) => {
              const Icon = iconMap[icon] || Zap;
              return (
                <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-8 lg:py-12">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-6 flex items-center gap-2"
          >
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground sm:text-xl">{sectionTitle}</h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviewsConfig && (
        <section className="border-t border-border bg-secondary/50 py-8 lg:py-12">
          <div className="container">
            <div className="mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <h3 className="text-lg font-bold text-foreground">Avaliações dos Clientes</h3>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="text-4xl font-bold text-foreground">{reviewsConfig.overall_rating}</div>
              <div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{reviewsConfig.review_count_text}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {reviewsConfig.reviews.map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, s) => (
                      <Star key={s} className="h-3 w-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">"{review.text}"</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{review.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {ctaConfig && (
        <section className="bg-primary py-10">
          <div className="container text-center">
            <h3 className="text-xl font-bold text-primary-foreground sm:text-2xl">{ctaConfig.title}</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">{ctaConfig.subtitle}</p>
            {ctaConfig.show_cta !== false && (
              <Button asChild size="lg" variant="secondary" className="mt-5 rounded-full font-bold">
                <UtmLink to={ctaConfig.link}>{ctaConfig.cta}</UtmLink>
              </Button>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Index;
