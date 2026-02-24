import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useCupons, useCreateCupom, useUpdateCupom, useDeleteCupom, useToggleCupom } from '@/hooks/useLojaExtras';
import { useLojaProducts } from '@/hooks/useLojaProducts';
import { type Cupom } from '@/services/saas-api';
import { Tag, Plus, Pencil, Trash2, Eye, EyeOff, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const emptyCupom: Partial<Cupom> = {
  codigo: '', tipo: 'percentual', valor: 10, valor_minimo_pedido: null,
  limite_usos: null, validade: null, is_active: true, produtos_ids: [],
};

const LojaCupons = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: cupons, isLoading, isError } = useCupons(id);
  const { data: products } = useLojaProducts(id);
  const createMut = useCreateCupom();
  const updateMut = useUpdateCupom();
  const deleteMut = useDeleteCupom();
  const toggleMut = useToggleCupom();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cupom>>(emptyCupom);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const openNew = () => { setEditId(null); setForm(emptyCupom); setOpen(true); };
  const openEdit = (c: Cupom) => {
    setEditId(c._id);
    setForm({ ...c, validade: c.validade ? c.validade.slice(0, 10) : null });
    setOpen(true);
  };

  const addProductId = (pid: string) => {
    const current = form.produtos_ids || [];
    if (!current.includes(pid)) {
      setForm({ ...form, produtos_ids: [...current, pid] });
    }
  };

  const removeProductId = (pid: string) => {
    setForm({ ...form, produtos_ids: (form.produtos_ids || []).filter(p => p !== pid) });
  };

  const handleSave = async () => {
    if (!form.codigo?.trim()) { toast.error('Código é obrigatório'); return; }
    try {
      const payload = {
        ...form,
        validade: form.validade ? new Date(form.validade).toISOString() : null,
        ...(form.tipo === 'frete_gratis' ? { valor: 0, produtos_ids: [] } : {}),
      };
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: payload });
        toast.success('Cupom atualizado');
      } else {
        await createMut.mutateAsync({ ...payload, loja_id: id! } as any);
        toast.success('Cupom criado');
      }
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm);
      toast.success('Cupom excluído');
      setDeleteConfirm(null);
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = (cupons || []).filter(c =>
    !search || c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const formatValor = (c: Cupom) => c.tipo === 'frete_gratis' ? 'Frete Grátis' : c.tipo === 'percentual' ? `${c.valor}%` : `R$ ${(c.valor / 100).toFixed(2).replace('.', ',')}`;
  const formatTipo = (t: string) => t === 'frete_gratis' ? '🚚' : t === 'percentual' ? '%' : 'R$';
  const formatValidade = (v: string | null) => {
    if (!v) return 'Sem validade';
    const d = new Date(v);
    return d < new Date() ? 'Expirado' : d.toLocaleDateString('pt-BR');
  };

  // Filter available products for search
  const filteredSearchProducts = useMemo(() => {
    if (!products || !productSearch.trim()) return [];
    const selectedIds = new Set(form.produtos_ids || []);
    return products
      .filter(p => !selectedIds.has(p._id!) && p.name.toLowerCase().includes(productSearch.toLowerCase()))
      .slice(0, 6);
  }, [products, productSearch, form.produtos_ids]);

  // Get selected product names
  const selectedProducts = useMemo(() => {
    if (!products || !form.produtos_ids?.length) return [];
    return form.produtos_ids.map(pid => {
      const p = products.find(x => x._id === pid);
      return p ? { id: pid, name: p.name } : { id: pid, name: pid };
    });
  }, [products, form.produtos_ids]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cupons — {loja?.nome}</h1>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Cupom</Button>
      </div>

      {isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-12 text-center">
          <p className="font-medium text-destructive mb-1">Erro ao carregar cupons</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Atualizar Página</Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !cupons?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhum cupom criado</p>
          <p className="text-sm text-muted-foreground mb-4">Crie cupons com regras, limites e validade.</p>
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Cupom</Button>
        </div>
      ) : (
        <>
          <Input placeholder="Buscar por código..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 max-w-xs" />
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c._id}>
                    <TableCell><code className="bg-muted px-2 py-0.5 rounded text-sm">{c.codigo}</code></TableCell>
                    <TableCell>{formatTipo(c.tipo)}</TableCell>
                    <TableCell>{formatValor(c)}</TableCell>
                    <TableCell>{formatValidade(c.validade)}</TableCell>
                    <TableCell>{c.usos}{c.limite_usos !== null ? `/${c.limite_usos}` : '/∞'}</TableCell>
                    <TableCell className="text-xs">
                      {(c.produtos_ids?.length) ? `${c.produtos_ids.length} selecionados` : 'Todos'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleMut.mutate(c._id)}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(c._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader><DialogTitle>{editId ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código do cupom</Label>
              <Input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="PROMO10" className="font-mono" />
            </div>
            <div>
              <Label>Tipo de desconto</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  <SelectItem value="frete_gratis">Frete Grátis 🚚</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo !== 'frete_gratis' && (
              <div>
                <Label>Valor {form.tipo === 'percentual' ? '(%)' : '(centavos)'}</Label>
                <Input type="number" min={0} value={form.valor ?? 0} onChange={e => setForm({ ...form, valor: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <Label>Valor mínimo do pedido (centavos, vazio = sem mínimo)</Label>
              <Input type="number" min={0} value={form.valor_minimo_pedido ?? ''} onChange={e => setForm({ ...form, valor_minimo_pedido: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Limite de usos (vazio = ilimitado)</Label>
              <Input type="number" min={0} value={form.limite_usos ?? ''} onChange={e => setForm({ ...form, limite_usos: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Validade (vazio = sem validade)</Label>
              <Input type="date" value={form.validade?.slice(0, 10) || ''} onChange={e => setForm({ ...form, validade: e.target.value || null })} />
            </div>

            {/* Product search with badges - hidden for frete_gratis */}
            {form.tipo !== 'frete_gratis' && <div>
              <Label className="mb-2 block">Produtos específicos (vazio = todos)</Label>
              {/* Selected products as badges */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedProducts.map(p => (
                    <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
                      <span className="truncate max-w-[150px]">{p.name}</span>
                      <button type="button" onClick={() => removeProductId(p.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto para adicionar..."
                  className="pl-9"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
              {/* Search results */}
              {productSearch.trim() && filteredSearchProducts.length > 0 && (
                <div className="mt-1 border border-border rounded-lg max-h-[180px] overflow-y-auto">
                  {filteredSearchProducts.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => { addProductId(p._id!); setProductSearch(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-muted shrink-0" />
                      )}
                      <span className="truncate flex-1">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {productSearch.trim() && filteredSearchProducts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Nenhum produto encontrado.</p>
              )}
              {selectedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedProducts.length} produto(s) selecionado(s)</p>
              )}
            </div>}

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
          <DialogHeader><DialogTitle>Excluir cupom?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaCupons;
