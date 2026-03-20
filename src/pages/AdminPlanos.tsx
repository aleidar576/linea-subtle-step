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
import { Loader2, Plus, Pencil, Trash2, Sparkles, X, GripVertical, MessageCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

/* ── Sortable row ── */
const SortableItem = ({ id, value, index, field, onUpdate, onRemove }: {
  id: string; value: string; index: number; field: string;
  onUpdate: (i: number, v: string) => void; onRemove: (i: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center">
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input value={value} onChange={e => onUpdate(index, e.target.value)} placeholder={`${field} ${index + 1}`} />
      <Button variant="ghost" size="icon" onClick={() => onRemove(index)}><X className="h-4 w-4" /></Button>
    </div>
  );
};

/* ── Sortable list section ── */
const SortableListSection = ({ label, hint, items, field, onAdd, onRemove, onUpdate, onReorder }: {
  label: string; hint?: string; items: string[]; field: string;
  onAdd: () => void; onRemove: (i: number) => void;
  onUpdate: (i: number, v: string) => void; onReorder: (items: string[]) => void;
}) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const ids = items.map((_, i) => `${field}-${i}`);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    onReorder(arrayMove(items, oldIdx, newIdx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-base font-semibold">{label}</Label>
        <Button variant="outline" size="sm" onClick={onAdd} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar</Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((v, i) => (
              <SortableItem key={ids[i]} id={ids[i]} value={v} index={i} field={field} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

interface PlanoForm {
  nome: string;
  subtitulo: string;
  textoDestaque: string;
  preco_original: number;
  preco_promocional: number;
  taxa_transacao: number;
  taxa_transacao_percentual: number;
  taxa_transacao_trial: number;
  taxa_transacao_fixa: number;
  stripe_price_id: string;
  vantagens: string[];
  desvantagens: string[];
  destaque: boolean;
  ordem: number;
  isSobMedida: boolean;
  textoBotao: string;
  whatsappNumero: string;
  whatsappMensagem: string;
  categoria: 'business' | 'loja_pronta';
  isPagamentoUnico: boolean;
  maxParcelas: number;
  destaques: string[];
}

const emptyForm: PlanoForm = {
  nome: '', subtitulo: '', textoDestaque: '', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.5,
  taxa_transacao_percentual: 1.5, taxa_transacao_trial: 2.0, taxa_transacao_fixa: 0,
  stripe_price_id: '', vantagens: [], desvantagens: [], destaque: false, ordem: 0,
  isSobMedida: false, textoBotao: '', whatsappNumero: '', whatsappMensagem: '',
  categoria: 'business', isPagamentoUnico: false, maxParcelas: 12, destaques: [],
};

const CATEGORIA_LABELS: Record<string, string> = {
  business: 'Business',
  loja_pronta: 'Loja Pronta',
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
      nome: p.nome, subtitulo: p.subtitulo || '', textoDestaque: p.textoDestaque || '',
      preco_original: p.preco_original, preco_promocional: p.preco_promocional,
      taxa_transacao: p.taxa_transacao, taxa_transacao_percentual: p.taxa_transacao_percentual ?? p.taxa_transacao ?? 1.5,
      taxa_transacao_trial: p.taxa_transacao_trial ?? 2.0, taxa_transacao_fixa: p.taxa_transacao_fixa ?? 0,
      stripe_price_id: p.stripe_price_id || '',
      vantagens: p.vantagens || [],
      desvantagens: p.desvantagens || [],
      destaque: p.destaque, ordem: p.ordem,
      isSobMedida: p.isSobMedida || false,
      textoBotao: p.textoBotao || '',
      whatsappNumero: p.whatsappNumero || '',
      whatsappMensagem: p.whatsappMensagem || '',
      categoria: p.categoria || 'business',
      isPagamentoUnico: p.isPagamentoUnico || false,
      maxParcelas: p.maxParcelas ?? 12,
      destaques: p.destaques || [],
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || (!form.isSobMedida && !form.stripe_price_id)) {
      toast({ title: 'Erro', description: 'Nome é obrigatório. Stripe Price ID é obrigatório para planos normais.', variant: 'destructive' });
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

  // --- List helpers ---
  const addToList = (field: 'vantagens' | 'desvantagens' | 'destaques') =>
    setForm(f => ({ ...f, [field]: [...f[field], ''] }));
  const removeFromList = (field: 'vantagens' | 'desvantagens' | 'destaques', i: number) =>
    setForm(f => ({ ...f, [field]: f[field].filter((_, idx) => idx !== i) }));
  const updateList = (field: 'vantagens' | 'desvantagens' | 'destaques', i: number, v: string) =>
    setForm(f => ({ ...f, [field]: f[field].map((item, idx) => idx === i ? v : item) }));

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
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço Original</TableHead>
                <TableHead>Preço Promocional</TableHead>
                <TableHead>Taxa %</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destaque</TableHead>
                <TableHead>Vantagens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos.map((p: any) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIA_LABELS[p.categoria] || 'Business'}
                    </Badge>
                  </TableCell>
                  <TableCell>R$ {(p.preco_original || 0).toFixed(2)}</TableCell>
                  <TableCell>R$ {(p.preco_promocional || 0).toFixed(2)}</TableCell>
                  <TableCell>{p.taxa_transacao_percentual ?? p.taxa_transacao}%</TableCell>
                  <TableCell>
                    {p.isPagamentoUnico ? (
                      <Badge className="bg-secondary/15 text-secondary text-xs">Único</Badge>
                    ) : p.isSobMedida ? (
                      <Badge className="bg-muted text-muted-foreground text-xs">Sob Medida</Badge>
                    ) : (
                      <Badge className="bg-primary/15 text-primary text-xs">Recorrente</Badge>
                    )}
                  </TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Starter" />
            </div>

            {/* Categoria */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Categoria do Plano</Label>
              <RadioGroup
                value={form.categoria}
                onValueChange={(v: 'business' | 'loja_pronta') => setForm(f => ({ ...f, categoria: v }))}
                className="flex gap-4"
              >
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${form.categoria === 'business' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <RadioGroupItem value="business" />
                  <div>
                    <span className="font-medium text-sm">Business</span>
                    <p className="text-xs text-muted-foreground">Planos SaaS recorrentes</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${form.categoria === 'loja_pronta' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <RadioGroupItem value="loja_pronta" />
                  <div>
                    <span className="font-medium text-sm">Loja Pronta</span>
                    <p className="text-xs text-muted-foreground">Serviços high-ticket</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div>
              <Label>Subtítulo do Plano</Label>
              <Input value={form.subtitulo} onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))} placeholder="Ex: Ideal para profissionais..." />
            </div>
            <div>
              <Label>Frase de Ancoragem</Label>
              <Input value={form.textoDestaque} onChange={e => setForm(f => ({ ...f, textoDestaque: e.target.value }))} placeholder="Ex: Tudo do plano [[Starter]] mais:" />
              <p className="text-xs text-muted-foreground mt-1">Use [[NomePlano]] para destacar em cor primária</p>
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

            {/* Pagamento Único */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">É pagamento único?</Label>
                  <p className="text-xs text-muted-foreground">Sem cobrança recorrente (ex: serviço avulso)</p>
                </div>
                <Switch checked={form.isPagamentoUnico} onCheckedChange={v => setForm(f => ({ ...f, isPagamentoUnico: v }))} />
              </div>
              {form.isPagamentoUnico && (
                <div className="pl-4 border-l-2 border-primary/30">
                  <Label>Máximo de Parcelas Permitidas</Label>
                  <Input type="number" min={1} max={24} value={form.maxParcelas} onChange={e => setForm(f => ({ ...f, maxParcelas: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground mt-1">Usado para exibir o valor parcelado na vitrine</p>
                </div>
              )}
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

            {/* Configuração do Botão e CTA */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Configuração do Botão e CTA</Label>
              <div>
                <Label>Texto Customizado do Botão</Label>
                <Input value={form.textoBotao} onChange={e => setForm(f => ({ ...f, textoBotao: e.target.value }))} placeholder="Ex: Falar com especialista" />
                <p className="text-xs text-muted-foreground mt-1">Se vazio, usa o texto padrão do checkout</p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativar Modo Sob Medida (Venda via WhatsApp)</Label>
                <Switch checked={form.isSobMedida} onCheckedChange={v => setForm(f => ({ ...f, isSobMedida: v }))} />
              </div>
              {form.isSobMedida && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                  <div>
                    <Label>Número do WhatsApp (com DDI e DDD)</Label>
                    <Input value={form.whatsappNumero} onChange={e => setForm(f => ({ ...f, whatsappNumero: e.target.value }))} placeholder="5511999999999" className="font-mono" />
                  </div>
                  <div>
                    <Label>Mensagem Predefinida para o Especialista</Label>
                    <Textarea value={form.whatsappMensagem} onChange={e => setForm(f => ({ ...f, whatsappMensagem: e.target.value }))} placeholder="Olá! Tenho interesse no plano Enterprise..." rows={3} />
                  </div>
                </div>
              )}
            </div>

            {/* Vantagens */}
            <SortableListSection
              label="Vantagens (Check Verde)"
              hint='Use **texto** para negrito. Ex: **500** Produtos'
              items={form.vantagens}
              field="vantagens"
              onAdd={() => addToList('vantagens')}
              onRemove={(i) => removeFromList('vantagens', i)}
              onUpdate={(i, v) => updateList('vantagens', i, v)}
              onReorder={(items) => setForm(f => ({ ...f, vantagens: items }))}
            />

            {/* Desvantagens */}
            <SortableListSection
              label="Desvantagens (X Vermelho)"
              items={form.desvantagens}
              field="desvantagens"
              onAdd={() => addToList('desvantagens')}
              onRemove={(i) => removeFromList('desvantagens', i)}
              onUpdate={(i, v) => updateList('desvantagens', i, v)}
              onReorder={(items) => setForm(f => ({ ...f, desvantagens: items }))}
            />

            {/* Destaques Extras */}
            <SortableListSection
              label="Destaques Extras"
              hint='Seção "Você também conta com:" — exibida após as vantagens'
              items={form.destaques}
              field="destaques"
              onAdd={() => addToList('destaques')}
              onRemove={(i) => removeFromList('destaques', i)}
              onUpdate={(i, v) => updateList('destaques', i, v)}
              onReorder={(items) => setForm(f => ({ ...f, destaques: items }))}
            />

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
