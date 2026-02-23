import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useMidias, useRemoveMidia } from '@/hooks/useLojaExtras';
import { type MidiaItem } from '@/services/saas-api';
import { Image, Trash2, Copy, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const LojaConteudo = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: midias, isLoading } = useMidias(id);
  const removeMut = useRemoveMidia();

  const [selected, setSelected] = useState<MidiaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MidiaItem | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  const handleDelete = async () => {
    if (!deleteTarget || !id) return;
    try {
      const result = await removeMut.mutateAsync({ lojaId: id, url: deleteTarget.url });
      toast.success(`Imagem removida de ${result.removido_de} produto(s)`);
      setDeleteTarget(null);
      setSelected(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conteúdo — {loja?.nome}</h1>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-3 mb-6 flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">As imagens são adicionadas via cadastro de produtos. Aqui você pode visualizar, copiar URLs e remover imagens não utilizadas.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !midias?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center border-dashed">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhuma mídia encontrada</p>
          <p className="text-sm text-muted-foreground">Adicione imagens nos seus produtos para vê-las aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {midias.map(m => (
            <div
              key={m.url}
              className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelected(m)}
            >
              <div className="aspect-square bg-muted">
                <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">{m.url.split('/').pop()}</p>
                <Badge variant="secondary" className="text-xs mt-1">Usado em {m.usado_em.length} produto(s)</Badge>
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); handleCopy(m.url); }}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
                <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(m); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Detalhes */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg overflow-hidden">
          <DialogHeader><DialogTitle>Detalhes da Mídia</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 overflow-hidden">
              <div className="rounded-lg overflow-hidden bg-muted max-h-80 flex items-center justify-center">
                <img src={selected.url} alt="" className="max-h-80 max-w-full object-contain" />
              </div>
              <div className="overflow-hidden">
                <Label className="text-xs text-muted-foreground">URL</Label>
                <div className="flex items-center gap-2 mt-1 overflow-hidden">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate block overflow-hidden">{selected.url}</code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCopy(selected.url)}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Usado em {selected.usado_em.length} produto(s)</Label>
                <ul className="mt-1 space-y-1">
                  {selected.usado_em.map(p => (
                    <li key={p.product_id} className="text-sm text-foreground">{p.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget(selected); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir Imagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir imagem?</DialogTitle></DialogHeader>
          {deleteTarget && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Esta imagem será removida de <strong>{deleteTarget.usado_em.length}</strong> produto(s). Variações que a utilizam também serão limpas.
              </p>
              <ul className="text-sm space-y-1 max-h-32 overflow-auto">
                {deleteTarget.usado_em.map(p => <li key={p.product_id}>• {p.name}</li>)}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={removeMut.isPending}>
              {removeMut.isPending ? 'Removendo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Missing Label import used inline
const Label = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`text-sm font-medium ${className || ''}`} {...props}>{children}</label>
);

export default LojaConteudo;
