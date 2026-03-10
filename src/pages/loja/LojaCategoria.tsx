import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, Loader2, Star, X } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { useLojaPublicaCategoria } from '@/hooks/useLojaPublica';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { CategoryFilters } from '@/components/loja/CategoryFilters';
import type { LojaProduct } from '@/services/saas-api';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LojaCategoria = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { lojaId, nomeExibicao, categoriaConfig } = useLoja();

  const [sort, setSort] = useState('relevancia');
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<LojaProduct[]>([]);

  // Filter state (draft)
  const [draftSubcats, setDraftSubcats] = useState<Set<string>>(new Set());
  const [draftVariations, setDraftVariations] = useState<Set<string>>(new Set());
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>([0, 100000]);

  // Applied filters
  const [appliedSubcats, setAppliedSubcats] = useState<Set<string>>(new Set());
  const [appliedVariations, setAppliedVariations] = useState<Set<string>>(new Set());
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>([0, 100000]);

  const activeVariationsParam = useMemo(() => {
    const all = new Set([...appliedVariations, ...quickFilters]);
    return all.size > 0 ? Array.from(all).join(',') : undefined;
  }, [appliedVariations, quickFilters]);

  const subcatIdsParam = useMemo(() => {
    return appliedSubcats.size > 0 ? Array.from(appliedSubcats).join(',') : undefined;
  }, [appliedSubcats]);

  const { data, isLoading, isFetching } = useLojaPublicaCategoria(
    lojaId, categorySlug, sort,
    {
      price_min: appliedPriceRange[0] > 0 ? appliedPriceRange[0] : undefined,
      price_max: appliedPriceRange[1] < 100000 ? appliedPriceRange[1] : undefined,
      variations: activeVariationsParam,
      subcategory_ids: subcatIdsParam,
      page,
    }
  );

  const category = data?.category;
  const subcategories = data?.subcategories || [];
  const banner = category?.banner;
  const totalProducts = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Append/reset products based on page
  useEffect(() => {
    if (data?.products) {
      setAllProducts(prev => page === 1 ? data.products : [...prev, ...data.products]);
    }
  }, [data, page]);

  // Flag to skip filter-reset effect when category changes
  const categoryChangingRef = useRef(false);
  const prevCategoryRef = useRef(categorySlug);

  // Full reset when category changes
  useEffect(() => {
    if (prevCategoryRef.current !== categorySlug) {
      categoryChangingRef.current = true;
      prevCategoryRef.current = categorySlug;
      setAppliedPriceRange([0, 100000]);
      setDraftPriceRange([0, 100000]);
      setAppliedSubcats(new Set());
      setDraftSubcats(new Set());
      setAppliedVariations(new Set());
      setDraftVariations(new Set());
      setQuickFilters(new Set());
      setSort('relevancia');
      setPage(1);
      setAllProducts([]);
    }
  }, [categorySlug]);

  // Reset page when sort or filters change (but NOT when caused by category switch)
  useEffect(() => {
    // Skip if this was triggered by category change
    if (categoryChangingRef.current) {
      categoryChangingRef.current = false;
      return;
    }
  }, [sort, appliedSubcats, appliedVariations, appliedPriceRange, quickFilters]);

  // Set page title
  useEffect(() => {
    if (category) {
      document.title = `${category.nome} · ${nomeExibicao}`;
    }
  }, [category, nomeExibicao]);

  // Extract unique variations
  const allVariations = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allProducts.forEach((p: LojaProduct) => {
      (p.variacoes || []).forEach(v => {
        if (!v.tipo || !v.nome) return;
        if (!map.has(v.tipo)) map.set(v.tipo, new Set());
        map.get(v.tipo)!.add(v.nome);
      });
    });
    return map;
  }, [allProducts]);

  // Price range from loaded products
  const priceRange = useMemo(() => {
    if (!allProducts.length) return [0, 100000] as [number, number];
    const prices = allProducts.map((p: LojaProduct) => p.price);
    return [Math.min(...prices), Math.max(...prices)] as [number, number];
  }, [allProducts]);

  // Sync draft price range with actual product prices on first load
  const priceRangeInitialized = useMemo(() => allProducts.length > 0, [allProducts.length]);
  useEffect(() => {
    if (!priceRangeInitialized) return;
    // Only sync draft (UI display) — do NOT set appliedPriceRange here to avoid reset loop
    setDraftPriceRange(prev => {
      if (prev[0] === 0 && prev[1] === 100000) return [priceRange[0], priceRange[1]];
      return prev;
    });
  }, [priceRangeInitialized, priceRange]);

  const handleApplyFilters = () => {
    setAppliedSubcats(new Set(draftSubcats));
    setAppliedVariations(new Set(draftVariations));
    setAppliedPriceRange([...draftPriceRange] as [number, number]);
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setDraftSubcats(new Set());
    setDraftVariations(new Set());
    setDraftPriceRange([priceRange[0], priceRange[1]]);
  };

  const clearAllFilters = () => {
    setAppliedSubcats(new Set());
    setAppliedVariations(new Set());
    setAppliedPriceRange([0, 100000]);
    setQuickFilters(new Set());
  };

  const toggleQuickFilter = (name: string) => {
    setQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const hasActiveFilters = appliedSubcats.size > 0 || appliedVariations.size > 0 || quickFilters.size > 0 || appliedPriceRange[0] > 0 || appliedPriceRange[1] < 100000;

  // Grid classes based on config
  const config = categoriaConfig || { layout_mobile: '2cols', layout_desktop: '4cols', filtro_rapido: false };
  const desktopCols = config.layout_desktop === '3cols' ? 'lg:grid-cols-3' : config.layout_desktop === '5cols' ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
  const isMisto = config.layout_mobile === 'misto';
  const mobileCols = config.layout_mobile === '1col' ? 'grid-cols-1' : isMisto ? 'grid-cols-2' : 'grid-cols-2';

  // Open filter sheet (mobile) with current applied values as draft
  const openFilterSheet = () => {
    setDraftSubcats(new Set(appliedSubcats));
    setDraftVariations(new Set(appliedVariations));
    setDraftPriceRange([...appliedPriceRange] as [number, number]);
    setFilterOpen(true);
  };

  // Desktop sidebar: auto-apply on change
  const handleDesktopApply = () => {
    setAppliedSubcats(new Set(draftSubcats));
    setAppliedVariations(new Set(draftVariations));
    setAppliedPriceRange([...draftPriceRange] as [number, number]);
  };

  const filterProps = {
    subcategories,
    allVariations,
    priceRange,
    draftSubcats,
    setDraftSubcats,
    draftVariations,
    setDraftVariations,
    draftPriceRange,
    setDraftPriceRange,
    onApply: handleApplyFilters,
    onClear: handleClearFilters,
    formatPrice,
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Categoria não encontrada</h1>
        <Link to="/" className="text-primary hover:underline">Voltar à loja</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 1. Banner */}
      {banner?.imagem && (
        <div className="relative w-full overflow-hidden">
          {banner.link ? (
            <a href={banner.link} className="block">
              <picture>
                {banner.imagem_mobile && <source media="(max-width: 767px)" srcSet={banner.imagem_mobile} />}
                <img src={banner.imagem} alt={banner.titulo || category.nome} className="w-full h-auto object-cover" />
              </picture>
            </a>
          ) : (
            <picture>
              {banner.imagem_mobile && <source media="(max-width: 767px)" srcSet={banner.imagem_mobile} />}
              <img src={banner.imagem} alt={banner.titulo || category.nome} className="w-full h-auto object-cover" />
            </picture>
          )}
          {(banner.titulo || banner.subtitulo) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              {banner.titulo && (
                <h2 className="text-2xl md:text-4xl font-bold" style={{ color: banner.titulo_cor || '#ffffff' }}>
                  {banner.titulo}
                </h2>
              )}
              {banner.subtitulo && (
                <p className="text-sm md:text-lg mt-2" style={{ color: banner.subtitulo_cor || '#ffffff' }}>
                  {banner.subtitulo}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="container py-4 md:py-6 lg:flex lg:gap-8">
        {/* ══ Desktop Sidebar (hidden on mobile) ══ */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Filtros</h2>
            <CategoryFilters {...filterProps} onApply={handleDesktopApply} inline={false} />
          </div>
        </aside>

        {/* ══ Main Content ══ */}
        <div className="flex-1 min-w-0">
          {/* 2. Breadcrumbs */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.nome}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* 3. Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{category.nome}</h1>

          {/* 4. Quick Filter */}
          {config.filtro_rapido && allVariations.size > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              {Array.from(allVariations.entries()).map(([tipo, nomes]) =>
                Array.from(nomes).map(nome => (
                  <Badge
                    key={`${tipo}-${nome}`}
                    variant={quickFilters.has(nome) ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                    onClick={() => toggleQuickFilter(nome)}
                  >
                    {nome}
                  </Badge>
                ))
              )}
            </div>
          )}

          {/* 5. Controls Bar */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              {/* Filter button: mobile only */}
              <Button variant="outline" size="sm" className="gap-2 lg:hidden" onClick={openFilterSheet}>
                <Filter className="h-4 w-4" /> Filtrar
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={clearAllFilters}>
                  <X className="h-3 w-3" /> Limpar
                </Button>
              )}
              <span className="text-sm text-muted-foreground hidden md:inline">
                {allProducts.length} de {totalProducts} produto{totalProducts !== 1 ? 's' : ''}
              </span>
            </div>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancia">Relevância</SelectItem>
                <SelectItem value="vendidos">Mais vendidos</SelectItem>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="desconto">Maior desconto</SelectItem>
                <SelectItem value="menor_preco">Menor preço</SelectItem>
                <SelectItem value="maior_preco">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 6. Product Grid */}
          {allProducts.length === 0 && !isFetching ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Nenhum produto encontrado nesta categoria.</p>
            </div>
          ) : (
            <>
              <div className={`grid ${mobileCols} ${desktopCols} gap-3 md:gap-4`}>
                {allProducts.map((product: LojaProduct, index: number) => {
                  const discount = product.original_price && product.original_price > product.price
                    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                    : 0;

                  const mistoClass = isMisto && (index % 3 === 0) ? 'col-span-2' : '';

                  return (
                    <motion.div
                      key={product.product_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                      className={mistoClass}
                    >
                      <Link to={`/produto/${product.slug}`} className="group block">
                        <div className="relative overflow-hidden rounded-lg bg-card border border-border aspect-square">
                          <img
                            src={product.image || '/placeholder.svg'}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {discount > 0 && (
                            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
                              -{discount}%
                            </span>
                          )}
                          {product.promotion && (
                            <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                              {product.promotion}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 px-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground">{product.rating} ({product.rating_count})</span>
                          </div>
                          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
                            {product.original_price && product.original_price > product.price && (
                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {page < totalPages && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="gap-2"
                  >
                    {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                    Carregar Mais Produtos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Filtrar Produtos</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <CategoryFilters {...filterProps} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LojaCategoria;
