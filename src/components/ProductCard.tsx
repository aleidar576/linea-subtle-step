import { motion } from 'framer-motion';
import { Product, formatPrice } from '@/data/products';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Star, Flame } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { UtmLink } from '@/components/UtmLink';

interface ProductCardProps {
  product: Product;
  index: number;
}

export const ProductCard = ({ product, index }: ProductCardProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <UtmLink to={`/produto/${product.slug}`} className="group block">
        <div className="tiktok-card">
          <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Discount Badge - Top Left */}
            {discount > 0 && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground sm:text-xs">
                <Flame className="h-3 w-3" />
                -{discount}%
              </div>
            )}

            {/* Promotion Badge - Bottom Left */}
            {product.promotion && (
              <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-foreground/90 px-2 py-1.5 text-center text-[10px] font-bold text-background backdrop-blur-sm sm:text-xs">
                🎁 {product.promotion}
              </div>
            )}

            {/* Quick Buy Overlay */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-background/95 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
              <Button 
                size="sm" 
                onClick={handleAddToCart}
                className="w-full rounded-full font-semibold"
              >
                <ShoppingBag className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
          
          <div className="p-3">
            {/* Rating */}
            <div className="mb-1 flex items-center gap-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-3 w-3 ${star <= Math.round(product.rating || 5) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">({product.ratingCount || '+100'})</span>
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
              {product.name}
            </h3>
            
            <p className="mt-1 hidden text-xs text-muted-foreground sm:line-clamp-1">
              {product.shortDescription}
            </p>
            
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary sm:text-xl">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Mobile Buy Button */}
            <Button 
              size="sm" 
              onClick={handleAddToCart}
              className="mt-3 w-full rounded-full text-xs font-semibold sm:hidden"
            >
              <ShoppingBag className="mr-1 h-3 w-3" />
              Comprar
            </Button>
          </div>
        </div>
      </UtmLink>
    </motion.div>
  );
};