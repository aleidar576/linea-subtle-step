import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fretesApi, cuponsApi, midiasApi, temasApi, pixelsApi, paginasApi,
  type RegraFrete, type Cupom, type MidiaItem, type TemaConfig,
  type TrackingPixelData, type PaginaData,
} from '@/services/saas-api';

// === FRETES ===

export function useFretes(lojaId: string | undefined) {
  return useQuery<RegraFrete[]>({
    queryKey: ['fretes', lojaId],
    queryFn: () => fretesApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useCreateFrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RegraFrete> & { loja_id: string }) => fretesApi.create(data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['fretes', vars.loja_id] }); },
  });
}

export function useUpdateFrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegraFrete> }) => fretesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fretes'] }); },
  });
}

export function useDeleteFrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fretesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fretes'] }); },
  });
}

// === CUPONS ===

export function useCupons(lojaId: string | undefined) {
  return useQuery<Cupom[]>({
    queryKey: ['cupons', lojaId],
    queryFn: () => cuponsApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useCreateCupom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cupom> & { loja_id: string }) => cuponsApi.create(data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['cupons', vars.loja_id] }); },
  });
}

export function useUpdateCupom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cupom> }) => cuponsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cupons'] }); },
  });
}

export function useDeleteCupom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cuponsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cupons'] }); },
  });
}

export function useToggleCupom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cuponsApi.toggle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cupons'] }); },
  });
}

// === MÍDIAS ===

export function useMidias(lojaId: string | undefined) {
  return useQuery<MidiaItem[]>({
    queryKey: ['midias', lojaId],
    queryFn: () => midiasApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useRemoveMidia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lojaId, url }: { lojaId: string; url: string }) => midiasApi.remove(lojaId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['midias'] });
      qc.invalidateQueries({ queryKey: ['loja-products'] });
    },
  });
}

// === TEMAS ===

export function useTemaConfig(lojaId: string | undefined) {
  return useQuery<TemaConfig>({
    queryKey: ['tema-config', lojaId],
    queryFn: () => temasApi.get(lojaId!),
    enabled: !!lojaId,
  });
}

export function useUpdateTema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lojaId, data }: { lojaId: string; data: Partial<TemaConfig> }) => temasApi.update(lojaId, data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['tema-config', vars.lojaId] }); },
  });
}

// === PIXELS ===

export function usePixels(lojaId: string | undefined) {
  return useQuery<TrackingPixelData[]>({
    queryKey: ['pixels', lojaId],
    queryFn: () => pixelsApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useCreatePixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TrackingPixelData> & { loja_id: string }) => pixelsApi.create(data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['pixels', vars.loja_id] }); },
  });
}

export function useUpdatePixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrackingPixelData> }) => pixelsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pixels'] }); },
  });
}

export function useDeletePixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pixelsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pixels'] }); },
  });
}

// === PÁGINAS ===

export function usePaginas(lojaId: string | undefined) {
  return useQuery<PaginaData[]>({
    queryKey: ['paginas', lojaId],
    queryFn: () => paginasApi.list(lojaId!),
    enabled: !!lojaId,
  });
}

export function useCreatePagina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { loja_id: string; titulo: string; conteudo?: string }) => paginasApi.create(data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['paginas', vars.loja_id] }); },
  });
}

export function useUpdatePagina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { titulo?: string; conteudo?: string; is_active?: boolean } }) => paginasApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['paginas'] }); },
  });
}

export function useDeletePagina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paginasApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['paginas'] }); },
  });
}
