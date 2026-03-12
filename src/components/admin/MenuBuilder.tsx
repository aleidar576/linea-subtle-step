import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Link2, Layers, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MenuItemConfig, LojaCategory } from '@/services/saas-api';

interface PaginaData {
  _id: string;
  titulo: string;
  slug: string;
  is_active: boolean;
}

interface MenuBuilderProps {
  value: MenuItemConfig[];
  onChange: (items: MenuItemConfig[]) => void;
  categories: LojaCategory[];
  pages: PaginaData[];
}

const MAX_DEPTH = 2;

export default function MenuBuilder({ value, onChange, categories, pages }: MenuBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<'category' | 'page' | 'custom'>('category');
  const [selectedRef, setSelectedRef] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const openDialog = (parentId?: string) => {
    setDialogParentId(parentId || null);
    setDialogType('category');
    setSelectedRef('');
    setCustomLabel('');
    setCustomUrl('');
    setDialogOpen(true);
  };

  const handleAdd = () => {
    let newItem: MenuItemConfig;

    if (dialogType === 'category') {
      const cat = categories.find(c => c._id === selectedRef);
      if (!cat) return;
      // Auto-populate children with subcategories
      const subcats = categories.filter(c => c.parent_id === cat._id);
      newItem = {
        id: crypto.randomUUID(),
        type: 'category',
        reference_id: cat._id,
        label: cat.nome,
        url: `/categoria/${cat.slug}`,
        children: subcats.map(sc => ({
          id: crypto.randomUUID(),
          type: 'category' as const,
          reference_id: sc._id,
          label: sc.nome,
          url: `/categoria/${sc.slug}`,
          children: [],
        })),
      };
    } else if (dialogType === 'page') {
      if (selectedRef === '__home__') {
        newItem = {
          id: crypto.randomUUID(),
          type: 'page',
          reference_id: '__home__',
          label: 'Início',
          url: '/',
          children: [],
        };
      } else {
        const page = pages.find(p => p._id === selectedRef);
        if (!page) return;
        newItem = {
          id: crypto.randomUUID(),
          type: 'page',
          reference_id: page._id,
          label: page.titulo,
          url: `/pagina/${page.slug}`,
          children: [],
        };
      }
    } else {
      if (!customLabel.trim() || !customUrl.trim()) return;
      newItem = {
        id: crypto.randomUUID(),
        type: 'custom',
        reference_id: '',
        label: customLabel.trim(),
        url: customUrl.trim(),
        children: [],
      };
    }

    if (dialogParentId) {
      onChange(addChildToItem(value, dialogParentId, newItem));
    } else {
      onChange([...value, newItem]);
    }
    setDialogOpen(false);
  };

  const removeItem = (id: string) => {
    onChange(removeFromTree(value, id));
  };

  const updateLabel = (id: string, label: string) => {
    onChange(updateInTree(value, id, { label }));
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    onChange(moveInTree(value, id, direction));
  };

  // Only show root-level categories (no parent)
  const rootCategories = categories.filter(c => !c.parent_id);
  const activePages = pages.filter(p => p.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Itens do Menu</h3>
          <p className="text-sm text-muted-foreground">Organize a navegação principal da sua loja.</p>
        </div>
        <Button onClick={() => openDialog()} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar Item
        </Button>
      </div>

      {value.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum item configurado. O menu usará as categorias ativas como fallback.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {value.map((item, idx) => (
            <MenuItemCard
              key={item.id}
              item={item}
              depth={0}
              index={idx}
              total={value.length}
              onRemove={removeItem}
              onUpdateLabel={updateLabel}
              onMove={moveItem}
              onAddChild={openDialog}
            />
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogParentId ? 'Adicionar Sub-item' : 'Adicionar Item ao Menu'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={dialogType} onValueChange={(v: any) => { setDialogType(v); setSelectedRef(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Categoria</SelectItem>
                  <SelectItem value="page">Página</SelectItem>
                  <SelectItem value="custom">Link Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dialogType === 'category' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedRef} onValueChange={setSelectedRef}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                  <SelectContent>
                    {rootCategories.map(cat => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRef && (() => {
                  const subcats = categories.filter(c => c.parent_id === selectedRef);
                  return subcats.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {subcats.length} subcategoria(s) serão adicionadas automaticamente como sub-itens.
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {dialogType === 'page' && (
              <div className="space-y-2">
                <Label>Página</Label>
                <Select value={selectedRef} onValueChange={setSelectedRef}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma página" /></SelectTrigger>
                  <SelectContent>
                    {activePages.map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Ex: Blog" maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://..." maxLength={200} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={dialogType !== 'custom' ? !selectedRef : !customLabel.trim() || !customUrl.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Recursive item card ──
function MenuItemCard({
  item, depth, index, total, onRemove, onUpdateLabel, onMove, onAddChild,
}: React.ComponentProps<'div'> & {
  item: MenuItemConfig;
  depth: number;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onAddChild: (parentId?: string) => void;
}) {
  const typeBadge = {
    category: { label: 'Categoria', variant: 'default' as const },
    page: { label: 'Página', variant: 'secondary' as const },
    custom: { label: 'Link', variant: 'outline' as const },
  }[item.type];

  const TypeIcon = item.type === 'category' ? Layers : item.type === 'page' ? FileText : Link2;

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={item.label}
            onChange={e => onUpdateLabel(item.id, e.target.value)}
            className="h-8 text-sm flex-1"
            maxLength={50}
          />
          <span className={cn(badgeVariants({ variant: typeBadge.variant }), "text-[10px] shrink-0")}>{typeBadge.label}</span>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.id, 'up')} disabled={index === 0}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.id, 'down')} disabled={index === total - 1}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            {depth < MAX_DEPTH && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(item.id)}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-9 truncate">{item.url}</p>
      </Card>

      {item.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {item.children.map((child, ci) => (
            <MenuItemCard
              key={child.id}
              item={child}
              depth={depth + 1}
              index={ci}
              total={item.children.length}
              onRemove={onRemove}
              onUpdateLabel={onUpdateLabel}
              onMove={onMove}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tree utilities ──

function removeFromTree(items: MenuItemConfig[], id: string): MenuItemConfig[] {
  return items
    .filter(item => item.id !== id)
    .map(item => ({ ...item, children: removeFromTree(item.children, id) }));
}

function updateInTree(items: MenuItemConfig[], id: string, patch: Partial<MenuItemConfig>): MenuItemConfig[] {
  return items.map(item => {
    if (item.id === id) return { ...item, ...patch };
    return { ...item, children: updateInTree(item.children, id, patch) };
  });
}

function addChildToItem(items: MenuItemConfig[], parentId: string, child: MenuItemConfig): MenuItemConfig[] {
  return items.map(item => {
    if (item.id === parentId) return { ...item, children: [...item.children, child] };
    return { ...item, children: addChildToItem(item.children, parentId, child) };
  });
}

function moveInTree(items: MenuItemConfig[], id: string, direction: 'up' | 'down'): MenuItemConfig[] {
  const idx = items.findIndex(item => item.id === id);
  if (idx !== -1) {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return items;
    const copy = [...items];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    return copy;
  }
  return items.map(item => ({ ...item, children: moveInTree(item.children, id, direction) }));
}
