import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Flame, Shield, Truck, ShieldCheck, CreditCard, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, Ticket, ChevronDown, Tag, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useLoja } from '@/contexts/LojaContext';
import { cuponsApi } from '@/services/saas-api';
import { toast } from 'sonner';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Truck, CreditCard, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, Flame, Shield,
};

interface AppliedCoupon {
  tipo: string;
  valor: number;
  codigo: string;
}

const LojaCart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, discountPercent, discountAmount, finalPrice } = useCart();
  const lojaCtx = useLoja();

  useEffect(() => {
    const parts = ['Carrinho', lojaCtx.nomeExibicao];
    if (lojaCtx.slogan) parts.push(lojaCtx.slogan);
    document.title = parts.join(' · ');
  }, [lojaCtx.nomeExibicao, lojaCtx.slogan]);

  const cartCfg = lojaCtx.cartConfig;
  const tarjaVermelha = cartCfg?.tarja_vermelha || { ativo: true, icone: 'Flame', texto: 'Complete seu pedido e ganhe FRETE GRÁTIS!' };
  const trustBadges = cartCfg?.trust_badges || [
    { texto: 'Compra Segura', icone: 'ShieldCheck' },
    { texto: 'Frete Grátis', icone: 'Truck' },
  ];
  const notaInferior = cartCfg?.nota_inferior || { texto: '', cor: '#6b7280', tamanho: 'text-xs' };

  // Coupon state
  const [cupomCode, setCupomCode] = useState('');
  const [cuponsApplied, setCuponsApplied] = useState<AppliedCoupon[]>([]);
  const [cupomSectionOpen, setCupomSectionOpen] = useState(false);
  const [cupomLoading, setCupomLoading] = useState(false);

  // Auto-load redeemed popup coupons
  useEffect(() => {
    if (!lojaCtx.lojaId) return;
    const redeemed: AppliedCoupon[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cupom_resgatado_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          if (data?.codigo) redeemed.push({ tipo: data.tipo || 'percentual', valor: data.valor || 0, codigo: data.codigo });
        } catch {}
      }
    }
    if (redeemed.length > 0) {
      setCuponsApplied(redeemed);
      setCupomSectionOpen(true);
    }
  }, [lojaCtx.lojaId]);

  const applyCupom = async () => {
    const code = cupomCode.trim().toUpperCase();
    if (!code || !lojaCtx.lojaId) return;
    if (cuponsApplied.some(c => c.codigo === code)) { toast.error('Cupom já aplicado'); return; }
    setCupomLoading(true);
    try {
      const r = await cuponsApi.validar(lojaCtx.lojaId, code);
      setCuponsApplied(prev => [...prev, { tipo: r.tipo, valor: r.valor, codigo: r.codigo }]);
      setCupomCode('');
      toast.success(`Cupom ${r.codigo} aplicado!`);
    } catch (e: any) { toast.error(e.message || 'Cupom inválido'); }
    finally { setCupomLoading(false); }
  };

  const removeCupom = (codigo: string) => {
    setCuponsApplied(prev => prev.filter(c => c.codigo !== codigo));
    localStorage.removeItem(`cupom_resgatado_${codigo}`);
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Adicione produtos para continuar</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Ver Produtos</Link></Button>
      </div>
    );
  }

  return (
    <>
      {tarjaVermelha.ativo && tarjaVermelha.texto && (
        <div className="bg-primary py-2">
          <div className="container flex items-center justify-center gap-2">
            {(() => {
              const TarjaIcon = ICON_MAP[tarjaVermelha.icone] || Flame;
              return <TarjaIcon className="h-4 w-4 animate-pulse text-primary-foreground" />;
            })()}
            <p className="text-xs font-bold text-primary-foreground">{tarjaVermelha.texto}</p>
          </div>
        </div>
      )}

      <div className="container py-6 lg:py-10">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item, index) => (
              <motion.div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4">
                <Link to={`/produto/${item.product.slug}`}><img src={item.product.image} alt={item.product.name} className="h-20 w-16 rounded-xl object-cover sm:h-24 sm:w-20" /></Link>
                <div className="flex flex-1 flex-col">
                  <Link to={`/produto/${item.product.slug}`} className="font-semibold text-foreground hover:text-primary">{item.product.name}</Link>
                  {(item.selectedColor || item.selectedSize) && (
                    <span className="text-xs text-muted-foreground">{item.selectedColor && `Cor: ${item.selectedColor}`}{item.selectedColor && item.selectedSize && ' · '}{item.selectedSize && `Tam: ${item.selectedSize}`}</span>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{formatPrice(item.product.price)} cada</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="text-right"><span className="text-lg font-bold text-primary">{formatPrice(item.product.price * item.quantity)}</span></div>
              </motion.div>
            ))}

            {trustBadges.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-secondary p-4 text-xs text-muted-foreground sm:justify-start">
                {trustBadges.map((badge: any, i: number) => {
                  const BadgeIcon = ICON_MAP[badge.icone] || ShieldCheck;
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <BadgeIcon className="h-4 w-4 text-primary" />
                      <span>{badge.texto}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-fit rounded-2xl border border-border bg-card p-5 space-y-4">
            {/* Coupon section */}
            <div className="border border-border/60 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setCupomSectionOpen(prev => !prev)}
                className="w-full flex items-center justify-start gap-2 py-3 px-4 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <span>Possui um cupom de desconto?</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${cupomSectionOpen ? 'rotate-180' : ''}`} />
              </button>

              {cupomSectionOpen && (
                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/50">
                  <div className="flex flex-row gap-2">
                    <Input
                      placeholder="Código do cupom"
                      value={cupomCode}
                      onChange={e => setCupomCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && applyCupom()}
                      className="flex-1 bg-white text-black border-input focus-visible:ring-primary"
                    />
                    <Button
                      onClick={applyCupom}
                      disabled={cupomLoading || !cupomCode.trim()}
                      className="shrink-0 px-4 text-xs font-bold"
                    >
                      {cupomLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'APLICAR'}
                    </Button>
                  </div>

                  {cuponsApplied.length > 0 && (
                    <div className="space-y-0">
                      {cuponsApplied.map((c, i) => (
                        <div key={c.codigo} className={`flex items-center justify-between py-2 ${i < cuponsApplied.length - 1 ? 'border-b border-border/50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">{c.codigo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-green-600">
                              {c.tipo === 'frete_gratis' ? 'Frete grátis' : c.tipo === 'percentual' ? `-${c.valor}%` : `-${formatPrice(c.valor)}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCupom(c.codigo)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <h2 className="text-lg font-bold text-foreground">Resumo do Pedido</h2>
            <div className="space-y-2 border-b border-border pb-4">
              {items.map(item => (
                <div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-xs text-muted-foreground italic">Calculado na finalização</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <Button asChild size="lg" className="w-full gap-2 rounded-full font-bold"><Link to="/checkout">Finalizar Compra <ArrowRight className="h-4 w-4" /></Link></Button>
            <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-primary">Continuar comprando</Link>

            {notaInferior.texto && (
              <p className={`text-center ${notaInferior.tamanho || 'text-xs'}`} style={{ color: notaInferior.cor || '#6b7280' }}>
                {notaInferior.texto}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LojaCart;
