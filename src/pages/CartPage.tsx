import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Flame, Shield, Truck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';
import { UtmLink } from '@/components/UtmLink';

const CartPage = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, discountPercent, discountAmount, finalPrice } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-foreground">
            Seu carrinho está vazio
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adicione produtos para continuar
          </p>
          <Button asChild className="mt-6 rounded-full">
            <UtmLink to="/">Ver Produtos</UtmLink>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Urgency Banner */}
      <div className="bg-primary py-2">
        <div className="container flex items-center justify-center gap-2">
          <Flame className="h-4 w-4 animate-pulse text-primary-foreground" />
          <p className="text-xs font-bold text-primary-foreground">
            Complete seu pedido e ganhe FRETE GRÁTIS!
          </p>
        </div>
      </div>

      <div className="container py-6 lg:py-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold text-foreground sm:text-2xl"
        >
          Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
        </motion.h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4"
                >
                  <UtmLink to={`/produto/${item.product.slug}`}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-20 w-16 rounded-xl object-cover sm:h-24 sm:w-20"
                    />
                  </UtmLink>
                  <div className="flex flex-1 flex-col">
                    <UtmLink 
                      to={`/produto/${item.product.slug}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {item.product.name}
                    </UtmLink>
                    {(item.selectedColor || item.selectedSize) && (
                      <span className="text-xs text-muted-foreground">
                        {item.selectedColor && `Cor: ${item.selectedColor}`}
                        {item.selectedColor && item.selectedSize && ' · '}
                        {item.selectedSize && `Tam: ${item.selectedSize}`}
                      </span>
                    )}
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatPrice(item.product.price)} cada
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-secondary p-4 text-xs text-muted-foreground sm:justify-start">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                <span>Compra Segura</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                <span>Frete Grátis</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-fit rounded-2xl border border-border bg-card p-5"
          >
            <h2 className="text-lg font-bold text-foreground">
              Resumo do Pedido
            </h2>
            <div className="mt-4 space-y-2 border-b border-border pb-4">
              {items.map(item => (
                <div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-medium text-primary">Grátis</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-primary">Desconto ({discountPercent}%)</span>
                  <span className="font-bold text-primary">-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>
            {discountPercent > 0 && (
              <div className="mt-3 rounded-xl bg-primary/10 p-3 text-center">
                <span className="text-xs font-bold text-primary">🎉 Você ganhou {discountPercent}% de desconto!</span>
              </div>
            )}
            {discountPercent === 0 && totalPrice > 0 && (
              <div className="mt-3 rounded-xl bg-secondary p-3 text-center">
                <span className="text-xs text-muted-foreground">
                  💡 Compre acima de R$ 100 e ganhe <span className="font-bold text-primary">20% OFF</span>!
                </span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                {discountPercent > 0 && (
                  <span className="block text-sm text-muted-foreground line-through">{formatPrice(totalPrice)}</span>
                )}
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(finalPrice)}
                </span>
              </div>
            </div>
            <Button asChild size="lg" className="mt-5 w-full gap-2 rounded-full font-bold">
              <UtmLink to="/checkout">
                Finalizar Compra
                <ArrowRight className="h-4 w-4" />
              </UtmLink>
            </Button>
            <UtmLink 
              to="/" 
              className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary"
            >
              Continuar comprando
            </UtmLink>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;