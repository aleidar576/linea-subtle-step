import { Link } from 'react-router-dom';
import { ShoppingBag, Flame } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';
import LogoTiktok from '@/assets/logo.png'

export const Header = () => {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
        <img src={LogoTiktok} className="w-[150px]" />
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Início
          </Link>
          <Link to="/cart" className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-foreground" />
            </div>
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {totalItems}
              </motion.span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
};