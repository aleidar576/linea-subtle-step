import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/services/api';
import type { Product } from '@/data/products';
import type { APIProduct } from '@/services/api';

function mapAPIProduct(db: APIProduct): Product {
  return {
    id: db.product_id,
    name: db.name,
    slug: db.slug,
    shortDescription: db.short_description,
    description: db.description,
    descriptionImage: db.description_image || undefined,
    price: db.price,
    originalPrice: db.original_price || undefined,
    image: db.image,
    images: db.images || [],
    features: db.features || [],
    promotion: db.promotion || undefined,
    sizes: db.sizes || undefined,
    colors: db.colors as any || undefined,
    reviews: db.reviews as any || undefined,
    socialProofGender: (db.social_proof_gender as 'male' | 'female' | 'unisex') || undefined,
    rating: db.rating ?? 5.0,
    ratingCount: db.rating_count || '+100',
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const data = await productsApi.list();
      return data.map(mapAPIProduct);
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async (): Promise<Product | null> => {
      const data = await productsApi.getBySlug(slug);
      if (!data) return null;
      return mapAPIProduct(data);
    },
    enabled: !!slug,
  });
}
