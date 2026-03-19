import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Sparkles, X, FolderPlus, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

interface TopicoItem { titulo: string; descricao: string; }
interface Topico { nome: string; itens: TopicoItem[]; }

interface PlanoForm {
  nome: string;
  preco_original: number;
  preco_promocional: number;
  taxa_transacao: number;
  taxa_transacao_percentual: number;
  taxa_transacao_trial: number;
  taxa_transacao_fixa: number;
  stripe_price_id: string;
  topicos: Topico[];
  limitacoes: string[];
  destaques: string[];
  destaque: boolean;
  ordem: number;
}

const emptyForm: PlanoForm = {
  nome: '', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.5,
  taxa_transacao_percentual: 1.5, taxa_transacao_trial: 2.0, taxa_transacao_fixa: 0,
  stripe_price_id: '', topicos: [], limitacoes: [], destaques: [], destaque: false, ordem: 0,
};

// --- Sortable wrapper for topics ---
const SortableTopicCard = ({ id, children }: { id: string; children: (handleProps: ReturnType<typeof useSortable>) => React.ReactNode }) => {
  const sortable = useSortable({ id });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return <div ref={sortable.setNodeRef} style={style}>{children(sortable)}</div>;
};

// --- Sortable wrapper for items ---
const SortableItemRow = ({ id, children }: { id: string; children: (handleProps: ReturnType<typeof useSortable>) => React.ReactNode }) => {
  const sortable = useSortable({ id });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return <div ref={sortable.setNodeRef} style={style}>{children(sortable)}</div>;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (p: any) => {
    const topicos = (p.topicos && p.topicos.length > 0)
      ? p.topicos
      : (p.vantagens && p.vantagens.length > 0)
        ? [{ nome: 'Recursos Principais', itens: p.vantagens.map((v: string) => ({ titulo: v, descricao: '' })) }]
        : [];
    setForm({
      nome: p.nome, preco_original: p.preco_original, preco_promocional: p.preco_promocional,
      taxa_transacao: p.taxa_transacao, taxa_transacao_percentual: p.taxa_transacao_percentual ?? p.taxa_transacao ?? 1.5,
      taxa_transacao_trial: p.taxa_transacao_trial ?? 2.0, taxa_transacao_fixa: p.taxa_transacao_fixa ?? 0,
      stripe_price_id: p.stripe_price_id, topicos, limitacoes: p.limitacoes || [],
      destaques: p.destaques || [], destaque: p.destaque, ordem: p.ordem,
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

  // --- Tópicos helpers ---
  const addTopico = () => setForm(f => ({ ...f, topicos: [...f.topicos, { nome: '', itens: [] }] }));
  const removeTopico = (ti: number) => setForm(f => ({ ...f, topicos: f.topicos.filter((_, idx) => idx !== ti) }));
  const updateTopicoNome = (ti: number, nome: string) =>
    setForm(f => ({ ...f, topicos: f.topicos.map((t, idx) => idx === ti ? { ...t, nome } : t) }));
  const addItem = (ti: number) =>
    setForm(f => ({ ...f, topicos: f.topicos.map((t, idx) => idx === ti ? { ...t, itens: [...t.itens, { titulo: '', descricao: '' }] } : t) }));
  const removeItem = (ti: number, ii: number) =>
    setForm(f => ({ ...f, topicos: f.topicos.map((t, idx) => idx === ti ? { ...t, itens: t.itens.filter((_, j) => j !== ii) } : t) }));
  const updateItem = (ti: number, ii: number, field: 'titulo' | 'descricao', value: string) =>
    setForm(f => ({ ...f, topicos: f.topicos.map((t, idx) => idx === ti ? { ...t, itens: t.itens.map((item, j) => j === ii ? { ...item, [field]: value } : item) } : t) }));

  // --- Limitações helpers ---
  const addLimitacao = () => setForm(f => ({ ...f, limitacoes: [...f.limitacoes, ''] }));
  const removeLimitacao = (i: number) => setForm(f => ({ ...f, limitacoes: f.limitacoes.filter((_, idx) => idx !== i) }));
  const updateLimitacao = (i: number, v: string) => setForm(f => ({ ...f, limitacoes: f.limitacoes.map((item, idx) => idx === i ? v : item) }));

  // --- Destaques helpers ---
  const addDestaque = () => setForm(f => ({ ...f, destaques: [...f.destaques, ''] }));
  const removeDestaque = (i: number) => setForm(f => ({ ...f, destaques: f.destaques.filter((_, idx) => idx !== i) }));
  const updateDestaque = (i: number, v: string) => setForm(f => ({ ...f, destaques: f.destaques.map((item, idx) => idx === i ? v : item) }));

  // --- DnD handlers ---
  const handleTopicDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setForm(f => {
      const oldIdx = f.topicos.findIndex((_, i) => `topico-${i}` === active.id);
      const newIdx = f.topicos.findIndex((_, i) => `topico-${i}` === over.id);
      return { ...f, topicos: arrayMove(f.topicos, oldIdx, newIdx) };
    });
  };

  const handleItemDragEnd = (ti: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setForm(f => {
      const topico = f.topicos[ti];
      const oldIdx = topico.itens.findIndex((_, i) => `item-${ti}-${i}` === active.id);
      const newIdx = topico.itens.findIndex((_, i) => `item-${ti}-${i}` === over.id);
      const newItens = arrayMove(topico.itens, oldIdx, newIdx);
      return { ...f, topicos: f.topicos.map((t, idx) => idx === ti ? { ...t, itens: newItens } : t) };
    });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const topicoIds = form.topicos.map((_, i) => `topico-${i}`);

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
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
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
                <TableHead>Tópicos</TableHead>
                <TableHead>Destaques</TableHead>
                <TableHead>Limitações</TableHead>
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
                  <TableCell>{(p.topicos || []).length}</TableCell>
                  <TableCell>{(p.destaques || []).length}</TableCell>
                  <TableCell>{(p.limitacoes || []).length}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Limites e Destaques (Chips) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Limites e Destaques (Chips)</Label>
                <Button variant="outline" size="sm" onClick={addDestaque} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar</Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Exibidos como badges no topo do card público (ex: "1 Loja", "500 Produtos", "3 Pixels").</p>
              <div className="space-y-2">
                {form.destaques.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={v} onChange={e => updateDestaque(i, e.target.value)} placeholder={`Destaque ${i + 1}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeDestaque(i)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tópicos de Recursos com DnD */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Tópicos de Recursos</Label>
                <Button variant="outline" size="sm" onClick={addTopico} className="gap-1 text-xs">
                  <FolderPlus className="h-3 w-3" /> Adicionar Novo Tópico
                </Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd} modifiers={[restrictToVerticalAxis]}>
                <SortableContext items={topicoIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {form.topicos.map((topico, ti) => {
                      const itemIds = topico.itens.map((_, ii) => `item-${ti}-${ii}`);
                      return (
                        <SortableTopicCard key={`topico-${ti}`} id={`topico-${ti}`}>
                          {(sortable) => (
                            <Card className="border-border">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex gap-2 items-center">
                                  <button
                                    type="button"
                                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                                    {...sortable.attributes}
                                    {...sortable.listeners}
                                  >
                                    <GripVertical className="h-5 w-5" />
                                  </button>
                                  <Input
                                    value={topico.nome}
                                    onChange={e => updateTopicoNome(ti, e.target.value)}
                                    placeholder="Nome do Tópico (ex: Marketing & Conversão)"
                                    className="font-medium"
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => removeTopico(ti)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd(ti)} modifiers={[restrictToVerticalAxis]}>
                                  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3 pl-2 border-l-2 border-muted ml-1">
                                      {topico.itens.map((item, ii) => (
                                        <SortableItemRow key={`item-${ti}-${ii}`} id={`item-${ti}-${ii}`}>
                                          {(itemSortable) => (
                                            <div className="space-y-1">
                                              <div className="flex gap-2 items-center">
                                                <button
                                                  type="button"
                                                  className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                                                  {...itemSortable.attributes}
                                                  {...itemSortable.listeners}
                                                >
                                                  <GripVertical className="h-4 w-4" />
                                                </button>
                                                <Input
                                                  value={item.titulo}
                                                  onChange={e => updateItem(ti, ii, 'titulo', e.target.value)}
                                                  placeholder="Título do recurso"
                                                  className="text-sm"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(ti, ii)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                              <Textarea
                                                value={item.descricao}
                                                onChange={e => updateItem(ti, ii, 'descricao', e.target.value)}
                                                placeholder="Descrição detalhada do recurso..."
                                                className="text-sm min-h-[60px] ml-6"
                                              />
                                            </div>
                                          )}
                                        </SortableItemRow>
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                                <Button variant="outline" size="sm" onClick={() => addItem(ti)} className="gap-1 text-xs w-full">
                                  <Plus className="h-3 w-3" /> Adicionar Item
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </SortableTopicCard>
                      );
                    })}
                    {form.topicos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum tópico adicionado.</p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Limitações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Limitações do Plano (Recursos NÃO inclusos)</Label>
                <Button variant="outline" size="sm" onClick={addLimitacao} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar Limitação</Button>
              </div>
              <div className="space-y-2">
                {form.limitacoes.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={v} onChange={e => updateLimitacao(i, e.target.value)} placeholder={`Limitação ${i + 1}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeLimitacao(i)}><X className="h-4 w-4" /></Button>
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
