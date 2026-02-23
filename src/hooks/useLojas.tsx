import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lojasApi, type Loja } from '@/services/saas-api';

export function useLojas() {
  return useQuery<Loja[]>({
    queryKey: ['lojas'],
    queryFn: lojasApi.list,
  });
}

export function useLoja(id: string | undefined) {
  return useQuery<Loja>({
    queryKey: ['loja', id],
    queryFn: () => lojasApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateLoja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nome: string }) => lojasApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lojas'] }),
  });
}

export function useUpdateLoja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Loja> }) => lojasApi.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lojas'] });
      qc.invalidateQueries({ queryKey: ['loja', vars.id] });
      qc.invalidateQueries({ queryKey: ['tema-config', vars.id] });
    },
  });
}
