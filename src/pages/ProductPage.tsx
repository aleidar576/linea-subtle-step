import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield, Check, MessageCircle, Users, Clock, Flame, Store, ChevronLeft, ChevronRight, X, Minus, Plus, Maximize2, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/data/products';
import type { Product } from '@/data/products';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useTracking } from '@/hooks/useTracking';
import { toast } from 'sonner';
import { UtmLink } from '@/components/UtmLink';
import { useUtmParams } from '@/hooks/useUtmParams';
import { ChatWidget } from '@/components/ChatWidget';
import { ImageLightbox } from '@/components/ImageLightbox';

// Helper: calculate delivery date range
function getDeliveryDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 3);
  const end = new Date(now);
  end.setDate(end.getDate() + 5);
  
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} de ${endMonth}`;
  }
  return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}`;
}

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading: productLoading } = useProduct(slug || '');
  const { data: allProducts = [] } = useProducts();
  const { addToCart, totalItems } = useCart();
  const { trackViewContent, trackAddToCart } = useTracking();
  const topRef = useRef<HTMLDivElement>(null);
  
  const { navigateWithUtm } = useUtmParams();
  const [currentImage, setCurrentImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 34, seconds: 15 });
  const [quantity, setQuantity] = useState(1);
  const [colorPage, setColorPage] = useState(0);
  
  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAction, setSheetAction] = useState<'cart' | 'buy' | 'browse'>('browse');
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Número aleatório fixo
  const reviewCount = useMemo(() => Math.floor(Math.random() * 1000) + 1000, []);

  const otherProducts = allProducts.filter(p => p.slug !== slug);

  const deliveryText = useMemo(() => getDeliveryDateRange(), []);

  // Swipe state for main carousel
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll thumbnails
  useEffect(() => {
    const el = thumbRefs.current[currentImage];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentImage]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset selections on product change + ViewContent tracking
  useEffect(() => {
    setSelectedSize(undefined);
    setSelectedColor(undefined);
    setQuantity(1);
    setCurrentImage(0);
    if (product) {
      trackViewContent({
        content_id: product.id,
        content_name: product.name,
        value: product.price / 100,
        currency: 'BRL',
      });
    }
  }, [slug, product?.id]);

  if (productLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-bold">Produto não encontrado</h1>
          <UtmLink to="/" className="mt-4 inline-block text-primary">Voltar</UtmLink>
        </div>
      </div>
    );
  }

  // Always show main product images (don't change with color)
  const productImages = product.images;

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 50;

  const hasVariants = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
  const totalOptions = (product.colors?.length || 0);

  const openSheet = (action: 'cart' | 'buy' | 'browse') => {
    setSheetAction(action);
    setSheetOpen(true);
  };

  const handleSheetConfirm = () => {
    if (product.sizes && !selectedSize) {
      toast.error('Selecione um tamanho!');
      return;
    }
    if (product.colors && !selectedColor) {
      toast.error('Selecione uma cor!');
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedSize, selectedColor);
    }
    trackAddToCart({
      content_id: product.id,
      content_name: product.name,
      value: (product.price * quantity) / 100,
      currency: 'BRL',
      num_items: quantity,
    });
    setSheetOpen(false);
    if (sheetAction === 'buy') {
      navigateWithUtm('/checkout');
    } else {
      toast.success('Adicionado ao carrinho!');
    }
  };

  const handleAddToCart = () => {
    if (hasVariants) {
      openSheet('cart');
    } else {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      trackAddToCart({
        content_id: product.id,
        content_name: product.name,
        value: (product.price * quantity) / 100,
        currency: 'BRL',
        num_items: quantity,
      });
      toast.success('Adicionado ao carrinho!');
    }
  };

  const handleBuyNow = () => {
    if (hasVariants) {
      openSheet('buy');
    } else {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      navigateWithUtm('/checkout');
    }
  };

  const soldCount = 2547;

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  // Main carousel swipe handlers
  const handleMainTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleMainTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleMainTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImage < productImages.length - 1) {
        setCurrentImage(prev => prev + 1);
      } else if (diff < 0 && currentImage > 0) {
        setCurrentImage(prev => prev - 1);
      }
    }
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24" ref={topRef}>
      {/* Top Navigation - Fixed */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-lg">
        <UtmLink 
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </UtmLink>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLiked(!liked)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-primary text-primary' : ''}`} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Share2 className="h-5 w-5" />
          </button>
          <UtmLink to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </UtmLink>
        </div>
      </header>

      {/* Main Image with Swipe + Arrows */}
      <div className="relative pt-14">
        <div 
          className="aspect-square bg-secondary"
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
        >
          <motion.img
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={productImages[currentImage]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Arrow Buttons */}
        {currentImage > 0 && (
          <button
            onClick={() => setCurrentImage(prev => prev - 1)}
            className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-md backdrop-blur-sm transition-colors hover:bg-background/90"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        {currentImage < productImages.length - 1 && (
          <button
            onClick={() => setCurrentImage(prev => prev + 1)}
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-md backdrop-blur-sm transition-colors hover:bg-background/90"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-medium text-background">
          {currentImage + 1}/{productImages.length}
        </div>

        {/* Discount Badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-primary px-2 py-1">
          <Flame className="h-3.5 w-3.5 text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground">-{discount}%</span>
        </div>
      </div>

      {/* Thumbnail Scroll */}
      <div 
        ref={thumbContainerRef}
        className="flex gap-2 overflow-x-auto px-4 py-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {productImages.map((img, i) => (
          <button
            key={i}
            ref={el => { thumbRefs.current[i] = el; }}
            onClick={() => setCurrentImage(i)}
            className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
              i === currentImage ? 'border-primary' : 'border-transparent opacity-60'
            }`}
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {/* Product Info */}
      <div className="px-4">
        {/* Price Section */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-extrabold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="mb-1 text-sm text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          <span className="mb-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
            -{discount}%
          </span>
        </div>

        {/* Installments */}
        <p className="mt-1 text-xs text-muted-foreground">
          ou 3x de {formatPrice(Math.round(product.price / 3))} sem juros
        </p>

        {/* Title */}
        <h1 className="mt-3 text-base font-semibold leading-tight text-foreground">
          {product.name}
        </h1>

        {/* Stats Row: stars + reviews + vendidos */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-semibold text-foreground">{product.rating || '5.0'}</span>
          </div>
          <span className="text-primary">({product.ratingCount || reviewCount.toLocaleString()})</span>
          <span className="text-border">|</span>
          <span>{soldCount.toLocaleString()} vendidos</span>
        </div>

        {/* Flash Sale Banner */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary to-primary/80 p-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-bold text-primary-foreground">Oferta Relâmpago</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground">
            <Clock className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1 font-mono">
              <span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{formatTime(timeLeft.hours)}</span>
              <span>:</span>
              <span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{formatTime(timeLeft.minutes)}</span>
              <span>:</span>
              <span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{formatTime(timeLeft.seconds)}</span>
            </div>
          </div>
        </div>

        {/* Promotion Badge */}
        {product.promotion && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
            <span className="text-lg">🎁</span>
            <span className="text-sm font-bold text-primary">{product.promotion}</span>
          </div>
        )}

        {/* Divider */}
        <div className="-mx-4 my-4 h-2 bg-secondary" />

        {/* Delivery Info */}
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Receba até <span className="font-medium">{deliveryText}</span>
            </p>
            <p className="text-xs text-muted-foreground">Frete Grátis</p>
          </div>
        </div>

        {/* Divider */}
        <div className="-mx-4 my-4 h-[1px] bg-border" />

        {/* Variants Row - clickable to open sheet */}
        {hasVariants && (
          <>
            <button
              onClick={() => openSheet('browse')}
              className="flex w-full items-center gap-2 overflow-hidden py-1"
            >
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {product.colors?.slice(0, 5).map((color, i) => (
                  <div key={i} className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                    <img src={color.images[0]} alt={color.name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              {totalOptions > 0 && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {totalOptions} opções
                </span>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
            <div className="-mx-4 my-4 h-[1px] bg-border" />
          </>
        )}

        {/* Proteção do Cliente */}
        <div className="py-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Proteção do cliente</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Devolução gratuita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Reembolso por danos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Reembolso por atraso</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="-mx-4 my-4 h-2 bg-secondary" />

        {/* Description Section */}
        <div>
          <h3 className="font-semibold text-foreground">Sobre o produto</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          {product.descriptionImage && (
            <div className="mt-3 overflow-hidden rounded-xl">
              <img 
                src={product.descriptionImage} 
                alt="Detalhe do produto" 
                className="w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {product.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary p-2.5">
              <Check className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-xs font-medium text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="-mx-4 my-4 h-2 bg-secondary" />

        {/* Reviews Section */}
        <div>
          <button className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-foreground" />
              <h3 className="font-semibold text-foreground">Avaliações ({reviewCount.toLocaleString()})</h3>
            </div>
          </button>

          <div className="mt-3 space-y-3">
            {(product.reviews || [
              { name: 'Maria S.', avatarEmoji: '👩', text: 'Esse livro mudou minhas manhãs! Super recomendo.', rating: 5, date: 'há 2 horas' },
              { name: 'João P.', avatarEmoji: '👨', text: 'Entrega rápida e produto de qualidade. Amei!', rating: 5, date: 'há 1 dia' },
              { name: 'Matheus O.', avatarEmoji: '👨', text: 'Chegou no dia seguinte, obrigado pela atenção no suporte', rating: 5, date: 'há 1 dia' },
              { name: 'Joana C.', avatarEmoji: '👩', text: 'Gostei muito do produto, obrigada, chegou muito rapido', rating: 5, date: 'há 1 dia' },
              { name: 'Pastora D.', avatarEmoji: '👩', text: 'Graças a Deus, conseguimos abençoar os jovens da igreja com essas promoções', rating: 5, date: 'há 2 dias' },
              { name: 'Marcos M.', avatarEmoji: '👨', text: 'Amei a qualidade, logo vou comprar mais', rating: 5, date: 'há 2 dias' },
            ]).map((review, i) => {
              const reviewPhotos: string[] = [];
              if (review.productImages && review.productImages.length > 0) {
                reviewPhotos.push(...review.productImages);
              } else if (review.productImage) {
                reviewPhotos.push(review.productImage);
              }

              return (
                <div key={i} className="rounded-xl bg-secondary p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {review.avatar ? (
                        <img src={review.avatar} alt={review.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-lg">
                          {review.avatarEmoji || '👤'}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">{review.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{review.date}</span>
                  </div>
                  <div className="mt-1.5 flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, s) => (
                      <Star key={s} className="h-3 w-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{review.text}</p>
                  
                  {reviewPhotos.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {reviewPhotos.slice(0, 3).map((photo, pi) => (
                        <button
                          key={pi}
                          onClick={() => openLightbox(reviewPhotos, pi)}
                          className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border transition-transform active:scale-95"
                        >
                          <img 
                            src={photo} 
                            alt="Foto do produto" 
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            Ver todas as avaliações
          </button>
        </div>

        {/* Divider */}
        <div className="-mx-4 my-4 h-2 bg-secondary" />

        {/* Live Viewers */}
        <div className="flex items-center gap-2 rounded-xl bg-secondary p-3">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </div>
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">78 pessoas</span> vendo agora
          </span>
        </div>

        {/* Similar Products */}
        {otherProducts.length > 0 && (
          <>
            <div className="-mx-4 my-4 h-2 bg-secondary" />
            <div>
              <h3 className="font-semibold text-foreground">Você também pode gostar</h3>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {otherProducts.map(p => (
                  <UtmLink
                    key={p.id}
                    to={`/produto/${p.slug}`}
                    className="w-32 flex-shrink-0"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-2">
                      <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{p.name}</p>
                      <p className="mt-1 text-sm font-bold text-primary">{formatPrice(p.price)}</p>
                    </div>
                  </UtmLink>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-3">
          <UtmLink to="/" className="flex shrink-0 flex-col items-center justify-center">
            <Store className="h-6 w-6 text-foreground" />
            <span className="mt-0.5 text-[11px] text-muted-foreground">Loja</span>
          </UtmLink>
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="relative flex shrink-0 flex-col items-center justify-center"
          >
            <MessageCircle className="h-6 w-6 text-foreground" />
            <span className="mt-0.5 text-[11px] text-muted-foreground">Chat</span>
            {!chatOpen && (
              <span className="absolute -right-1 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                1
              </span>
            )}
          </button>

          <Button
            variant="secondary"
            className="h-14 min-w-0 flex-1 flex-col rounded-full border-0 px-3 text-sm font-bold leading-tight shadow-none"
            onClick={handleAddToCart}
          >
            <span>Adicionar</span>
            <span>ao carrinho</span>
          </Button>
          <Button
            className="h-14 min-w-0 flex-1 flex-col rounded-full px-3 text-sm font-bold shadow-none"
            onClick={handleBuyNow}
          >
            <span>Comprar agora</span>
            <span className="text-xs font-medium text-primary-foreground/90">
              {formatPrice(product.price)}
            </span>
          </Button>
        </div>
      </div>

      {/* ══════ Variant Selection Bottom Sheet ══════ */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60"
              onClick={() => setSheetOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] flex-col rounded-t-2xl bg-background"
            >
              {/* Sheet Header */}
              <div className="flex items-start gap-3 border-b border-border p-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                  <img 
                    src={selectedColor 
                      ? (product.colors?.find(c => c.name === selectedColor)?.images[0] || product.image)
                      : product.image
                    } 
                    alt="" 
                    className="h-full w-full object-cover" 
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {discount > 0 && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                        -{discount}%
                      </span>
                    )}
                    <span className="text-xl font-extrabold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSheetOpen(false)} 
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-0 py-4">
                {/* Color Selection - Horizontal swipe */}
                {product.colors && product.colors.length > 0 && (() => {
                  const COLS = 3;
                  const ROWS = 2;
                  const PER_PAGE = COLS * ROWS;
                  const totalPages = Math.ceil(product.colors.length / PER_PAGE);
                  
                  return (
                    <div>
                      <h4 className="px-4 text-sm font-semibold text-foreground">
                        Cor ({product.colors.length})
                      </h4>
                      {/* Horizontal scroll container - fluid, 2 rows */}
                      <div 
                        ref={(el) => {
                          if (el) {
                            const handleScroll = () => {
                              const maxScroll = el.scrollWidth - el.clientWidth;
                              const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
                              setColorPage(progress * 100);
                            };
                            el.onscroll = handleScroll;
                          }
                        }}
                        className="mt-3 grid auto-cols-[30%] grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {product.colors!.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setSelectedColor(color.name)}
                            className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                              selectedColor === color.name
                                ? 'border-primary'
                                : 'border-border'
                            }`}
                          >
                            <div className="relative aspect-square">
                              <img 
                                src={color.images[0]} 
                                alt={color.name} 
                                className="h-full w-full object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLightbox(color.images, 0);
                                }}
                                className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/50 backdrop-blur-sm"
                              >
                                <Maximize2 className="h-3 w-3 text-background" />
                              </button>
                              {selectedColor === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="px-1 py-1.5 text-center">
                              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">{color.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {/* Scroll progress bar */}
                      {product.colors!.length > 3 && (
                        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-foreground transition-all duration-150"
                            style={{
                              width: '30%',
                              marginLeft: `${colorPage * 0.7}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Size Selection */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className={`px-4 ${product.colors ? 'mt-5' : ''}`}>
                    <h4 className="text-sm font-semibold text-foreground">Tamanho</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`flex h-10 min-w-[3.5rem] items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-all ${
                            selectedSize === size
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-foreground hover:border-primary/50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className={`px-4 ${(product.colors || product.sizes) ? 'mt-5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Quantidade</h4>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-foreground">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => q + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheet Footer */}
              <div className="border-t border-border px-4 py-3 safe-area-pb">
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="h-12 flex-1 rounded-full text-sm font-bold"
                    onClick={() => {
                      setSheetAction('cart');
                      handleSheetConfirm();
                    }}
                  >
                    Adicionar ao carrinho
                  </Button>
                  <Button
                    className="h-12 flex-1 rounded-full text-sm font-bold"
                    onClick={() => {
                      setSheetAction('buy');
                      handleSheetConfirm();
                    }}
                  >
                    Comprar agora
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default ProductPage;
