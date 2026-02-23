import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';

export interface BannerItem {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  show_cta: boolean;
  badge_text: string;
}

export interface HomepageReview {
  name: string;
  text: string;
  rating: number;
}

export interface HomepageReviewsConfig {
  overall_rating: string;
  review_count_text: string;
  reviews: HomepageReview[];
}

export interface HomepageCTA {
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  show_cta: boolean;
}

export interface TopBarConfig {
  text: string;
  enabled: boolean;
}

export interface BenefitItem {
  icon: string;
  text: string;
}

export interface BannerArrowsConfig {
  bg_color: string;
  arrow_color: string;
}

export interface HomepageExtrasConfig {
  section_title: string;
  benefits_bar: BenefitItem[];
  footer_badges: BenefitItem[];
  banner_arrows: BannerArrowsConfig;
}

export interface UpsellConfig {
  enabled: boolean;
  discount_percent: number;
  title: string;
  subtitle: string;
  cta_text: string;
  product_slug: string;
}

const defaultBanners: BannerItem[] = [
  { image: '', title: 'QUEIMA DE ESTOQUE 🔥', subtitle: 'Devocionais que transformam vidas', cta: 'Comprar Agora', link: '/#produtos', show_cta: true, badge_text: 'Em Alta' },
  { image: '', title: 'Frete Grátis', subtitle: 'Em todas as compras', cta: 'Ver Ofertas', link: '/#produtos', show_cta: true, badge_text: 'Em Alta' },
];

const defaultReviews: HomepageReviewsConfig = {
  overall_rating: '4.9',
  review_count_text: 'Baseado em 2.500+ avaliações',
  reviews: [
    { name: 'Maria S.', text: 'Mudou completamente minhas manhãs. Me sinto mais próxima de Deus!', rating: 5 },
    { name: 'João P.', text: 'Presente perfeito para minha esposa. Ela amou!', rating: 5 },
    { name: 'Ana L.', text: 'As reflexões são profundas e tocam meu coração todos os dias.', rating: 5 },
  ],
};

const defaultCTA: HomepageCTA = { title: 'Não perca essa oportunidade! 🔥', subtitle: 'Garanta já o seu com desconto exclusivo', cta: 'Comprar Agora', link: '/produto/cafe-com-deus-pai', show_cta: true };

const defaultTopBar: TopBarConfig = { text: 'PROMOÇÃO LIMITADA — Desconto exclusivo por tempo limitado!', enabled: true };

const defaultUpsell: UpsellConfig = { enabled: true, discount_percent: 50, title: '🎁 Oferta Exclusiva!', subtitle: 'Adicione mais um produto com desconto especial!', cta_text: 'Sim, quero adicionar com 50% OFF!', product_slug: '' };

const defaultExtras: HomepageExtrasConfig = {
  section_title: 'Mais Vendidos',
  benefits_bar: [
    { icon: 'Truck', text: 'Entrega Rápida' },
    { icon: 'Shield', text: 'Compra 100% Segura' },
    { icon: 'Zap', text: 'Pagamento Instantâneo' },
  ],
  footer_badges: [
    { icon: 'Shield', text: 'Compra Segura' },
    { icon: 'Truck', text: 'Entrega Rápida' },
    { icon: 'CreditCard', text: 'Pix Instantâneo' },
  ],
  banner_arrows: { bg_color: '#ffffff', arrow_color: '#000000' },
};

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function useHomepageSettings() {
  return useQuery({
    queryKey: ['homepage-settings'],
    queryFn: async () => {
      const keys = ['homepage_banners', 'homepage_reviews', 'homepage_cta', 'homepage_top_bar', 'upsell_config', 'homepage_extras'];
      const data = await settingsApi.getByKeys(keys);

      const map = Object.fromEntries(data.map((s: any) => [s.key, s.value]));

      return {
        banners: parseJson<BannerItem[]>(map['homepage_banners'], defaultBanners),
        reviews: parseJson<HomepageReviewsConfig>(map['homepage_reviews'], defaultReviews),
        cta: parseJson<HomepageCTA>(map['homepage_cta'], defaultCTA),
        topBar: parseJson<TopBarConfig>(map['homepage_top_bar'], defaultTopBar),
        upsell: parseJson<UpsellConfig>(map['upsell_config'], defaultUpsell),
        extras: parseJson<HomepageExtrasConfig>(map['homepage_extras'], defaultExtras),
      };
    },
  });
}
