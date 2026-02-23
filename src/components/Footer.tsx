import { Flame, Shield, Truck, CreditCard, Zap, Heart, Package, Clock, BadgeCheck, Gift, ThumbsUp, Award, ShoppingCart, Lock, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { useHomepageSettings } from '@/hooks/useHomepageSettings';
import type { BenefitItem } from '@/hooks/useHomepageSettings';

const iconMap: Record<string, LucideIcon> = {
  Truck, Shield, Zap, CreditCard, Heart, Package, Clock, BadgeCheck, Gift, ThumbsUp, Award, ShoppingCart, Lock, Sparkles, Flame, Star,
};

export const Footer = () => {
  const { data: settings } = useHomepageSettings();
  const footerBadges = settings?.extras?.footer_badges || [
    { icon: 'Shield', text: 'Compra Segura' },
    { icon: 'Truck', text: 'Entrega Rápida' },
    { icon: 'CreditCard', text: 'Pix Instantâneo' },
  ];

  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container">
        {/* Trust badges */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-6 border-b border-border pb-6">
          {footerBadges.map(({ icon, text }: BenefitItem) => {
            const Icon = iconMap[icon] || Zap;
            return (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                <span>{text}</span>
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">
              TikTok Shop
            </span>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Os melhores produtos com os melhores preços. Compre com segurança e receba em casa.
          </p>
          <p className="text-[10px] text-muted-foreground">
            © 2026 TikTok Shop. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
