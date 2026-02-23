import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lojaProductsApi, type LojaProduct } from '@/services/saas-api';

export function useLojaProducts(lojaId: string | undefined) {
  return useQuery<LojaProduct[]>({
    queryKey: ['loja-products', lojaId],
    queryFn: () => lojaProductsApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useLojaProduct(id: string | undefined) {
  return useQuery<LojaProduct>({
    queryKey: ['loja-product', id],
    queryFn: () => lojaProductsApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LojaProduct>) => lojaProductsApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['loja-products', vars.loja_id] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LojaProduct> }) => lojaProductsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-products'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lojaProductsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-products'] });
    },
  });
}

export function useToggleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => lojaProductsApi.toggleActive(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-products'] });
    },
  });
}
