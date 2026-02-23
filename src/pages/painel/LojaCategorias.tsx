import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useLojaCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '@/hooks/useLojaCategories';
import { lojaCategoriesApi } from '@/services/saas-api';
import { useToast } from '@/hooks/use-toast';
import {
  Layers, Plus, Trash2, ChevronRight, Edit2, X as XIcon,
  Loader2, ArrowLeft, ArrowUp, ArrowDown, Search, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { LojaCategory } from '@/services/saas-api';

type ViewMode = 'list' | 'editor';

interface CatProduct {
  _id: string;
  name: string;
  image: string;
  price: number;
  sort_order: number;
  category_id: string | null;
  is_active: boolean;
}

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const LojaCategorias = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: catData, isLoading } = useLojaCategories(id);
  const { toast } = useToast();

  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const reorderMut = useReorderCategories();

  const [mode, setMode] = useState<ViewMode>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('none');
  // removed: editingId, editName, dragIdx (no longer needed)

  // Editor state
  const [selectedCat, setSelectedCat] = useState<LojaCategory | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [catProducts, setCatProducts] = useState<CatProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Add products dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<CatProduct[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [addSearch, setAddSearch] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);

  const categories = catData?.categories || [];
  const uncategorizedCount = catData?.uncategorized_count || 0;
  // Sort A-Z fixed
  const sortedCategories = [...categories].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const roots = sortedCategories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => sortedCategories.filter(c => c.parent_id === parentId);

  const loadCategoryProducts = useCallback(async (categoryId: string) => {
    if (!id) return;
    setLoadingProducts(true);
    try {
      const prods = await lojaCategoriesApi.getCategoryProducts(id, categoryId);
      setCatProducts(prods);
    } catch { setCatProducts([]); }
    finally { setLoadingProducts(false); }
  }, [id]);

  const openEditor = (cat: LojaCategory) => {
    setSelectedCat(cat);
    setEditorName(cat.nome);
    setEditorSlug(cat.slug);
    setMode('editor');
    loadCategoryProducts(cat._id);
  };

  const goBack = () => {
    setMode('list');
    setSelectedCat(null);
    setCatProducts([]);
  };

  const handleSaveCategory = async () => {
    if (!selectedCat || !editorName.trim()) return;
    try {
      await updateMut.mutateAsync({ id: selectedCat._id, data: { nome: editorName, slug: editorSlug || slugify(editorName) } });
      toast({ title: 'Categoria atualizada!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !id) return;
    try {
      await createMut.mutateAsync({ nome: newName, loja_id: id, parent_id: newParent === 'none' ? undefined : newParent });
      toast({ title: 'Categoria criada!' });
      setDialogOpen(false);
      setNewName('');
      setNewParent('none');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  // Removed: handleRename, handleDragStart, handleDrop (no longer needed)

  // Product reorder
  const moveProduct = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= catProducts.length) return;
    const updated = [...catProducts];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setCatProducts(updated.map((p, i) => ({ ...p, sort_order: i })));
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const items = catProducts.map((p, i) => ({ id: p._id, category_id: selectedCat?._id || null, sort_order: i }));
      await lojaCategoriesApi.bulkUpdateProducts(items);
      toast({ title: 'Ordem salva!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSavingOrder(false); }
  };

  const handleRemoveFromCategory = async (productId: string) => {
    try {
      await lojaCategoriesApi.bulkUpdateProducts([{ id: productId, category_id: null, sort_order: 0 }]);
      setCatProducts(prev => prev.filter(p => p._id !== productId));
      toast({ title: 'Produto removido da categoria' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  // Add products
  const openAddDialog = async () => {
    if (!id || !selectedCat) return;
    setAddDialogOpen(true);
    setLoadingAll(true);
    setSelectedToAdd(new Set());
    setAddSearch('');
    try {
      // Get uncategorized products + products from other categories
      const uncategorized = await lojaCategoriesApi.getCategoryProducts(id, null);
      // Also get from other categories
      const otherCats = categories.filter(c => c._id !== selectedCat._id);
      let otherProducts: CatProduct[] = [];
      for (const c of otherCats) {
        const prods = await lojaCategoriesApi.getCategoryProducts(id, c._id);
        otherProducts = [...otherProducts, ...prods];
      }
      setAllProducts([...uncategorized, ...otherProducts]);
    } catch { setAllProducts([]); }
    finally { setLoadingAll(false); }
  };

  const handleAddProducts = async () => {
    if (!selectedCat || selectedToAdd.size === 0) return;
    const maxSort = catProducts.length > 0 ? Math.max(...catProducts.map(p => p.sort_order)) : -1;
    const items = Array.from(selectedToAdd).map((pid, i) => ({
      id: pid, category_id: selectedCat._id, sort_order: maxSort + 1 + i,
    }));
    try {
      await lojaCategoriesApi.bulkUpdateProducts(items);
      toast({ title: `${items.length} produto(s) adicionado(s)` });
      setAddDialogOpen(false);
      loadCategoryProducts(selectedCat._id);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const filteredAddProducts = allProducts.filter(p =>
    !addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase())
  );

  // ============ EDITOR MODE ============
  if (mode === 'editor' && selectedCat) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold">{selectedCat.nome}</h1>
          </div>
          <Button onClick={handleSaveCategory} size="sm">Salvar Categoria</Button>
        </div>

        {/* Category fields */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Categoria</Label>
              <Input value={editorName} onChange={e => { setEditorName(e.target.value); setEditorSlug(slugify(e.target.value)); }} />
            </div>
            <div>
              <Label>URL / Slug</Label>
              <Input value={editorSlug} onChange={e => setEditorSlug(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Products in category */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Produtos desta Categoria ({catProducts.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openAddDialog} className="gap-1">
                <Plus className="h-4 w-4" /> Adicionar Produtos
              </Button>
              {catProducts.length > 0 && (
                <Button size="sm" onClick={handleSaveOrder} disabled={savingOrder} className="gap-1">
                  {savingOrder && <Loader2 className="h-4 w-4 animate-spin" />} Salvar Ordem
                </Button>
              )}
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : catProducts.length === 0 ? (
            <div className="text-center py-10">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> Adicionar Produtos
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catProducts.map((p, idx) => (
                  <TableRow key={p._id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      {p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>R$ {(p.price / 100).toFixed(2).replace('.', ',')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => moveProduct(idx, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={idx === catProducts.length - 1} onClick={() => moveProduct(idx, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><XIcon className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover da categoria?</AlertDialogTitle>
                              <AlertDialogDescription>O produto será movido para "Sem categoria".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveFromCategory(p._id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add products dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Produtos à "{selectedCat.nome}"</DialogTitle>
            </DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." className="pl-9" value={addSearch} onChange={e => setAddSearch(e.target.value)} />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {loadingAll ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : filteredAddProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto disponível.</p>
              ) : (
                filteredAddProducts.map(p => (
                  <label key={p._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedToAdd.has(p._id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedToAdd);
                        if (checked) next.add(p._id); else next.delete(p._id);
                        setSelectedToAdd(next);
                      }}
                    />
                    {p.image ? (
                      <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-3 w-3 text-muted-foreground" /></div>
                    )}
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">R$ {(p.price / 100).toFixed(2).replace('.', ',')}</span>
                  </label>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddProducts} disabled={selectedToAdd.size === 0}>
                Adicionar ({selectedToAdd.size})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ LIST MODE ============
  const renderCategory = (cat: LojaCategory, isChild = false) => {
    const children = getChildren(cat._id);

    return (
      <div key={cat._id} className={isChild ? 'ml-8' : ''}>
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 group cursor-pointer"
          onClick={() => openEditor(cat)}
        >
          {isChild && <ChevronRight className="h-3 w-3 text-muted-foreground" />}

          <span className="text-sm font-medium flex-1">{cat.nome}</span>
          <Badge variant="secondary" className="text-xs">{cat.qtd_produtos || 0}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); openEditor(cat); }}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir "{cat.nome}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  {(cat.qtd_produtos || 0) > 0
                    ? `${cat.qtd_produtos} produto(s) serão movidos para "Sem categoria".`
                    : 'Esta ação não pode ser desfeita.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMut.mutate(cat._id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {children.map(child => renderCategory(child, true))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categorias — {loja?.nome}</h1>
        <Button size="sm" className="gap-1" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nova Categoria</Button>
      </div>

      {/* Sem categoria (fixed) */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-lg">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium flex-1">Sem categoria</span>
          <Badge variant="secondary" className="text-xs">{uncategorizedCount}</Badge>
          <span className="text-xs text-muted-foreground">Padrão</span>
        </div>
      </div>

      {/* Categories list - A-Z fixed */}
      {roots.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Organize seus produtos</p>
          <p className="text-sm text-muted-foreground mb-4">Crie categorias para organizar seus produtos.</p>
          <Button size="sm" className="gap-1" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nova Categoria</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          {roots.map((cat) => (
            <div key={cat._id}>
              {renderCategory(cat)}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Camisetas" autoFocus />
            </div>
            <div>
              <Label>Categoria pai (opcional)</Label>
              <Select value={newParent} onValueChange={setNewParent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {roots.map(c => <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaCategorias;
