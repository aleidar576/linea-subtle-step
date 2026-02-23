import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '@/services/saas-api';

export function useClientes(lojaId: string | undefined, search?: string) {
  return useQuery({
    queryKey: ['clientes', lojaId, search],
    queryFn: () => clientesApi.list(lojaId!, search),
    enabled: !!lojaId,
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.getById(id!),
    enabled: !!id,
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome?: string; telefone?: string } }) => clientesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}
