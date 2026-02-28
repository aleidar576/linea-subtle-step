import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingCart, Star, Truck, Check, Clock, Flame, ChevronLeft, ChevronRight, ShieldCheck, Minus, Plus, Share2, Home, MessageCircle, X, Maximize2, ChevronDown } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { calculateAppmaxInstallments } from '@/utils/installments';
import { useLojaPublicaProduct, useLojaPublicaFretes, useLojaPublicaProducts } from '@/hooks/useLojaPublica';
import { useCart } from '@/contexts/CartContext';
import { firePixelEvent } from '@/components/LojaLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { ImageLightbox } from '@/components/ImageLightbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LojaChatBot from '@/components/LojaChatBot';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getDeliveryRange(minDays: number, maxDays: number) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() + minDays);
  const end = new Date(now); end.setDate(end.getDate() + maxDays);
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${start.getDate()} de ${months[start.getMonth()]} - ${end.getDate()} de ${months[end.getMonth()]}`;
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] || '';
  if (first.length <= 2) return first;
  const masked = first[0] + '**' + first[first.length - 1];
  if (parts.length > 1) return masked + ' ' + parts[parts.length - 1][0] + '.';
  return masked;
}

const NOMES_MASCULINOS = ['Lucas', 'Pedro', 'Gabriel', 'Rafael', 'Matheus', 'Bruno', 'Felipe', 'Gustavo', 'Thiago', 'André', 'João', 'Carlos', 'Daniel', 'Marcelo', 'Rodrigo', 'Leonardo', 'Diego', 'Henrique', 'Vitor', 'Eduardo'];
const NOMES_FEMININOS = ['Ana', 'Maria', 'Juliana', 'Camila', 'Fernanda', 'Beatriz', 'Larissa', 'Amanda', 'Carolina', 'Patrícia', 'Bruna', 'Letícia', 'Gabriela', 'Isabela', 'Natália', 'Mariana', 'Aline', 'Raquel', 'Vanessa', 'Priscila'];

function getRandomName(gender: string): string {
  if (gender === 'feminino') return NOMES_FEMININOS[Math.floor(Math.random() * NOMES_FEMININOS.length)];
  if (gender === 'masculino') return NOMES_MASCULINOS[Math.floor(Math.random() * NOMES_MASCULINOS.length)];
  const all = [...NOMES_MASCULINOS, ...NOMES_FEMININOS];
  return all[Math.floor(Math.random() * all.length)];
}

/* ========= Block Divider ========= */
const BlockDivider = () => <div className="border-b-8 border-muted/40" />;

const LojaProduto = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const { lojaId, nomeExibicao, chatbotEnabled, slogan, gatewayAtivo, installmentConfig } = useLoja();
  const { data: product, isLoading } = useLojaPublicaProduct(lojaId, productSlug);
  const { data: fretes = [] } = useLojaPublicaFretes(lojaId);
  const { data: allProducts = [] } = useLojaPublicaProducts(lojaId);
  const { addToCart, totalItems } = useCart();
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isFavorited, setIsFavorited] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'buy' | 'cart'>('buy');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [evergreenLeft, setEvergreenLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  const [variationError, setVariationError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  // Thumbnail auto-scroll refs
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll thumbnail into view when currentImage changes
  useEffect(() => {
    const thumb = thumbRefs.current[currentImage];
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentImage]);

  // Dynamic title: {productName} · {nomeExibicao} · {slogan}
  useEffect(() => {
    if (product) {
      const parts = [product.name, nomeExibicao];
      if (slogan) parts.push(slogan);
      document.title = parts.join(' · ');
    }
  }, [product, nomeExibicao, slogan]);

  // Social proof toasts (global config)
  const spToast = useLoja().produtoConfig?.social_proof_toast;
  useEffect(() => {
    if (!spToast?.ativo || !product) return;
    const gender = spToast.genero || 'misto';
    const showToast = () => {
      const name = getRandomName(gender);
      toast(`🔥 ${name} acabou de comprar`, {
        duration: 4000,
        position: 'bottom-left',
        style: { marginBottom: '90px' },
      });
    };
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 30000; // 30s a 1min
      return setTimeout(() => { showToast(); timerId = scheduleNext(); }, delay);
    };
    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [product?.product_id, spToast?.ativo, spToast?.genero]);

  // Pessoas vendo agora
  const pessoasVendo = useMemo(() => {
    if (!product?.pessoas_vendo?.ativo) return null;
    const min = product.pessoas_vendo.min || 10;
    const max = product.pessoas_vendo.max || 50;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, [product?.product_id, product?.pessoas_vendo?.ativo]);

  // Favoritos
  useEffect(() => {
    if (!product) return;
    const favs = JSON.parse(localStorage.getItem(`favoritos_${lojaId}`) || '[]');
    setIsFavorited(favs.includes(product.product_id));
  }, [product?.product_id, lojaId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentImage(0); setQuantity(1); setSelectedSize(undefined); setSelectedColor(undefined); setVariationError('');
    if (product) {
      firePixelEvent('ViewContent', { content_id: product.product_id, content_name: product.name, value: product.price / 100, currency: 'BRL' });
      // Auto-select single variations
      const cVars = (product.variacoes || []).filter(v => v.tipo === 'Cor');
      const sVars = (product.variacoes || []).filter(v => v.tipo === 'Tamanho');
      if (cVars.length === 1) setSelectedColor(cVars[0].nome);
      if (sVars.length === 1) setSelectedSize(sVars[0].nome);
      if (!sVars.length && product.sizes?.length === 1) setSelectedSize(product.sizes[0]);
    }
  }, [productSlug, product?.product_id]);

  // Evergreen / global timer logic
  useEffect(() => {
    if (!product?.oferta_relampago?.ativo) { setEvergreenLeft(null); setGlobalTimeLeft(null); return; }
    const oferta = product.oferta_relampago;
    if (oferta.data_termino) {
      const targetMs = new Date(oferta.data_termino).getTime();
      const tick = () => {
        const diff = Math.max(0, targetMs - Date.now());
        const totalSec = Math.floor(diff / 1000);
        setGlobalTimeLeft({ h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 });
      };
      tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
    }
    const evMin = (oferta as any).evergreen_minutos || 0;
    const evSec = (oferta as any).evergreen_segundos || 0;
    const totalEv = evMin * 60 + evSec;
    if (totalEv <= 0) { setEvergreenLeft(null); return; }
    const storageKey = `evergreen_${product.product_id}`;
    let targetMs = Number(localStorage.getItem(storageKey));
    if (!targetMs || targetMs < Date.now()) { targetMs = Date.now() + totalEv * 1000; localStorage.setItem(storageKey, String(targetMs)); }
    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now());
      const totalS = Math.floor(diff / 1000);
      setEvergreenLeft({ h: Math.floor(totalS / 3600), m: Math.floor((totalS % 3600) / 60), s: totalS % 60 });
    };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [product?.product_id, product?.oferta_relampago?.ativo, product?.oferta_relampago?.data_termino]);

  const activeTimer = product?.oferta_relampago?.data_termino ? globalTimeLeft : evergreenLeft;

  // Cross-sell
  const crossSellProducts = useMemo(() => {
    if (!product) return [];
    const mode = product.cross_sell?.modo || 'aleatorio';
    let pool = allProducts.filter(p => p.product_id !== product.product_id && p.is_active);
    if (mode === 'mesma_categoria' && product.category_id) {
      pool = pool.filter(p => p.category_id === product.category_id || (p as any).category_ids?.includes(product.category_id));
    } else if (mode === 'categoria_manual' && product.cross_sell?.categoria_manual_id) {
      const catId = product.cross_sell.categoria_manual_id;
      pool = pool.filter(p => p.category_id === catId || (p as any).category_ids?.includes(catId));
    }
    return pool.sort(() => Math.random() - 0.5).slice(0, 8);
  }, [allProducts, product?.product_id]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return <div className="flex flex-col items-center justify-center py-20 gap-4"><h1 className="text-xl font-bold">Produto não encontrado</h1><Link to="/" className="text-primary">Voltar</Link></div>;

  const toggleFavorite = () => {
    const key = `favoritos_${lojaId}`;
    const favs: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const newFavs = isFavorited ? favs.filter(f => f !== product.product_id) : [...favs, product.product_id];
    localStorage.setItem(key, JSON.stringify(newFavs));
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: product.name, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); toast.success('Link copiado!'); }
  };

  const images = product.images?.length ? product.images : [product.image];
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  const fmt = (n: number) => n.toString().padStart(2, '0');

  const cartProduct = {
    id: product.product_id, name: product.name, slug: product.slug,
    description: product.description, shortDescription: product.short_description,
    price: product.price, originalPrice: product.original_price || undefined,
    image: product.image, images: product.images || [], features: product.features || [],
    promotion: product.promotion || undefined, sizes: product.sizes || undefined,
    colors: product.colors || undefined, reviews: product.reviews || undefined,
    rating: product.rating, ratingCount: product.rating_count,
  };

  const colorVars = (product.variacoes || []).filter(v => v.tipo === 'Cor');
  const sizeVars = (product.variacoes || []).filter(v => v.tipo === 'Tamanho');
  const needsColor = colorVars.length > 0;
  const needsSize = sizeVars.length > 0 || (product.sizes && product.sizes.length > 0);
  const hasVariations = needsColor || needsSize;
  const totalVariationOptions = colorVars.length + sizeVars.length + (product.sizes?.length || 0);

  // Variation validation
  const validateVariations = (): boolean => {
    if (needsColor && !selectedColor) {
      setVariationError('Selecione uma cor');
      toast.error('Selecione uma cor antes de continuar');
      return false;
    }
    if (needsSize && !selectedSize) {
      setVariationError('Selecione um tamanho');
      toast.error('Selecione um tamanho antes de continuar');
      return false;
    }
    setVariationError('');
    return true;
  };

  const handleAddToCart = () => {
    if (!validateVariations()) return;
    for (let i = 0; i < quantity; i++) addToCart(cartProduct as any, selectedSize, selectedColor);
    firePixelEvent('AddToCart', { content_id: product.product_id, content_name: product.name, value: (product.price * quantity) / 100, currency: 'BRL', num_items: quantity });
    toast.success('Adicionado ao carrinho!');
  };

  const handleBuyNow = () => {
    if (!validateVariations()) return;
    for (let i = 0; i < quantity; i++) addToCart(cartProduct as any, selectedSize, selectedColor);
    navigate('/checkout');
  };

  const openDrawer = (mode: 'buy' | 'cart') => { setDrawerMode(mode); setDrawerOpen(true); };
  const handleCartAction = () => { hasVariations ? openDrawer('cart') : handleAddToCart(); };

  // Open lightbox for a single image (variation zoom)
  const openSingleLightbox = (imgUrl: string) => {
    setLightboxImages([imgUrl]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  // Open lightbox for main gallery
  const openGalleryLightbox = (index?: number) => {
    setLightboxImages(images);
    setLightboxIndex(index ?? currentImage);
    setLightboxOpen(true);
  };

  // Frete logic: filter by exibir_no_produto
  const ocultarValorFrete = product.frete_config?.ocultar_frete_produto === true;
  const rawFretes = (() => {
    const vinculados = (product as any).fretes_vinculados;
    if (vinculados?.length) {
      return vinculados.map((v: any) => {
        const global = fretes.find((f: any) => f._id === v.frete_id);
        if (!global || !global.is_active) return null;
        return { ...global, valor: v.valor_personalizado ?? global.valor, exibir_no_produto: v.exibir_no_produto !== false };
      }).filter(Boolean);
    }
    return fretes.filter(f => f.is_active);
  })();
  const displayFretes = rawFretes.filter((f: any) => f.exibir_no_produto !== false);

  const vantagens = product.vantagens;
  const protecao = product.protecao_cliente;
  const vendasDisplay = product.vendas_fake ? product.vendas_fake.toLocaleString('pt-BR') : null;

  const avaliacoes = product.avaliacoes_config?.avaliacoes_manuais || [];
  const avalNota = product.avaliacoes_config?.nota || product.rating || 5;
  const verMaisModo = product.avaliacoes_config?.ver_mais_modo || 'ocultar';
  const qtdAntes = product.avaliacoes_config?.qtd_antes_ver_mais || 3;
  const displayAvaliacoes = verMaisModo === 'ocultar'
    ? avaliacoes.slice(0, qtdAntes)
    : showAllReviews ? avaliacoes : avaliacoes.slice(0, qtdAntes);

  const ofertaAtiva = product.oferta_relampago?.ativo && activeTimer;
  const showEstoqueBar = ofertaAtiva && (product.oferta_relampago?.estoque_campanha || 0) > 0;

  // Desktop variation selectors (with validation highlight)
  const DesktopVariationSelectors = () => (
    <>
      {colorVars.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Cor: <span className={`${selectedColor ? 'text-foreground' : 'text-primary'}`}>{selectedColor || 'Selecione'}</span></p>
          <div className="flex flex-wrap gap-3">
            {colorVars.map(v => {
              // On desktop, clicking a color variation changes the carousel to show that variation's image
              const handleDesktopColorClick = () => {
                setSelectedColor(v.nome);
                setVariationError('');
                if (v.imagem) {
                  const idx = images.indexOf(v.imagem);
                  if (idx >= 0) setCurrentImage(idx);
                }
              };
              return (
                <button key={v._id || v.nome} onClick={handleDesktopColorClick} className={`relative border rounded-lg overflow-hidden w-20 transition ${selectedColor === v.nome ? 'border-primary border-2 ring-2 ring-primary/20' : variationError && !selectedColor ? 'border-destructive' : 'border-border'}`}>
                  <div className="aspect-square bg-secondary overflow-hidden">
                    {v.imagem ? <img src={v.imagem} alt={v.nome} className="h-full w-full object-cover" /> :
                      v.color_hex ? <div className="h-full w-full" style={{ backgroundColor: v.color_hex }} /> :
                      <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">{v.nome}</div>}
                  </div>
                  <p className="text-[10px] text-center py-1 truncate px-1">{v.nome}</p>
                </button>
              );
            })}
          </div>
          {variationError && !selectedColor && <p className="text-xs text-destructive">{variationError}</p>}
        </div>
      )}
      {(product.sizes && product.sizes.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Tamanho: <span className={`${selectedSize ? 'text-foreground' : 'text-primary'}`}>{selectedSize || 'Selecione'}</span></p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(s => (
              <button key={s} onClick={() => { setSelectedSize(s); setVariationError(''); }} className={`rounded-full border px-4 py-2 text-sm transition ${selectedSize === s ? 'border-primary text-primary bg-primary/5 font-semibold' : variationError && !selectedSize ? 'border-destructive text-destructive' : 'border-border'}`}>{s}</button>
            ))}
          </div>
          {variationError && !selectedSize && <p className="text-xs text-destructive">{variationError}</p>}
        </div>
      )}
      {sizeVars.length > 0 && !(product.sizes && product.sizes.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Tamanho: <span className={`${selectedSize ? 'text-foreground' : 'text-primary'}`}>{selectedSize || 'Selecione'}</span></p>
          <div className="flex flex-wrap gap-2">
            {sizeVars.map(v => (
              <button key={v._id || v.nome} onClick={() => { setSelectedSize(v.nome); setVariationError(''); }} className={`rounded-full border px-4 py-2 text-sm transition ${selectedSize === v.nome ? 'border-primary text-primary bg-primary/5 font-semibold' : variationError && !selectedSize ? 'border-destructive text-destructive' : 'border-border'}`}>{v.nome}</button>
            ))}
          </div>
          {variationError && !selectedSize && <p className="text-xs text-destructive">{variationError}</p>}
        </div>
      )}
    </>
  );

  const QuantitySelector = ({ align = 'left' }: { align?: 'left' | 'right' }) => (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'justify-end' : ''}`}>
      <span className="text-sm font-medium">Quantidade</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-3 w-3" /></Button>
        <span className="w-8 text-center font-semibold">{quantity}</span>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setQuantity(quantity + 1)}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ===== MOBILE HEADER ===== */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-background/95 px-3 py-3 backdrop-blur-lg md:hidden">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleFavorite} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Heart className={`h-5 w-5 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
          </button>
          <button onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Share2 className="h-5 w-5" />
          </button>
          <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{totalItems}</span>}
          </Link>
        </div>
      </header>

      {/* ===== DESKTOP 2-COL LAYOUT ===== */}
      <div className="md:container md:py-8">
        <div className="md:grid md:grid-cols-2 md:gap-8">
          {/* === LEFT: Images === */}
          <div className="md:max-w-[500px]">
            <div className="relative md:pt-0">
              <div className="aspect-square bg-secondary md:rounded-xl overflow-hidden">
                <motion.img key={currentImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={images[currentImage]} alt={product.name} className="h-full w-full object-cover" onClick={() => openGalleryLightbox()} />
              </div>
              {currentImage > 0 && <button onClick={() => setCurrentImage(p => p - 1)} className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-md"><ChevronLeft className="h-5 w-5" /></button>}
              {currentImage < images.length - 1 && <button onClick={() => setCurrentImage(p => p + 1)} className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-md"><ChevronRight className="h-5 w-5" /></button>}
              {/* Photo counter pill */}
              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">{currentImage + 1}/{images.length}</div>
            </div>

            {/* Thumbnails — horizontal scroll with snap + auto-scroll */}
            <div className="flex w-full overflow-x-auto snap-x gap-2 px-3 md:px-0 py-3" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  ref={el => { thumbRefs.current[i] = el; }}
                  onClick={() => setCurrentImage(i)}
                  className={`w-14 h-14 flex-shrink-0 snap-start overflow-hidden rounded-md border-2 transition-all ${i === currentImage ? 'border-primary' : 'border-transparent opacity-60'}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* === RIGHT / MOBILE: Product Info in Blocks === */}
          <div className="md:px-0">

            {/* ========== BLOCO 1: Preço + Info Básica ========== */}
            <div className="px-3 md:px-0">
              {/* Desktop: share/fav */}
              <div className="hidden md:flex items-center gap-2 mb-4">
                <button onClick={toggleFavorite} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Heart className={`h-4 w-4 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} /> Favoritar
                </button>
                <button onClick={handleShare} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </button>
              </div>

              {/* Price */}
              <div className="mt-1 md:mt-0">
                <div className="flex items-end gap-2 flex-wrap">
                  <span className="text-3xl font-extrabold text-primary">{formatPrice(product.price)}</span>
                  {product.original_price && (
                    <span className="text-sm text-muted-foreground line-through mb-1">{formatPrice(product.original_price)}</span>
                  )}
                  {discount > 0 && (
                    <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded mb-1">-{discount}%</span>
                  )}
                </div>
                {(() => {
                  // Dynamic installments from Appmax config
                  if (gatewayAtivo === 'appmax' && installmentConfig && installmentConfig.interest_rate_pp > 0) {
                    const options = calculateAppmaxInstallments(product.price, installmentConfig);
                    const maxOpt = options[options.length - 1];
                    if (maxOpt && maxOpt.installment > 1) {
                      return <p className="text-xs text-muted-foreground mt-1">ou {maxOpt.installment}x de {formatPrice(maxOpt.installmentPrice)} {maxOpt.isFree ? 'sem juros' : ''}</p>;
                    }
                    return null;
                  }
                  // Fallback: parcelas_fake
                  const parcelas = product.parcelas_fake ? Number(product.parcelas_fake) : 0;
                  if (parcelas > 0 && product.price > 0) {
                    return <p className="text-xs text-muted-foreground mt-1">ou {parcelas}x de {formatPrice(Math.ceil(product.price / parcelas))} sem juros</p>;
                  }
                  return null;
                })()}
              </div>

              {/* Product Name */}
              <h1 className="text-base md:text-xl font-semibold leading-tight text-foreground mt-2">{product.name}</h1>

              {/* Reviews + Vendas */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                   <span className="text-sm font-bold text-foreground">{Number(product.rating || 5).toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">({product.rating_count || '+100'})</span>
                {vendasDisplay && (
                  <>
                    <span className="text-xs text-muted-foreground">|</span>
                    <span className="text-xs text-muted-foreground">{vendasDisplay} vendidos</span>
                  </>
                )}
              </div>

              {/* Flash Sale */}
              {ofertaAtiva && activeTimer && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary to-primary/80 p-3">
                  <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-primary-foreground" /><span className="text-sm font-bold text-primary-foreground">{product.oferta_relampago?.titulo || 'Oferta Relâmpago'}</span></div>
                  <div className="flex items-center gap-1.5 text-xs text-primary-foreground"><Clock className="h-3.5 w-3.5" />
                    <div className="flex items-center gap-1 font-mono">
                      <span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{fmt(activeTimer.h)}</span>:<span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{fmt(activeTimer.m)}</span>:<span className="rounded bg-background/20 px-1.5 py-0.5 font-bold">{fmt(activeTimer.s)}</span>
                    </div>
                  </div>
                </div>
              )}
              {showEstoqueBar && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(80, Math.random() * 40 + 40)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Restam poucas unidades!</p>
                </div>
              )}

              {/* Promotion tag */}
              {product.promotion && (
                <div className="mt-3 inline-flex items-center bg-primary/10 text-primary text-sm font-semibold px-3 py-1.5 rounded-lg">
                  {product.promotion}
                </div>
              )}

              {/* Pessoas vendo */}
              {pessoasVendo && (
                <p className="mt-2 text-sm text-muted-foreground md:hidden">🔥 <span className="font-semibold text-foreground">{pessoasVendo}</span> pessoas vendo agora</p>
              )}
            </div>

            {/* Divider after BLOCO 1 */}
            <BlockDivider />

            {/* ========== BLOCO 2: Frete ========== */}
            {displayFretes.length > 0 && (
              <>
                <div className="px-3 md:px-0 py-4 space-y-3">
                  {displayFretes.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{(f as any).nome || 'Entrega'}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDeliveryRange((f as any).prazo_dias_min || 3, (f as any).prazo_dias_max || 7)}
                          {!ocultarValorFrete && (
                            <>
                              {' · '}
                              {(f as any).valor === 0 ? 'Grátis' : formatPrice((f as any).valor)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <BlockDivider />
              </>
            )}

            {/* ========== DESKTOP: Variations + Quantity + Buttons (below freight) ========== */}
            <div className="hidden md:block px-4 md:px-0 py-4 space-y-4">
              <DesktopVariationSelectors />
              <QuantitySelector />
              {pessoasVendo && (
                <p className="text-sm text-muted-foreground">🔥 <span className="font-semibold text-foreground">{pessoasVendo}</span> pessoas vendo agora</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 gap-2 rounded-full" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
                </Button>
                <Button className="flex-1 gap-2 rounded-full font-bold" onClick={handleBuyNow}>
                  Comprar Agora
                </Button>
              </div>
            </div>

            {/* ========== BLOCO 3: Variações Resumidas (Mobile) ========== */}
            {hasVariations && totalVariationOptions > 1 && (
              <>
                <button
                  onClick={() => openDrawer('cart')}
                  className="w-full flex items-center justify-between px-3 md:px-0 py-4 md:hidden"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {colorVars.length > 0 && (
                      <div className="flex -space-x-1.5 shrink-0">
                        {colorVars.slice(0, 4).map(v => (
                          <div key={v._id || v.nome} className="h-8 w-8 rounded-full border-2 border-background overflow-hidden shrink-0">
                            {v.imagem ? <img src={v.imagem} alt={v.nome} className="h-full w-full object-cover" /> :
                              v.color_hex ? <div className="h-full w-full" style={{ backgroundColor: v.color_hex }} /> :
                              <div className="h-full w-full bg-muted" />}
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-foreground">{totalVariationOptions} opções</span>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
                <div className="md:hidden"><BlockDivider /></div>
              </>
            )}

            {/* ========== BLOCO 4: Proteção do Cliente ========== */}
            {protecao?.ativo && protecao.itens?.length > 0 && (
              <>
                <div className="px-3 md:px-0 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-primary">Proteção do cliente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {protecao.itens.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{item.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <BlockDivider />
              </>
            )}

            {/* ========== BLOCO 5: Sobre o Produto + Vantagens ========== */}
            <div className="px-3 md:px-0 py-4 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Sobre o produto</h2>
              {product.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
              )}

              {/* Features */}
              {product.features?.length > 0 && (
                <div className="space-y-1.5">
                  {product.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary" /><span>{f}</span></div>
                  ))}
                </div>
              )}

              {/* Vantagens as pills */}
              {vantagens?.ativo && vantagens.itens?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{(product as any).vantagens_titulo || 'Vantagens do Produto'}</h3>
                  <div className="flex flex-wrap gap-2">
                    {vantagens.itens.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2.5">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description image with click-to-zoom */}
              {product.description_image && (
                <button onClick={() => openSingleLightbox(product.description_image!)} className="w-full cursor-zoom-in">
                  <img src={product.description_image} alt="Imagem do produto" className="w-full rounded-xl" />
                </button>
              )}
            </div>
            <BlockDivider />

            {/* ========== BLOCO 6: Avaliações ========== */}
            {avaliacoes.length > 0 && (
              <>
                <div className="px-3 md:px-0 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Avaliações ({avaliacoes.length.toLocaleString('pt-BR')})</h3>
                  </div>
                  <div className="space-y-0">
                    {displayAvaliacoes.map((av, i) => (
                      <div key={i} className="border-b border-border py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(av as any).foto_avaliador ? (
                              <img src={(av as any).foto_avaliador} alt={av.nome} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                {av.nome ? av.nome[0].toUpperCase() : '?'}
                              </div>
                            )}
                            <span className="text-sm font-medium">{maskName(av.nome)}</span>
                          </div>
                          {av.data && <span className="text-xs text-muted-foreground">{av.data}</span>}
                        </div>
                    <div className="flex gap-0.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map(s => {
                            const nota = av.nota || 5;
                            const filled = s <= Math.floor(nota);
                            const half = !filled && s === Math.ceil(nota) && nota % 1 >= 0.3;
                            return <Star key={s} className={`h-3.5 w-3.5 ${filled ? 'fill-primary text-primary' : half ? 'fill-primary/50 text-primary' : 'text-muted-foreground/30'}`} />;
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5">{av.texto}</p>
                        {(av as any).imagens?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {(av as any).imagens.map((img: string, j: number) => (
                              <img key={j} src={img} alt="" className="h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                                setLightboxImages((av as any).imagens);
                                setLightboxIndex(j);
                                setLightboxOpen(true);
                              }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {verMaisModo !== 'ocultar' && (verMaisModo === 'estetico' || avaliacoes.length > qtdAntes) && (
                    <Button
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => {
                        if (verMaisModo === 'funcional') setReviewsDialogOpen(true);
                        // 'estetico' — botão aparece mas não faz nada
                      }}
                    >
                      Ver todas as avaliações
                    </Button>
                  )}
                </div>
                <BlockDivider />
              </>
            )}

            {/* Reviews Dialog (funcional mode) */}
      <Dialog open={reviewsDialogOpen} onOpenChange={(open) => { setReviewsDialogOpen(open); if (!open) setReviewPage(1); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">Todas as Avaliações ({avaliacoes.length})</h3>
          {(() => {
            const REVIEWS_PER_PAGE = 5;
            const totalPages = Math.ceil(avaliacoes.length / REVIEWS_PER_PAGE);
            const pagedReviews = avaliacoes.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);
            return (
              <>
                <div className="space-y-4">
                  {pagedReviews.map((av, i) => (
                    <div key={i} className="border-b border-border pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(av as any).foto_avaliador ? (
                            <img src={(av as any).foto_avaliador} alt={av.nome} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {av.nome ? av.nome[0].toUpperCase() : '?'}
                            </div>
                          )}
                          <span className="text-sm font-medium">{maskName(av.nome)}</span>
                        </div>
                        {av.data && <span className="text-xs text-muted-foreground">{av.data}</span>}
                      </div>
                      <div className="flex gap-0.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map(s => {
                          const nota = av.nota || 5;
                          const filled = s <= Math.floor(nota);
                          const half = !filled && s === Math.ceil(nota) && nota % 1 >= 0.3;
                          return <Star key={s} className={`h-3.5 w-3.5 ${filled ? 'fill-primary text-primary' : half ? 'fill-primary/50 text-primary' : 'text-muted-foreground/30'}`} />;
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5">{av.texto}</p>
                      {(av as any).imagens?.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {(av as any).imagens.map((img: string, j: number) => (
                            <img key={j} src={img} alt="" className="h-24 w-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                              setLightboxImages((av as any).imagens);
                              setLightboxIndex(j);
                              setLightboxOpen(true);
                            }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <button
                      onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                      disabled={reviewPage <= 1}
                      className="text-sm font-medium text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="text-xs text-muted-foreground">Página {reviewPage} de {totalPages}</span>
                    <button
                      onClick={() => setReviewPage(p => Math.min(totalPages, p + 1))}
                      disabled={reviewPage >= totalPages}
                      className="text-sm font-medium text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

            {/* Cross-sell */}
            {crossSellProducts.length > 0 && (
              <div className="px-3 md:px-0 py-4">
                <h3 className="text-base font-semibold text-foreground mb-3">Você também pode gostar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {crossSellProducts.slice(0, 4).map(p => {
                    const csDiscount = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
                    const csBadge = (p as any).badge_imagem || (csDiscount > 0 ? `-${csDiscount}%` : null);
                    return (
                      <Link key={p._id || p.product_id} to={`/produto/${p.slug}`} className="group block overflow-hidden rounded-xl border border-border bg-card">
                        <div className="relative aspect-square bg-secondary overflow-hidden">
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                          {csBadge && (
                            <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">{csBadge}</span>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{p.name}</p>
                          <div className="flex items-end gap-1.5 mt-1">
                            <span className="text-sm font-bold text-primary">{formatPrice(p.price)}</span>
                            {p.original_price && (
                              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.original_price)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spacer for mobile bottom bar - must be last */}
            <div className="h-24 md:hidden" />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />

      {/* ===== MOBILE BOTTOM BAR + DRAWER ===== */}
      <div className="md:hidden">
        {/* Chat Panel */}
        {chatbotEnabled && <LojaChatBot open={chatOpen} onOpenChange={setChatOpen} />}

        <Drawer open={drawerOpen} onOpenChange={(open) => { if (lightboxOpen) return; setDrawerOpen(open); }} shouldScaleBackground={false}>
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between w-full p-2 gap-2 bg-background border-t border-border">
            <Link to="/" className="flex flex-col items-center text-[10px] text-muted-foreground px-2">
              <Home className="h-5 w-5" /><span>Loja</span>
            </Link>
            {chatbotEnabled && (
              <button onClick={() => setChatOpen(!chatOpen)} className="relative flex flex-col items-center text-[10px] text-muted-foreground px-2">
                <MessageCircle className="h-5 w-5" /><span>Chat</span>
                {!chatOpen && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />}
              </button>
            )}
            <button onClick={handleCartAction} className="flex-1 bg-secondary text-foreground font-semibold rounded-full py-3 text-sm text-center">
              Adicionar ao carrinho
            </button>
            <button onClick={() => hasVariations ? openDrawer('buy') : handleBuyNow()} className="flex-1 bg-primary text-primary-foreground font-bold rounded-full py-2 flex flex-col items-center leading-tight">
              <span className="text-sm">Comprar agora</span>
              <span className="text-xs opacity-80">{formatPrice(product.price)}</span>
            </button>
          </div>

          <DrawerContent className="[&>*]:[-webkit-font-smoothing:antialiased] [&>*]:[backface-visibility:hidden]">
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto" style={{ transform: 'translateZ(0)', willChange: 'auto' }}>
              <div className="flex items-start gap-3">
                <img src={images[currentImage] || product.image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-2xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
                    {product.original_price && (
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                    )}
                  </div>
                  {discount > 0 && (
                    <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2 py-0.5 rounded inline-block mt-1">-{discount}%</span>
                  )}
                </div>
                <DrawerClose asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </DrawerClose>
              </div>

              {colorVars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cor: <span className={`${selectedColor ? 'text-foreground' : 'text-primary'}`}>{selectedColor || 'Selecione'}</span></p>
                  <div className="flex w-full overflow-x-auto snap-x gap-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {colorVars.map(v => (
                      <button key={v._id || v.nome} onClick={() => { setSelectedColor(v.nome); setVariationError(''); }} className={`relative border rounded-lg overflow-hidden flex-shrink-0 snap-start w-20 ${selectedColor === v.nome ? 'border-primary border-2' : 'border-border'}`}>
                        <div className="aspect-square bg-secondary overflow-hidden">
                          {v.imagem ? <img src={v.imagem} alt={v.nome} className="h-full w-full object-cover" /> :
                            v.color_hex ? <div className="h-full w-full" style={{ backgroundColor: v.color_hex }} /> :
                            <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">{v.nome}</div>}
                        </div>
                        {v.imagem && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openSingleLightbox(v.imagem!); }}
                            className="absolute top-1 left-1 h-5 w-5 flex items-center justify-center rounded-full bg-background/80 shadow-sm"
                          >
                            <Maximize2 className="h-3 w-3 text-foreground" />
                          </button>
                        )}
                        <p className="text-[10px] text-center py-1 truncate px-1">{v.nome}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(sizeVars.length > 0 || (product.sizes && product.sizes.length > 0)) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tamanho: <span className={`${selectedSize ? 'text-foreground' : 'text-primary'}`}>{selectedSize || 'Selecione'}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {(product.sizes || sizeVars.map(v => v.nome)).map(s => (
                      <button key={s} onClick={() => { setSelectedSize(s); setVariationError(''); }} className={`rounded-full border px-4 py-2 text-sm transition ${selectedSize === s ? 'border-primary text-primary bg-primary/5 font-semibold' : 'border-border'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <QuantitySelector align="right" />

              <div className="flex gap-2 pt-2">
                <button onClick={() => { if (!validateVariations()) return; handleAddToCart(); setDrawerOpen(false); }} className="flex-1 bg-secondary text-foreground font-semibold rounded-full py-3 text-sm text-center">
                  Adicionar ao carrinho
                </button>
                <button onClick={() => { if (!validateVariations()) return; handleBuyNow(); setDrawerOpen(false); }} className="flex-1 bg-primary text-primary-foreground font-bold rounded-full py-2 flex flex-col items-center leading-tight">
                  <span className="text-sm">Comprar agora</span>
                  <span className="text-xs opacity-80">{formatPrice(product.price)}</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default LojaProduto;
