import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Sparkles, X } from 'lucide-react';

interface PlanoForm {
  nome: string;
  preco_original: number;
  preco_promocional: number;
  taxa_transacao: number;
  taxa_transacao_percentual: number;
  taxa_transacao_trial: number;
  taxa_transacao_fixa: number;
  stripe_price_id: string;
  vantagens: string[];
  destaque: boolean;
  ordem: number;
}

const emptyForm: PlanoForm = {
  nome: '', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.5,
  taxa_transacao_percentual: 1.5, taxa_transacao_trial: 2.0, taxa_transacao_fixa: 0,
  stripe_price_id: '', vantagens: [], destaque: false, ordem: 0,
};

const AdminPlanos = () => {
  const { data: planos, isLoading } = useQuery({ queryKey: ['admin-planos'], queryFn: adminsApi.listPlanos });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (p: any) => {
    setForm({
      nome: p.nome, preco_original: p.preco_original, preco_promocional: p.preco_promocional,
      taxa_transacao: p.taxa_transacao, taxa_transacao_percentual: p.taxa_transacao_percentual ?? p.taxa_transacao ?? 1.5,
      taxa_transacao_trial: p.taxa_transacao_trial ?? 2.0, taxa_transacao_fixa: p.taxa_transacao_fixa ?? 0,
      stripe_price_id: p.stripe_price_id, vantagens: p.vantagens || [], destaque: p.destaque, ordem: p.ordem,
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.stripe_price_id) {
      toast({ title: 'Erro', description: 'Nome e Stripe Price ID são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await adminsApi.updatePlano(editId, form);
        toast({ title: 'Plano atualizado!' });
      } else {
        await adminsApi.createPlano(form);
        toast({ title: 'Plano criado!' });
      }
      qc.invalidateQueries({ queryKey: ['admin-planos'] });
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      await adminsApi.deletePlano(id);
      qc.invalidateQueries({ queryKey: ['admin-planos'] });
      toast({ title: 'Plano excluído' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await adminsApi.seedPlanos();
      qc.invalidateQueries({ queryKey: ['admin-planos'] });
      toast({ title: 'Seed concluído!', description: `${res.results.length} planos processados.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSeeding(false); }
  };

  const addVantagem = () => setForm(f => ({ ...f, vantagens: [...f.vantagens, ''] }));
  const removeVantagem = (i: number) => setForm(f => ({ ...f, vantagens: f.vantagens.filter((_, idx) => idx !== i) }));
  const updateVantagem = (i: number, v: string) => setForm(f => ({ ...f, vantagens: f.vantagens.map((item, idx) => idx === i ? v : item) }));

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestão de Planos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Seed Inicial
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Plano</Button>
        </div>
      </div>

      {!planos || planos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhum plano cadastrado. Use o botão "Seed Inicial" para criar os planos padrão.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço Original</TableHead>
                <TableHead>Preço Promocional</TableHead>
                <TableHead>Taxa %</TableHead>
                <TableHead>Taxa Trial %</TableHead>
                <TableHead>Taxa Fixa</TableHead>
                <TableHead>Stripe Price ID</TableHead>
                <TableHead>Destaque</TableHead>
                <TableHead>Vantagens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos.map((p: any) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>R$ {(p.preco_original || 0).toFixed(2)}</TableCell>
                  <TableCell>R$ {(p.preco_promocional || 0).toFixed(2)}</TableCell>
                  <TableCell>{p.taxa_transacao_percentual ?? p.taxa_transacao}%</TableCell>
                  <TableCell>{p.taxa_transacao_trial ?? 2.0}%</TableCell>
                  <TableCell>R$ {(p.taxa_transacao_fixa || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[160px] truncate">{p.stripe_price_id}</TableCell>
                  <TableCell>{p.destaque ? '⭐' : '-'}</TableCell>
                  <TableCell>{(p.vantagens || []).length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Starter" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço Original (R$)</Label>
                <Input type="number" step="0.01" value={form.preco_original} onChange={e => setForm(f => ({ ...f, preco_original: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Preço Promocional (R$)</Label>
                <Input type="number" step="0.01" value={form.preco_promocional} onChange={e => setForm(f => ({ ...f, preco_promocional: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Taxa Percentual (%)</Label>
                <Input type="number" step="0.1" value={form.taxa_transacao_percentual} onChange={e => setForm(f => ({ ...f, taxa_transacao_percentual: Number(e.target.value), taxa_transacao: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Taxa Trial (%)</Label>
                <Input type="number" step="0.1" value={form.taxa_transacao_trial} onChange={e => setForm(f => ({ ...f, taxa_transacao_trial: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Taxa Fixa (R$)</Label>
                <Input type="number" step="0.01" value={form.taxa_transacao_fixa} onChange={e => setForm(f => ({ ...f, taxa_transacao_fixa: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Stripe Price ID</Label>
              <Input value={form.stripe_price_id} onChange={e => setForm(f => ({ ...f, stripe_price_id: e.target.value }))} placeholder="price_..." className="font-mono text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Destaque (Recomendado)</Label>
              <Switch checked={form.destaque} onCheckedChange={v => setForm(f => ({ ...f, destaque: v }))} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Vantagens</Label>
                <Button variant="outline" size="sm" onClick={addVantagem} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar Vantagem</Button>
              </div>
              <div className="space-y-2">
                {form.vantagens.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={v} onChange={e => updateVantagem(i, e.target.value)} placeholder={`Vantagem ${i + 1}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeVantagem(i)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlanos;
