import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Flame, Shield, Truck, ShieldCheck, CreditCard, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useLoja } from '@/contexts/LojaContext';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Truck, CreditCard, Zap, Star, Heart, Lock, Award, CheckCircle, ThumbsUp, Clock, Package, Flame, Shield,
};

const LojaCart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, discountPercent, discountAmount, finalPrice } = useCart();
  const lojaCtx = useLoja();

  // Dynamic title: Carrinho · {nomeLoja} · {slogan}
  useEffect(() => {
    const parts = ['Carrinho', lojaCtx.nomeExibicao];
    if (lojaCtx.slogan) parts.push(lojaCtx.slogan);
    document.title = parts.join(' · ');
  }, [lojaCtx.nomeExibicao, lojaCtx.slogan]);

  // Cart config from loja context
  const cartCfg = lojaCtx.cartConfig;
  const tarjaVermelha = cartCfg?.tarja_vermelha || { ativo: true, icone: 'Flame', texto: 'Complete seu pedido e ganhe FRETE GRÁTIS!' };
  const trustBadges = cartCfg?.trust_badges || [
    { texto: 'Compra Segura', icone: 'ShieldCheck' },
    { texto: 'Frete Grátis', icone: 'Truck' },
  ];
  const notaInferior = cartCfg?.nota_inferior || { texto: '', cor: '#6b7280', tamanho: 'text-xs' };

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

            {/* Trust Badges */}
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

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-fit rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">Resumo do Pedido</h2>
            <div className="mt-4 space-y-2 border-b border-border pb-4">
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
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm"><span className="font-semibold text-primary">Desconto ({discountPercent}%)</span><span className="font-bold text-primary">-{formatPrice(discountAmount)}</span></div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                {discountPercent > 0 && <span className="block text-sm text-muted-foreground line-through">{formatPrice(totalPrice)}</span>}
                <span className="text-2xl font-bold text-primary">{formatPrice(finalPrice)}</span>
              </div>
            </div>
            <Button asChild size="lg" className="mt-5 w-full gap-2 rounded-full font-bold"><Link to="/checkout">Finalizar Compra <ArrowRight className="h-4 w-4" /></Link></Button>
            <Link to="/" className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary">Continuar comprando</Link>

            {/* Nota inferior */}
            {notaInferior.texto && (
              <p className={`mt-3 text-center ${notaInferior.tamanho || 'text-xs'}`} style={{ color: notaInferior.cor || '#6b7280' }}>
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