import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lojaCategoriesApi, type LojaCategory, type CategoriesResponse } from '@/services/saas-api';

export function useLojaCategories(lojaId: string | undefined) {
  return useQuery<CategoriesResponse>({
    queryKey: ['loja-categories', lojaId],
    queryFn: () => lojaCategoriesApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nome: string; loja_id: string; parent_id?: string }) => lojaCategoriesApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['loja-categories', vars.loja_id] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome?: string; slug?: string; ordem?: number } }) => lojaCategoriesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-categories'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lojaCategoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-categories'] });
    },
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; ordem: number }>) => lojaCategoriesApi.reorder(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loja-categories'] });
    },
  });
}
