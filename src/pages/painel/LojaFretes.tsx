import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useFretes, useCreateFrete, useUpdateFrete, useDeleteFrete } from '@/hooks/useLojaExtras';
import { type RegraFrete } from '@/services/saas-api';
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';

const emptyFrete: Partial<RegraFrete> = {
  nome: '', tipo: 'entregue_ate', prazo_dias_min: 1, prazo_dias_max: 7,
  valor: 0, is_active: true,
};

const LojaFretes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: fretes, isLoading, isError } = useFretes(id);
  const createMut = useCreateFrete();
  const updateMut = useUpdateFrete();
  const deleteMut = useDeleteFrete();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RegraFrete>>(emptyFrete);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openNew = () => { setEditId(null); setForm({ ...emptyFrete }); setOpen(true); };
  const openEdit = (f: RegraFrete) => { setEditId(f._id); setForm(f); setOpen(true); };

  const handleSave = async () => {
    if ((form.prazo_dias_min ?? 0) > (form.prazo_dias_max ?? 0)) {
      toast.error('Prazo Mínimo não pode ser maior que Prazo Máximo');
      return;
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: form });
        toast.success('Regra de frete atualizada');
      } else {
        await createMut.mutateAsync({ ...form, loja_id: id! } as any);
        toast.success('Regra de frete criada');
      }
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm);
      toast.success('Regra excluída');
      setDeleteConfirm(null);
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const formatValor = (v: number) => v === 0 ? 'Grátis' : `R$ ${(v / 100).toFixed(2).replace('.', ',')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fretes — {loja?.nome}</h1>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Nova Regra de Frete</Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Para vincular uma regra de frete a um produto, edite o produto na aba Frete.
      </p>

      {isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-12 text-center">
          <p className="font-medium text-destructive mb-1">Erro ao carregar fretes</p>
          <p className="text-sm text-muted-foreground mb-4">Tente atualizar a página ou refazer o login.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Atualizar Página</Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !fretes?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhuma regra de frete cadastrada</p>
          <p className="text-sm text-muted-foreground mb-4">Crie regras globais de frete para vincular aos seus produtos.</p>
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Nova Regra de Frete</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fretes.map(f => (
                <TableRow key={f._id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.tipo === 'entregue_ate' ? 'Entregue até' : 'Receba até'}</TableCell>
                  <TableCell>{f.prazo_dias_min}–{f.prazo_dias_max} dias úteis</TableCell>
                  <TableCell>{formatValor(f.valor)}</TableCell>
                  <TableCell><Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(f._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Frete' : 'Nova Regra de Frete'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Frete Padrão" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entregue_ate">Será entregue até</SelectItem>
                  <SelectItem value="receba_ate">Receba até</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prazo mín. (dias)</Label>
                <Input type="number" min={0} value={form.prazo_dias_min ?? 1} onChange={e => setForm({ ...form, prazo_dias_min: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Prazo máx. (dias)</Label>
                <Input type="number" min={0} value={form.prazo_dias_max ?? 7} onChange={e => setForm({ ...form, prazo_dias_max: Number(e.target.value) })} />
              </div>
            </div>
            {(form.prazo_dias_min ?? 0) > (form.prazo_dias_max ?? 0) && (
              <p className="text-xs text-destructive">⚠ Prazo Mínimo não pode ser maior que Prazo Máximo</p>
            )}
            <div>
              <Label>Valor do frete (0 = grátis)</Label>
              <CurrencyInput value={form.valor ?? 0} onChange={v => setForm({ ...form, valor: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editId && <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(editId)}>Excluir</Button>}
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir regra de frete?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Produtos vinculados a esta regra terão o frete removido.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaFretes;
