import { useQuery } from '@tanstack/react-query';
import { lojaPublicaApi, type Loja, type LojaProduct, type RegraFrete, type Cupom, type LojaCategory } from '@/services/saas-api';

export function useLojaByDomain(hostname: string) {
  return useQuery({
    queryKey: ['loja-publica', hostname],
    queryFn: () => lojaPublicaApi.getByDomain(hostname),
    enabled: !!hostname,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useLojaPublicaProducts(lojaId: string | undefined) {
  return useQuery({
    queryKey: ['loja-publica-products', lojaId],
    queryFn: () => lojaPublicaApi.getProducts(lojaId!),
    enabled: !!lojaId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLojaPublicaProduct(lojaId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['loja-publica-product', lojaId, slug],
    queryFn: () => lojaPublicaApi.getProduct(lojaId!, slug!),
    enabled: !!lojaId && !!slug,
  });
}

export function useLojaPublicaFretes(lojaId: string | undefined) {
  return useQuery({
    queryKey: ['loja-publica-fretes', lojaId],
    queryFn: () => lojaPublicaApi.getFretes(lojaId!),
    enabled: !!lojaId,
    staleTime: 5 * 60 * 1000,
  });
}


export function useLojaPublicaCategorias(lojaId: string | undefined) {
  return useQuery({
    queryKey: ['loja-publica-categorias', lojaId],
    queryFn: () => lojaPublicaApi.getCategorias(lojaId!),
    enabled: !!lojaId,
    staleTime: 5 * 60 * 1000,
  });
}
