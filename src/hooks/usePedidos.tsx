import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, carrinhosApi } from '@/services/saas-api';

export function usePedidos(lojaId: string | undefined, filters?: { status?: string; search?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['pedidos', lojaId, filters],
    queryFn: () => pedidosApi.list(lojaId!, filters),
    enabled: !!lojaId,
  });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidosApi.getById(id!),
    enabled: !!id,
  });
}

export function useCarrinhosAbandonados(lojaId: string | undefined) {
  return useQuery({
    queryKey: ['carrinhos', lojaId],
    queryFn: () => carrinhosApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useAddRastreio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, codigo }: { id: string; codigo: string }) => pedidosApi.addRastreio(id, codigo),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useAddObservacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) => pedidosApi.addObservacao(id, texto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
    },
  });
}

export function useAlterarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => pedidosApi.alterarStatus(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useGerarEtiqueta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pedidoId, overrideServiceId }: { pedidoId: string; overrideServiceId?: string | number }) =>
      pedidosApi.gerarEtiqueta(pedidoId, overrideServiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedido'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useCancelarEtiqueta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pedidoId }: { pedidoId: string }) => pedidosApi.cancelarEtiqueta(pedidoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedido'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useUpdatePedidoDados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { cliente?: Record<string, string>; endereco?: Record<string, string>; atualizar_cadastro?: boolean } }) =>
      pedidosApi.updateDados(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pedido', vars.id] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
