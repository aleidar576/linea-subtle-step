import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useLojaProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProduct } from '@/hooks/useLojaProducts';
import { useLojaCategories } from '@/hooks/useLojaCategories';
import { useFretes } from '@/hooks/useLojaExtras';
import { settingsApi } from '@/services/api';
import type { LojaProduct, Variacao, AvaliacaoManual, AvaliacoesConfig, FreteConfig, OfertaRelampago, RegraFrete } from '@/services/saas-api';
import { lojaProductsApi } from '@/services/saas-api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Search, Upload, Download, Trash2, Edit, ToggleLeft, ToggleRight, Loader2, X, ImageIcon, ArrowLeft, FileJson, FileSpreadsheet, Zap, Flame, ShoppingCart, GripVertical, Check, Link as LinkIcon, User, Columns3, CheckSquare, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ImageUploader from '@/components/ImageUploader';
import { CurrencyInput } from '@/components/ui/currency-input';

const EMPTY_AVALIACAO_CONFIG: AvaliacoesConfig = {
  nota: 5.0,
  nota_exibicao: '5,0',
  ver_mais_modo: 'ocultar',
  qtd_antes_ver_mais: 3,
  usar_comentarios_padrao: false,
  avaliacoes_manuais: [],
};

const EMPTY_FRETE: FreteConfig = { tipo: 'entregue_ate', data_1: null, data_2: null };
const EMPTY_OFERTA: OfertaRelampago = { ativo: false, icone: 'zap', titulo: 'Oferta Relâmpago', data_termino: null, estoque_campanha: 0, evergreen_minutos: 0, evergreen_segundos: 0 };

function getEmptyProduct(lojaId: string): Partial<LojaProduct> {
  return {
    loja_id: lojaId,
    name: '',
    short_description: '',
    description: '',
    price: 0,
    original_price: null,
    image: '',
    images: [],
    features: [],
    promotion: null,
    category_id: null,
    is_active: true,
    rating: 5.0,
    rating_count: '+100',
    variacoes: [],
    vender_sem_estoque: true,
    estoque: 0,
    avaliacoes_config: { ...EMPTY_AVALIACAO_CONFIG },
    frete_config: { tipo: 'entregue_ate', data_1: null, data_2: null },
    fretes_vinculados: [],
    parcelas_fake: null,
    vendas_fake: 0,
    oferta_relampago: { ...EMPTY_OFERTA },
    vantagens: { ativo: false, itens: [] },
    protecao_cliente: { ativo: false, itens: [] },
    pessoas_vendo: { ativo: false, min: 10, max: 50 },
    cross_sell: { modo: 'aleatorio', categoria_manual_id: null },
    social_proof_gender: 'desativado',
    badge_imagem: null,
  };
}

// === CSV Helpers ===
const CSV_COLUMNS = ['name', 'short_description', 'price', 'original_price', 'estoque', 'category_id', 'is_active', 'promotion', 'image', 'images'];

function productsToCsv(products: LojaProduct[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = products.map(p =>
    CSV_COLUMNS.map(col => {
      const val = (p as any)[col];
      if (col === 'images') return `"${(val || []).join(';')}"`;
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val ?? '';
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function csvModelTemplate(): string {
  const header = CSV_COLUMNS.join(',');
  const example = 'Produto Exemplo,Descrição curta,9990,,10,,true,10% OFF,0,https://exemplo.com/img.jpg,""';
  return [header, example].join('\n');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// === JSON Example (all fields) ===
function jsonExample(): Partial<LojaProduct> {
  return {
    name: 'Produto Exemplo',
    short_description: 'Descrição curta do produto',
    description: 'Descrição longa detalhada do produto com informações completas.',
    price: 9990,
    original_price: 14990,
    image: 'https://exemplo.com/imagem-principal.jpg',
    images: ['https://exemplo.com/img1.jpg', 'https://exemplo.com/img2.jpg'],
    features: ['Material premium', 'Garantia 1 ano'],
    promotion: '30% OFF',
    category_id: null,
    is_active: true,
    rating: 4.8,
    rating_count: '+200',
    social_proof_gender: 'feminino',
    estoque: 50,
    vender_sem_estoque: true,
    variacoes: [
      { tipo: 'Cor', nome: 'Azul', estoque: 25, preco: null, imagem: null, color_hex: '#0000FF' },
      { tipo: 'Tamanho', nome: 'M', estoque: 15, preco: 10990, imagem: null },
    ],
    avaliacoes_config: {
      nota: 4.8,
      nota_exibicao: '4,8',
      ver_mais_modo: 'funcional',
      qtd_antes_ver_mais: 3,
      usar_comentarios_padrao: true,
      avaliacoes_manuais: [
        { nome: 'Maria S.', texto: 'Adorei o produto!', nota: 5, data: '2025-01-15' },
      ],
    },
    frete_config: { tipo: 'entregue_ate', data_1: null, data_2: null },
    parcelas_fake: null,
    vendas_fake: 150,
    oferta_relampago: { ativo: false, icone: 'zap', titulo: 'Oferta Relâmpago', data_termino: null, estoque_campanha: 0 },
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// === Comment package type ===
interface PacoteComentario {
  nome: string;
  comentarios?: Array<{ nome: string; texto: string; nota: number; data: string; foto_avaliador?: string; imagens?: string[] }>;
  textos?: string[];
  origem?: 'admin' | 'loja';
}

type ViewMode = 'list' | 'editor' | 'bulk';

// === Bulk Editor Column Definitions ===
interface BulkColumn {
  key: string;
  label: string;
  default: boolean;
}

const BULK_COLUMNS: BulkColumn[] = [
  { key: 'status', label: 'Status', default: true },
  { key: 'categorias', label: 'Categorias', default: true },
  { key: 'price', label: 'Preço', default: true },
  { key: 'original_price', label: 'Preço Promocional', default: true },
  { key: 'estoque', label: 'Estoque', default: true },
  { key: 'parcelas_fake', label: 'Parcelas', default: false },
  { key: 'vendas_fake', label: 'Vendas Fake', default: false },
  { key: 'rating', label: 'Nota', default: false },
  { key: 'rating_count', label: 'Qtd Avaliações', default: false },
  { key: 'social_proof_gender', label: 'Prova Social', default: false },
  { key: 'promotion', label: 'Tag Promoção', default: false },
  { key: 'vender_sem_estoque', label: 'Vender sem Estoque', default: false },
  { key: 'badge_imagem', label: 'Badge Imagem', default: false },
];

const LojaProdutos = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: products, isLoading } = useLojaProducts(id);
  const { data: catData } = useLojaCategories(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const toggleMut = useToggleProduct();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingProduct, setEditingProduct] = useState<Partial<LojaProduct> | null>(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [saving, setSaving] = useState(false);
  const [nameWarning, setNameWarning] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [imagePickerIdx, setImagePickerIdx] = useState<number | null>(null);
  const [pacotesComentarios, setPacotesComentarios] = useState<PacoteComentario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEdits, setBulkEdits] = useState<Record<string, Partial<LojaProduct>>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkColumns, setBulkColumns] = useState<Set<string>>(new Set(['price', 'status', 'categorias']));
  const csvInputRef = useRef<HTMLInputElement>(null);

  const categories = (catData as any)?.categories || catData || [];

  // Load fretes da loja
  const { data: fretesLoja = [] } = useFretes(id);

  // Load comment packages from admin + loja
  useEffect(() => {
    const keys = ['comentarios_fake_pacotes'];
    if (id) keys.push(`comentarios_loja_${id}`);
    settingsApi.getByKeys(keys).then(settings => {
      const allPacotes: PacoteComentario[] = [];
      const adminRaw = settings.find(s => s.key === 'comentarios_fake_pacotes')?.value;
      if (adminRaw) {
        try {
          const parsed = JSON.parse(adminRaw);
          if (Array.isArray(parsed)) allPacotes.push(...parsed.map((p: any) => ({ ...p, origem: 'admin' as const })));
        } catch { /* ignore */ }
      }
      if (id) {
        const lojaRaw = settings.find(s => s.key === `comentarios_loja_${id}`)?.value;
        if (lojaRaw) {
          try {
            const parsed = JSON.parse(lojaRaw);
            if (Array.isArray(parsed)) allPacotes.push(...parsed.map((p: any) => ({ ...p, origem: 'loja' as const })));
          } catch { /* ignore */ }
        }
      }
      setPacotesComentarios(allPacotes);
    }).catch(() => {});
  }, [id]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== 'all' && (filterCat === 'none' ? p.category_id !== null : p.category_id !== filterCat)) return false;
      if (filterStatus === 'active' && !p.is_active) return false;
      if (filterStatus === 'inactive' && p.is_active) return false;
      return true;
    });
  }, [products, search, filterCat, filterStatus]);

  useEffect(() => {
    if (!editingProduct) return;
    const imgs = editingProduct.images || [];
    const vars = editingProduct.variacoes || [];
    let changed = false;
    let imgsChanged = false;
    const newImgs = [...imgs];
    const cleaned = vars.map(v => {
      if (v.imagem && !newImgs.includes(v.imagem)) {
        // Instead of removing the variation image, add it to the images array
        newImgs.push(v.imagem);
        imgsChanged = true;
      }
      return v;
    });
    if (imgsChanged) {
      setEditingProduct(prev => prev ? { ...prev, images: newImgs, image: prev.image || newImgs[0] || '' } : prev);
    }
  }, [editingProduct?.variacoes]);

  useEffect(() => {
    if (!editingProduct?.name || !products) { setNameWarning(''); return; }
    const count = products.filter(p => p.name === editingProduct.name && p._id !== editingProduct._id).length;
    if (count >= 1) setNameWarning(`Atenção: já existe ${count} produto(s) com este nome.`);
    else setNameWarning('');
  }, [editingProduct?.name, products]);

  const openNew = () => {
    if (!id) return;
    setEditingProduct(getEmptyProduct(id));
    setActiveTab('basico');
    setMode('editor');
  };

  const openEdit = (p: LojaProduct) => {
    setEditingProduct({
      ...p,
      avaliacoes_config: p.avaliacoes_config || { ...EMPTY_AVALIACAO_CONFIG },
      frete_config: p.frete_config || { tipo: 'entregue_ate', data_1: null, data_2: null },
      fretes_vinculados: (p as any).fretes_vinculados || [],
      oferta_relampago: p.oferta_relampago || { ...EMPTY_OFERTA },
      variacoes: p.variacoes || [],
      vantagens: p.vantagens || { ativo: false, itens: [] },
      protecao_cliente: p.protecao_cliente || { ativo: false, itens: [] },
      pessoas_vendo: p.pessoas_vendo || { ativo: false, min: 10, max: 50 },
      cross_sell: p.cross_sell || { modo: 'aleatorio', categoria_manual_id: null },
      social_proof_gender: p.social_proof_gender || 'desativado',
      badge_imagem: p.badge_imagem || null,
    });
    setActiveTab('basico');
    setMode('editor');
  };

  const goBack = () => { setMode('list'); setEditingProduct(null); setSelectedIds(new Set()); };

  // Item 1: Duplicate product
  const handleDuplicate = () => {
    if (!editingProduct || !id) return;
    const copy = { ...editingProduct };
    // Remove unique identifiers
    delete (copy as any)._id;
    delete (copy as any).product_id;
    delete (copy as any).slug;
    // Zero out metrics
    (copy as any).vendas_fake = 0;
    copy.name = (copy.name || '') + ' (cópia)';
    copy.loja_id = id;
    setEditingProduct(copy);
    setActiveTab('basico');
    toast({ title: 'Produto duplicado! Revise e salve.' });
  };

  // === Bulk editor helpers ===
  const toggleSelectProduct = (pid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered.length) return;
    setSelectedIds(prev => {
      const allSelected = filtered.every(p => prev.has(p._id!));
      if (allSelected) return new Set();
      return new Set(filtered.map(p => p._id!));
    });
  };

  const openBulkEditor = () => {
    if (selectedIds.size === 0) return;
    setBulkEdits({});
    setMode('bulk');
  };

  const getBulkValue = (pid: string, field: string) => {
    const edit = bulkEdits[pid];
    if (edit && field in edit) return (edit as any)[field];
    const product = products?.find(p => p._id === pid);
    return product ? (product as any)[field] : undefined;
  };

  const setBulkField = (pid: string, field: string, value: any) => {
    setBulkEdits(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [field]: value },
    }));
  };

  const hasBulkChanges = Object.keys(bulkEdits).length > 0;

  const handleBulkSave = async () => {
    setBulkSaving(true);
    try {
      const entries = Object.entries(bulkEdits);
      let ok = 0, errs = 0;
      for (const [pid, changes] of entries) {
        try {
          await updateMut.mutateAsync({ id: pid, data: changes });
          ok++;
        } catch { errs++; }
      }
      toast({ title: `${ok} produto(s) atualizado(s)${errs ? `, ${errs} erro(s)` : ''}` });
      queryClient.invalidateQueries({ queryKey: ['loja-products', id] });
      setBulkEdits({});
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct?.name) { toast({ title: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingProduct._id) {
        await updateMut.mutateAsync({ id: editingProduct._id, data: editingProduct });
        toast({ title: 'Produto atualizado!' });
      } else {
        await createMut.mutateAsync(editingProduct);
        toast({ title: 'Produto criado!' });
      }
      goBack();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: any) => {
    setEditingProduct(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const setAvalConfig = (key: string, value: any) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      return { ...prev, avaliacoes_config: { ...(prev.avaliacoes_config || EMPTY_AVALIACAO_CONFIG), [key]: value } };
    });
  };

  const setFreteConfig = (key: string, value: any) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      return { ...prev, frete_config: { ...(prev.frete_config || EMPTY_FRETE), [key]: value } };
    });
  };

  const setOferta = (key: string, value: any) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      return { ...prev, oferta_relampago: { ...(prev.oferta_relampago || EMPTY_OFERTA), [key]: value } };
    });
  };

  const addImage = (url: string) => {
    if (!url.trim()) return;
    setEditingProduct(prev => {
      if (!prev) return prev;
      const imgs = [...(prev.images || []), url.trim()];
      return { ...prev, images: imgs, image: prev.image || imgs[0] };
    });
  };

  const removeImage = (idx: number) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      const imgs = [...(prev.images || [])];
      imgs.splice(idx, 1);
      return { ...prev, images: imgs, image: imgs[0] || '' };
    });
  };

  const addVariacao = () => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      const vars = [...(prev.variacoes || []), { tipo: 'Cor', nome: '', estoque: 0, preco: null, imagem: null, color_hex: null }];
      return { ...prev, variacoes: vars };
    });
  };

  const updateVariacao = (idx: number, key: keyof Variacao, value: any) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      const vars = [...(prev.variacoes || [])];
      vars[idx] = { ...vars[idx], [key]: value };
      return { ...prev, variacoes: vars };
    });
  };

  const removeVariacao = (idx: number) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      const vars = [...(prev.variacoes || [])];
      vars.splice(idx, 1);
      return { ...prev, variacoes: vars };
    });
  };

  const addAvaliacaoManual = () => {
    setAvalConfig('avaliacoes_manuais', [
      ...(editingProduct?.avaliacoes_config?.avaliacoes_manuais || []),
      { nome: '', texto: '', nota: 5, data: new Date().toISOString().split('T')[0] },
    ]);
  };

  const updateAvaliacaoManual = (idx: number, key: keyof AvaliacaoManual, value: any) => {
    const list = [...(editingProduct?.avaliacoes_config?.avaliacoes_manuais || [])];
    list[idx] = { ...list[idx], [key]: value };
    setAvalConfig('avaliacoes_manuais', list);
  };

  const removeAvaliacaoManual = (idx: number) => {
    const list = [...(editingProduct?.avaliacoes_config?.avaliacoes_manuais || [])];
    list.splice(idx, 1);
    setAvalConfig('avaliacoes_manuais', list);
  };

  // gerarComentariosFake removed - now uses dropdown pacotes

  // === CSV handlers ===
  const handleExportCsv = () => {
    if (!products?.length) { toast({ title: 'Nenhum produto para exportar' }); return; }
    downloadFile(productsToCsv(products), `produtos-${loja?.slug || 'loja'}.csv`, 'text/csv');
  };

  const handleDownloadCsvModel = () => {
    downloadFile(csvModelTemplate(), 'modelo-produtos.csv', 'text/csv');
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast({ title: 'CSV vazio ou sem dados', variant: 'destructive' }); return; }
      const headers = parseCsvLine(lines[0]);
      let ok = 0, errs = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i]);
        const row: any = {};
        headers.forEach((h, j) => { row[h.trim()] = vals[j]?.trim() || ''; });
        try {
          const data: any = {
            loja_id: id,
            name: row.name,
            short_description: row.short_description || '',
            price: Number(row.price) || 0,
            original_price: row.original_price ? Number(row.original_price) : null,
            estoque: Number(row.estoque) || 0,
            category_id: row.category_id || null,
            is_active: row.is_active !== 'false',
            promotion: row.promotion || null,
            image: row.image || '',
            images: row.images ? row.images.split(';').filter(Boolean) : [],
          };
          if (row._id) {
            await lojaProductsApi.update(row._id, data);
          } else {
            await lojaProductsApi.create(data);
          }
          ok++;
        } catch { errs++; }
      }
      toast({ title: `Importação concluída: ${ok} ok, ${errs} erros` });
      queryClient.invalidateQueries({ queryKey: ['loja-products', id] });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // === JSON handlers ===
  const handleExportJson = () => {
    if (!editingProduct) return;
    downloadFile(JSON.stringify(editingProduct, null, 2), `produto-${editingProduct.name || 'novo'}.json`, 'application/json');
  };

  const handleDownloadJsonExample = () => {
    downloadFile(JSON.stringify(jsonExample(), null, 2), 'produto-exemplo.json', 'application/json');
  };

  const handleJsonPaste = () => {
    try {
      const data = JSON.parse(jsonText);
      // Fix: if variacoes have imagem URLs not in images array, add them
      if (data.variacoes && Array.isArray(data.variacoes)) {
        const currentImages = [...(editingProduct?.images || []), ...(data.images || [])];
        data.variacoes.forEach((v: any) => {
          if (v.imagem && !currentImages.includes(v.imagem)) {
            currentImages.push(v.imagem);
          }
        });
        data.images = [...new Set(currentImages)];
        if (!data.image && data.images.length > 0) data.image = data.images[0];
      }
      setEditingProduct(prev => prev ? { ...prev, ...data, loja_id: prev.loja_id, _id: prev._id } : prev);
      setJsonDialogOpen(false);
      setJsonText('');
      toast({ title: 'Dados preenchidos com sucesso. Revise e salve o produto.' });
    } catch {
      toast({ title: 'Código JSON inválido. Verifique a formatação.', variant: 'destructive' });
    }
  };

  // Discount calculation
  const discountPercent = useMemo(() => {
    const price = editingProduct?.price || 0;
    const original = editingProduct?.original_price || 0;
    if (original > 0 && price > 0 && price < original) {
      return Math.round(100 - (price / original) * 100);
    }
    return null;
  }, [editingProduct?.price, editingProduct?.original_price]);

  const avConfig = editingProduct?.avaliacoes_config || EMPTY_AVALIACAO_CONFIG;
  const freteConf = editingProduct?.frete_config || EMPTY_FRETE;
  const oferta = editingProduct?.oferta_relampago || EMPTY_OFERTA;

  // ============ EDITOR MODE ============
  if (mode === 'editor' && editingProduct) {
    return (
      <div>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold">{editingProduct._id ? editingProduct.name || 'Editar Produto' : 'Novo Produto'}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {editingProduct._id && (
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDuplicate}>
                <Copy className="h-4 w-4" /> Duplicar
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1" onClick={() => { setJsonText(''); setJsonDialogOpen(true); }}>
              <FileJson className="h-4 w-4" /> Importar JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportJson}>
              <FileJson className="h-4 w-4" /> Exportar JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadJsonExample}>
              <Download className="h-4 w-4" /> JSON Exemplo
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingProduct._id ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="variacoes">Variações</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="frete">Frete</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
          </TabsList>

          {/* ── TAB BÁSICO ── */}
          <TabsContent value="basico" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input placeholder="Frigobar" value={editingProduct.name || ''} onChange={e => setField('name', e.target.value)} />
                  {nameWarning && <p className="text-xs text-amber-500 mt-1">{nameWarning}</p>}
                </div>
                <div>
                  <Label>Descrição curta</Label>
                  <Input value={editingProduct.short_description || ''} onChange={e => setField('short_description', e.target.value)} />
                </div>
                <div>
                  <Label>Descrição longa</Label>
                  <Textarea rows={4} value={editingProduct.description || ''} onChange={e => setField('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço</Label>
                    <CurrencyInput value={editingProduct.price || 0} onChange={v => setField('price', v)} />
                  </div>
                  <div>
                    <Label>Preço Promocional</Label>
                    <CurrencyInput value={editingProduct.original_price || 0} onChange={v => setField('original_price', v || null)} />
                    {discountPercent !== null && (
                      <p className="text-xs text-green-600 mt-1 font-medium">Seu produto está com {discountPercent}% de desconto</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={!!editingProduct.promotion} onCheckedChange={v => setField('promotion', v ? '🔥 Em alta' : null)} />
                    <Label className="mb-0">Ativar tag de promoção</Label>
                  </div>
                  {editingProduct.promotion && (
                    <Input placeholder="🎁 55% OFF ou 🔥 Em alta" value={editingProduct.promotion} onChange={e => setField('promotion', e.target.value || null)} />
                  )}
                  <p className="text-xs text-muted-foreground">Texto livre com emojis. Aparecerá como pill de destaque no produto.</p>
                </div>
                <div>
                  <Label>Categorias</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editingProduct.category_ids || (editingProduct.category_id ? [editingProduct.category_id] : [])).map(cid => {
                      const cat = categories.find(c => c._id === cid);
                      return cat ? (
                        <Badge key={cid} variant="secondary" className="gap-1 pr-1">
                          {cat.nome}
                          <button type="button" onClick={() => {
                            const ids = (editingProduct.category_ids || []).filter(x => x !== cid);
                            setField('category_ids', ids);
                            setField('category_id', ids[0] || null);
                          }}><X className="h-3 w-3" /></button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <Select value="" onValueChange={v => {
                    if (!v) return;
                    const current = editingProduct.category_ids || (editingProduct.category_id ? [editingProduct.category_id] : []);
                    if (!current.includes(v)) {
                      const ids = [...current, v];
                      setField('category_ids', ids);
                      setField('category_id', ids[0] || null);
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Adicionar Categorias" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => !(editingProduct.category_ids || []).includes(c._id)).map(c => (
                        <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Selecione uma ou mais categorias.</p>
                </div>
                <div>
                  <Label>Estoque geral</Label>
                  <Input type="number" value={editingProduct.estoque || 0} onChange={e => setField('estoque', Number(e.target.value))} />
                </div>

                {/* Features (checkmarks) */}
                <div>
                  <Label>Destaques do produto (checkmarks)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Itens que aparecem com ✓ na seção "Sobre o produto"</p>
                  {(editingProduct.features || []).map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2 mb-1.5">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <Input
                        value={feat}
                        onChange={e => {
                          const arr = [...(editingProduct.features || [])];
                          arr[fi] = e.target.value;
                          setField('features', arr);
                        }}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        const arr = [...(editingProduct.features || [])];
                        arr.splice(fi, 1);
                        setField('features', arr);
                      }}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => setField('features', [...(editingProduct.features || []), ''])}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar destaque
                  </Button>
                </div>

                {/* Description Image */}
                <div>
                  <Label>Imagem ao fim da descrição</Label>
                  <p className="text-xs text-muted-foreground mb-2">Aparece no final da seção "Sobre o produto" com zoom ao clicar</p>
                  {editingProduct.description_image && (
                    <div className="relative mb-2">
                      <img src={editingProduct.description_image} alt="" className="w-full max-h-40 object-contain rounded-lg border border-border" />
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/80" onClick={() => setField('description_image', null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <ImageUploader
                    lojaId={id || ''}
                    onChange={(url) => setField('description_image', url)}
                    placeholder="Cole a URL ou faça upload da imagem"
                  />
                </div>
              </div>

               {/* Right column: Images with Drag-and-Drop */}
              <div className="space-y-4">
                <Label>Imagens do produto (arraste para reordenar)</Label>
                <div className="space-y-2">
                  {(editingProduct.images || []).map((img, i) => (
                    <div
                      key={`${img}-${i}`}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData('text/plain'));
                        if (isNaN(from) || from === i) return;
                        setEditingProduct(prev => {
                          if (!prev) return prev;
                          const imgs = [...(prev.images || [])];
                          const [moved] = imgs.splice(from, 1);
                          imgs.splice(i, 0, moved);
                          return { ...prev, images: imgs, image: imgs[0] || '' };
                        });
                      }}
                      className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <img src={img} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                      <span className="text-xs truncate flex-1">{img}</span>
                      {i === 0 && <Badge variant="secondary" className="text-[10px] shrink-0">Principal</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeImage(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
                <ImageUploader
                  lojaId={id || ''}
                  onChange={(url) => addImage(url)}
                  placeholder="Cole a URL ou faça upload"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── TAB VARIAÇÕES ── */}
          <TabsContent value="variacoes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Variações do produto</Label>
              <Button size="sm" onClick={addVariacao}><Plus className="h-3 w-3 mr-1" /> Nova Variação</Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingProduct.vender_sem_estoque || false} onCheckedChange={v => setField('vender_sem_estoque', v)} />
              <span className="text-sm">Vender sem estoque</span>
            </div>

            {(editingProduct.variacoes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {(editingProduct.variacoes || []).map((v, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Variação {i + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeVariacao(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={v.tipo || 'Cor'} onValueChange={val => updateVariacao(i, 'tipo', val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cor">Cor</SelectItem>
                            <SelectItem value="Tamanho">Tamanho</SelectItem>
                            <SelectItem value="Modelo">Modelo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <div className="flex gap-2">
                          <Input value={v.nome} onChange={e => updateVariacao(i, 'nome', e.target.value)} placeholder="Vermelho" className="flex-1" />
                          {v.tipo === 'Cor' && (
                            <input
                              type="color"
                              value={v.color_hex || '#000000'}
                              onChange={e => updateVariacao(i, 'color_hex', e.target.value)}
                              className="w-10 h-10 rounded border border-input cursor-pointer shrink-0"
                              title="Selecionar cor"
                            />
                          )}
                        </div>
                        {v.tipo === 'Cor' && v.color_hex && (
                          <p className="text-xs text-muted-foreground mt-1">HEX: {v.color_hex}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Estoque</Label>
                        <Input type="number" value={v.estoque} onChange={e => updateVariacao(i, 'estoque', Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">Preço (vazio = padrão)</Label>
                        <CurrencyInput value={v.preco ?? 0} onChange={val => updateVariacao(i, 'preco', val || null)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Imagem da variação</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setImagePickerIdx(i)}
                          className="w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors cursor-pointer shrink-0"
                        >
                          {v.imagem ? (
                            <img src={v.imagem} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {v.imagem ? 'Clique para trocar' : 'Clique para selecionar'}
                        </span>
                        {v.imagem && (
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateVariacao(i, 'imagem', null)}>
                            Remover
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB AVALIAÇÕES ── */}
          <TabsContent value="avaliacoes" className="space-y-4 mt-4">
            <div>
              <Label>Nota geral do produto</Label>
              <input
                type="text"
                inputMode="numeric"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                placeholder="4,7"
                value={avConfig.nota_exibicao || (avConfig.nota ? avConfig.nota.toFixed(1).replace('.', ',') : '')}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  if (!raw) {
                    setAvalConfig('nota', 0);
                    setAvalConfig('nota_exibicao', '');
                    setField('rating', 0);
                    return;
                  }
                  let num = parseInt(raw, 10) / 10;
                  if (num > 5) num = 5.0;
                  const formatted = num.toFixed(1).replace('.', ',');
                  setAvalConfig('nota', num);
                  setAvalConfig('nota_exibicao', formatted);
                  setField('rating', num);
                }}
                onKeyDown={e => { if (e.key === '.') e.preventDefault(); }}
              />
              <p className="text-xs text-muted-foreground mt-1">Digite "47" para 4,7 — valor entre 0,0 e 5,0. As estrelas seguirão essa nota.</p>
            </div>

            <div>
              <Label>Comportamento do "Ver Mais"</Label>
              <RadioGroup value={avConfig.ver_mais_modo} onValueChange={v => setAvalConfig('ver_mais_modo', v)} className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ocultar" id="vm-ocultar" />
                  <Label htmlFor="vm-ocultar" className="font-normal">Ocultar totalmente</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="funcional" id="vm-funcional" />
                  <Label htmlFor="vm-funcional" className="font-normal">Exibir e carregar mais avaliações</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="estetico" id="vm-estetico" />
                  <Label htmlFor="vm-estetico" className="font-normal">Exibir sem função (apenas estético)</Label>
                </div>
              </RadioGroup>
            </div>

            {avConfig.ver_mais_modo !== 'ocultar' && (
              <div>
                <Label>Quantidade antes do "Ver Mais"</Label>
                <Input type="number" min="1" value={avConfig.qtd_antes_ver_mais} onChange={e => setAvalConfig('qtd_antes_ver_mais', Number(e.target.value))} />
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Avaliações Manuais (Prioritárias)</Label>
                <Button size="sm" onClick={addAvaliacaoManual}><Plus className="h-3 w-3 mr-1" /> Nova</Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Estas avaliações sempre aparecem primeiro.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {(avConfig.avaliacoes_manuais || []).map((av, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Avaliação {i + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeAvaliacaoManual(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    {/* Foto do avaliador */}
                    <div className="flex items-center gap-3">
                      {(av as any).foto_avaliador ? (
                        <img src={(av as any).foto_avaliador} alt={av.nome} className="h-10 w-10 rounded-full object-cover border border-border shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Label className="text-xs">Foto do avaliador</Label>
                         <ImageUploader
                          lojaId={id || ''}
                          value={(av as any).foto_avaliador || ''}
                          onChange={(url) => updateAvaliacaoManual(i, 'foto_avaliador' as any, url)}
                          placeholder="Cole a URL aqui"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Nome" value={av.nome} onChange={e => updateAvaliacaoManual(i, 'nome', e.target.value)} />
                      <Input placeholder="Nota" type="number" step="0.1" min="0" max="5" value={av.nota} onChange={e => updateAvaliacaoManual(i, 'nota', Number(e.target.value))} />
                      <Input placeholder="Data" type="date" value={av.data} onChange={e => updateAvaliacaoManual(i, 'data', e.target.value)} />
                    </div>
                    <Textarea placeholder="Texto da avaliação..." rows={2} value={av.texto} onChange={e => updateAvaliacaoManual(i, 'texto', e.target.value)} />
                    {/* Imagens da avaliação */}
                    <div className="space-y-1">
                      <Label className="text-xs">Fotos (até 3)</Label>
                      <div className="flex gap-2 flex-wrap">
                        {(av.imagens || []).map((img, j) => (
                          <div key={j} className="relative group">
                            <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                            <button
                              type="button"
                              onClick={() => {
                                const imgs = [...(av.imagens || [])];
                                imgs.splice(j, 1);
                                updateAvaliacaoManual(i, 'imagens' as any, imgs);
                              }}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >×</button>
                          </div>
                        ))}
                      </div>
                      {(av.imagens || []).length < 3 && (
                        <ImageUploader
                          lojaId={id || ''}
                          onChange={(url) => {
                            const imgs = [...(av.imagens || []), url];
                            updateAvaliacaoManual(i, 'imagens' as any, imgs);
                          }}
                          placeholder="URL da foto ou upload"
                          className="mt-1"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div>
                <Label className="text-base font-semibold">Comentários Genéricos</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Selecione um pacote de comentários para complementar as avaliações manuais.</p>
                <Select
                  value={avConfig.pacote_comentarios || '_none'}
                  onValueChange={v => {
                    if (v === '_none') {
                      setAvalConfig('pacote_comentarios', undefined);
                      setAvalConfig('usar_comentarios_padrao', false);
                    } else {
                      setAvalConfig('pacote_comentarios', v);
                      setAvalConfig('usar_comentarios_padrao', true);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {pacotesComentarios.map((p, i) => (
                      <SelectItem key={`${p.origem}-${i}`} value={p.nome}>
                        <span className="flex items-center gap-2">
                          {p.nome}
                          <Badge variant={p.origem === 'admin' ? 'default' : 'secondary'} className="text-[10px] ml-1">
                            {p.origem === 'admin' ? 'Global' : 'Loja'}
                          </Badge>
                          <span className="text-muted-foreground text-xs">({(p.comentarios?.length || p.textos?.length || 0)})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB FRETE ── */}
          <TabsContent value="frete" className="space-y-4 mt-4">
            {/* Switch ocultar valor */}
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch
                checked={freteConf.ocultar_frete_produto || false}
                onCheckedChange={v => setFreteConfig('ocultar_frete_produto', v)}
              />
              <div>
                <p className="text-sm font-medium">Ocultar o valor do frete na página do produto</p>
                <p className="text-xs text-muted-foreground">O prazo aparecerá, mas o preço será substituído por "Calcular no checkout".</p>
              </div>
            </div>

            {/* Fretes vinculados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Fretes do Produto</Label>
                  <p className="text-xs text-muted-foreground mt-1">Vincule fretes cadastrados em /fretes. Cada frete pode ter um valor personalizado.</p>
                </div>
                <Select
                  value=""
                  onValueChange={freteId => {
                    if (!freteId) return;
                    const current = (editingProduct as any).fretes_vinculados || [];
                    if (current.some((v: any) => v.frete_id === freteId)) return;
                    setField('fretes_vinculados', [...current, { frete_id: freteId, valor_personalizado: null, exibir_no_produto: true }]);
                  }}
                >
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Adicionar Frete" /></SelectTrigger>
                  <SelectContent>
                    {fretesLoja.filter(f => f.is_active && !((editingProduct as any).fretes_vinculados || []).some((v: any) => v.frete_id === f._id)).map(f => (
                      <SelectItem key={f._id} value={f._id}>{f.nome} — {f.valor === 0 ? 'Grátis' : `R$ ${(f.valor / 100).toFixed(2).replace('.', ',')}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {((editingProduct as any).fretes_vinculados || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum frete vinculado. Adicione fretes cadastrados no menu "Fretes".</p>
              )}

              {((editingProduct as any).fretes_vinculados || []).map((vinculo: any, i: number) => {
                const freteGlobal = fretesLoja.find(f => f._id === vinculo.frete_id);
                if (!freteGlobal) return null;
                return (
                  <div key={vinculo.frete_id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{freteGlobal.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {freteGlobal.tipo === 'entregue_ate' ? 'Entregue até' : 'Receba até'} · {freteGlobal.prazo_dias_min}–{freteGlobal.prazo_dias_max} dias úteis ·
                          Valor padrão: {freteGlobal.valor === 0 ? 'Grátis' : `R$ ${(freteGlobal.valor / 100).toFixed(2).replace('.', ',')}`}
                          {!freteGlobal.is_active && <Badge variant="secondary" className="ml-2">Inativo</Badge>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Switch checked={vinculo.exibir_no_produto !== false} onCheckedChange={v => {
                            const list = [...((editingProduct as any).fretes_vinculados || [])];
                            list[i] = { ...list[i], exibir_no_produto: v };
                            setField('fretes_vinculados', list);
                          }} />
                          <span className="text-xs text-muted-foreground">Exibir</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const list = [...((editingProduct as any).fretes_vinculados || [])];
                          list.splice(i, 1);
                          setField('fretes_vinculados', list);
                        }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Valor personalizado (deixe vazio para usar o padrão)</Label>
                      <CurrencyInput
                        value={vinculo.valor_personalizado ?? 0}
                        onChange={v => {
                          const list = [...((editingProduct as any).fretes_vinculados || [])];
                          list[i] = { ...list[i], valor_personalizado: v || null };
                          setField('fretes_vinculados', list);
                        }}
                        placeholder={`Padrão: ${(freteGlobal.valor / 100).toFixed(2).replace('.', ',')}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── TAB EXTRAS ── */}
          <TabsContent value="extras" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>Exibir parcelas</Label>
                <Select value={editingProduct.parcelas_fake || '0'} onValueChange={v => setField('parcelas_fake', v === '0' ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não exibir</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x {editingProduct.price ? `de ${(editingProduct.price / 100 / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Escolha quantas parcelas exibir. O valor será calculado automaticamente.</p>
              </div>
              <div>
                <Label>Vendas fake (número)</Label>
                <Input type="number" value={editingProduct.vendas_fake || 0} onChange={e => setField('vendas_fake', Number(e.target.value))} />
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Oferta Relâmpago</Label>
                <Switch checked={oferta.ativo} onCheckedChange={v => setOferta('ativo', v)} />
              </div>
              {oferta.ativo && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Título da Oferta</Label>
                    <Input value={oferta.titulo || ''} onChange={e => setOferta('titulo', e.target.value)} placeholder="Oferta Relâmpago" />
                  </div>
                  <div>
                    <Label className="text-xs">Ícone da Oferta</Label>
                    <Select value={oferta.icone || 'zap'} onValueChange={v => setOferta('icone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zap"><span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Raio</span></SelectItem>
                        <SelectItem value="flame"><span className="flex items-center gap-2"><Flame className="h-4 w-4" /> Fogo</span></SelectItem>
                        <SelectItem value="shopping-cart"><span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Carrinho</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data/Hora de Término</Label>
                      <Input type="datetime-local" value={oferta.data_termino || ''} onChange={e => setOferta('data_termino', e.target.value || null)} />
                    </div>
                    <div>
                      <Label className="text-xs">Estoque da Campanha</Label>
                      <Input type="number" min="0" value={oferta.estoque_campanha || 0} onChange={e => setOferta('estoque_campanha', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <Label className="text-sm font-medium">Tempo Dinâmico (Evergreen)</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Se a data de término estiver vazia, o cronômetro evergreen será usado. O tempo é exclusivo por visitante.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Minutos</Label>
                        <Input type="number" min="0" value={oferta.evergreen_minutos || 0} onChange={e => setOferta('evergreen_minutos', Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">Segundos (0-59)</Label>
                        <Input type="number" min="0" max="59" value={oferta.evergreen_segundos || 0} onChange={e => setOferta('evergreen_segundos', Math.min(59, Math.max(0, Number(e.target.value))))} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vantagens do Produto */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Vantagens do Produto</Label>
                  <p className="text-xs text-muted-foreground">Até 6 características curtas (Ex: "Material Micro Expandido")</p>
                </div>
                <Switch
                  checked={editingProduct.vantagens?.ativo ?? false}
                  onCheckedChange={v => setField('vantagens', { ...(editingProduct.vantagens || { ativo: false, itens: [] }), ativo: v })}
                />
              </div>
              {editingProduct.vantagens?.ativo && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Título da seção</Label>
                    <Input
                      value={(editingProduct as any).vantagens_titulo || ''}
                      onChange={e => setField('vantagens_titulo', e.target.value || null)}
                      placeholder="Vantagens do Produto"
                    />
                  </div>
                  {(editingProduct.vantagens.itens || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <Input
                        value={item}
                        onChange={e => {
                          const itens = [...(editingProduct.vantagens?.itens || [])];
                          itens[i] = e.target.value;
                          setField('vantagens', { ...editingProduct.vantagens!, itens });
                        }}
                        placeholder={`Vantagem ${i + 1}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        const itens = [...(editingProduct.vantagens?.itens || [])];
                        itens.splice(i, 1);
                        setField('vantagens', { ...editingProduct.vantagens!, itens });
                      }}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  {(editingProduct.vantagens.itens?.length || 0) < 6 && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const itens = [...(editingProduct.vantagens?.itens || []), ''];
                      setField('vantagens', { ...editingProduct.vantagens!, itens });
                    }}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                  )}
                </div>
              )}
            </div>

            {/* Proteção do Cliente */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Proteção do Cliente</Label>
                  <p className="text-xs text-muted-foreground">Trust badges (Ex: "Devolução Gratuita", "Compra Segura")</p>
                </div>
                <Switch
                  checked={editingProduct.protecao_cliente?.ativo ?? false}
                  onCheckedChange={v => setField('protecao_cliente', { ...(editingProduct.protecao_cliente || { ativo: false, itens: [] }), ativo: v })}
                />
              </div>
              {editingProduct.protecao_cliente?.ativo && (
                <div className="space-y-2">
                  {(editingProduct.protecao_cliente.itens || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={item.icone || 'shield'} onValueChange={v => {
                        const itens = [...(editingProduct.protecao_cliente?.itens || [])];
                        itens[i] = { ...itens[i], icone: v };
                        setField('protecao_cliente', { ...editingProduct.protecao_cliente!, itens });
                      }}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shield">🛡️ Escudo</SelectItem>
                          <SelectItem value="truck">🚚 Entrega</SelectItem>
                          <SelectItem value="lock">🔒 Seguro</SelectItem>
                          <SelectItem value="refresh">🔄 Troca</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="flex-1"
                        value={item.texto}
                        onChange={e => {
                          const itens = [...(editingProduct.protecao_cliente?.itens || [])];
                          itens[i] = { ...itens[i], texto: e.target.value };
                          setField('protecao_cliente', { ...editingProduct.protecao_cliente!, itens });
                        }}
                        placeholder="Devolução Gratuita"
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        const itens = [...(editingProduct.protecao_cliente?.itens || [])];
                        itens.splice(i, 1);
                        setField('protecao_cliente', { ...editingProduct.protecao_cliente!, itens });
                      }}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  {(editingProduct.protecao_cliente.itens?.length || 0) < 4 && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const itens = [...(editingProduct.protecao_cliente?.itens || []), { icone: 'shield', texto: '' }];
                      setField('protecao_cliente', { ...editingProduct.protecao_cliente!, itens });
                    }}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                  )}
                </div>
              )}
            </div>

            {/* Pessoas Vendo Agora */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Pessoas Vendo Agora</Label>
                  <p className="text-xs text-muted-foreground">Exibe "🔥 X pessoas vendo agora" na página do produto.</p>
                </div>
                <Switch
                  checked={editingProduct.pessoas_vendo?.ativo ?? false}
                  onCheckedChange={v => setField('pessoas_vendo', { ...(editingProduct.pessoas_vendo || { ativo: false, min: 10, max: 50 }), ativo: v })}
                />
              </div>
              {editingProduct.pessoas_vendo?.ativo && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Mínimo</Label>
                    <Input type="number" min="1" value={editingProduct.pessoas_vendo.min} onChange={e => setField('pessoas_vendo', { ...editingProduct.pessoas_vendo!, min: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Máximo</Label>
                    <Input type="number" min="1" value={editingProduct.pessoas_vendo.max} onChange={e => setField('pessoas_vendo', { ...editingProduct.pessoas_vendo!, max: Number(e.target.value) })} />
                  </div>
                </div>
              )}
            </div>

            {/* Cross-Sell */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Cross-Sell (Você Também Pode Gostar)</Label>
              <Select value={editingProduct.cross_sell?.modo || 'aleatorio'} onValueChange={v => setField('cross_sell', { ...(editingProduct.cross_sell || { modo: 'aleatorio', categoria_manual_id: null }), modo: v, ...(v !== 'categoria_manual' ? { categoria_manual_id: null } : {}) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aleatorio">Aleatórios da loja</SelectItem>
                  <SelectItem value="mesma_categoria">Mesma categoria</SelectItem>
                  <SelectItem value="categoria_manual">Selecionar categoria manual</SelectItem>
                </SelectContent>
              </Select>
              {editingProduct.cross_sell?.modo === 'categoria_manual' && (
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={editingProduct.cross_sell.categoria_manual_id || ''} onValueChange={v => setField('cross_sell', { ...editingProduct.cross_sell!, categoria_manual_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Badge da Imagem */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Badge da Imagem (Card do Produto)</Label>
              <p className="text-xs text-muted-foreground">Texto curto exibido sobre a foto do produto nos cards. Ex: "-55%", "🔥 Em alta", "Novo"</p>
              <Input
                placeholder='Ex: -55%, 🔥 Em alta'
                value={editingProduct.badge_imagem || ''}
                onChange={e => setField('badge_imagem', e.target.value || null)}
              />
            </div>

            {/* Social Proof Gender */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Social Proof (Toast de Compras)</Label>
              <p className="text-xs text-muted-foreground">Exibe notificações "🔥 Fulano acabou de comprar" a cada 15-45s na página do produto.</p>
              <Select value={editingProduct.social_proof_gender || 'desativado'} onValueChange={v => setField('social_proof_gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desativado">Desativado</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editingProduct.is_active ?? true} onCheckedChange={v => setField('is_active', v)} />
              <span className="text-sm">Produto ativo</span>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingProduct._id ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
          <Button variant="outline" onClick={goBack}>Cancelar</Button>
        </div>

        {/* JSON Import Dialog */}
        <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importar Produto via JSON</DialogTitle>
              <DialogDescription>
                Cole o código JSON do produto abaixo para preencher os campos automaticamente.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              className="min-h-[300px] font-mono text-sm"
              placeholder='{"name": "Meu Produto", "price": 9990, ...}'
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setJsonDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleJsonPaste}>
                Preencher Dados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Picker Dialog for Variations */}
        <Dialog open={imagePickerIdx !== null} onOpenChange={open => { if (!open) setImagePickerIdx(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Selecionar Imagem da Variação</DialogTitle>
              <DialogDescription>
                Clique numa imagem do produto ou insira uma URL personalizada.
              </DialogDescription>
            </DialogHeader>
            {(editingProduct.images || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma imagem cadastrada. Adicione imagens na aba "Básico" primeiro.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {(editingProduct.images || []).map((img, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => {
                      if (imagePickerIdx !== null) {
                        updateVariacao(imagePickerIdx, 'imagem', img);
                        setImagePickerIdx(null);
                      }
                    }}
                    className="aspect-square rounded-lg border-2 border-border hover:border-primary overflow-hidden transition-colors cursor-pointer"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-border pt-3 mt-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Ou insira uma URL personalizada</Label>
              <form onSubmit={e => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem('customUrl') as HTMLInputElement;
                const url = input?.value?.trim();
                if (url && imagePickerIdx !== null) {
                  updateVariacao(imagePickerIdx, 'imagem', url);
                  setImagePickerIdx(null);
                }
              }} className="flex gap-2">
                <Input name="customUrl" placeholder="https://exemplo.com/imagem.jpg" className="flex-1" />
                <Button type="submit" size="sm" className="gap-1 shrink-0"><LinkIcon className="h-3 w-3" /> Usar URL</Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ BULK EDITOR MODE ============
  if (mode === 'bulk') {
    const bulkProducts = products?.filter(p => selectedIds.has(p._id!)) || [];
    const colsArray = BULK_COLUMNS.filter(c => bulkColumns.has(c.key));

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode('list')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium">Editando {bulkProducts.length} produto(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns3 className="h-4 w-4" /> Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {BULK_COLUMNS.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={bulkColumns.has(col.key)}
                    onCheckedChange={checked => {
                      setBulkColumns(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(col.key); else next.delete(col.key);
                        return next;
                      });
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" disabled={!hasBulkChanges || bulkSaving} onClick={handleBulkSave} className="gap-1.5">
              {bulkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Table with horizontal scroll */}
        <div className="flex-1 overflow-auto">
          <table className="text-xs border-collapse" style={{ minWidth: `${280 + colsArray.length * 160}px` }}>
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground border-b border-border min-w-[280px] sticky left-0 bg-muted/95 z-20">Produto</th>
                {colsArray.map(col => (
                  <th key={col.key} className="text-left px-3 py-2.5 font-medium text-muted-foreground border-b border-border min-w-[140px]">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bulkProducts.map(p => (
                <tr key={p._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  {/* Product (read-only, sticky) */}
                  <td className="px-3 py-2 border-r border-border sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2.5">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <span className="font-medium text-sm truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </td>

                  {/* Dynamic columns */}
                  {colsArray.map(col => (
                    <td key={col.key} className="px-2 py-1.5 border-r border-border">
                      {col.key === 'status' && (
                        <Switch
                          checked={getBulkValue(p._id!, 'is_active')}
                          onCheckedChange={v => setBulkField(p._id!, 'is_active', v)}
                        />
                      )}
                      {col.key === 'categorias' && (() => {
                        const currentIds: string[] = getBulkValue(p._id!, 'category_ids') || (getBulkValue(p._id!, 'category_id') ? [getBulkValue(p._id!, 'category_id')] : []);
                        return (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {currentIds.map(cid => {
                                const cat = categories.find(c => c._id === cid);
                                return cat ? (
                                  <Badge key={cid} variant="secondary" className="text-[10px] gap-0.5 pr-0.5 h-5">
                                    {cat.nome}
                                    <button type="button" onClick={() => {
                                      const ids = currentIds.filter(x => x !== cid);
                                      setBulkField(p._id!, 'category_ids', ids);
                                      setBulkField(p._id!, 'category_id', ids[0] || null);
                                    }}><X className="h-2.5 w-2.5" /></button>
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                            <Select value="" onValueChange={v => {
                              if (!v) return;
                              if (!currentIds.includes(v)) {
                                const ids = [...currentIds, v];
                                setBulkField(p._id!, 'category_ids', ids);
                                setBulkField(p._id!, 'category_id', ids[0] || null);
                              }
                            }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="+" /></SelectTrigger>
                              <SelectContent>
                                {categories.filter(c => !currentIds.includes(c._id)).map(c => (
                                  <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}
                      {col.key === 'price' && (
                        <CurrencyInput
                          value={getBulkValue(p._id!, 'price') || 0}
                          onChange={v => setBulkField(p._id!, 'price', v)}
                          className="h-8 text-xs"
                        />
                      )}
                      {col.key === 'original_price' && (
                        <CurrencyInput
                          value={getBulkValue(p._id!, 'original_price') || 0}
                          onChange={v => setBulkField(p._id!, 'original_price', v || null)}
                          className="h-8 text-xs"
                        />
                      )}
                      {col.key === 'estoque' && (
                        <Input
                          type="number"
                          className="h-8 text-xs w-20"
                          value={getBulkValue(p._id!, 'estoque') ?? 0}
                          onChange={e => setBulkField(p._id!, 'estoque', Number(e.target.value))}
                        />
                      )}
                      {col.key === 'parcelas_fake' && (
                        <Select value={getBulkValue(p._id!, 'parcelas_fake') || '0'} onValueChange={v => setBulkField(p._id!, 'parcelas_fake', v === '0' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Não exibir</SelectItem>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {col.key === 'vendas_fake' && (
                        <Input
                          type="number"
                          className="h-8 text-xs w-20"
                          value={getBulkValue(p._id!, 'vendas_fake') ?? 0}
                          onChange={e => setBulkField(p._id!, 'vendas_fake', Number(e.target.value))}
                        />
                      )}
                      {col.key === 'rating' && (
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          className="h-8 text-xs w-16"
                          value={getBulkValue(p._id!, 'rating') ?? 5}
                          onChange={e => setBulkField(p._id!, 'rating', Number(e.target.value))}
                        />
                      )}
                      {col.key === 'rating_count' && (
                        <Input
                          className="h-8 text-xs w-20"
                          value={getBulkValue(p._id!, 'rating_count') || ''}
                          onChange={e => setBulkField(p._id!, 'rating_count', e.target.value)}
                          placeholder="+100"
                        />
                      )}
                      {col.key === 'social_proof_gender' && (
                        <Select
                          value={getBulkValue(p._id!, 'social_proof_gender') || 'desativado'}
                          onValueChange={v => setBulkField(p._id!, 'social_proof_gender', v)}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desativado">Desativado</SelectItem>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="misto">Misto</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {col.key === 'promotion' && (
                        <Input
                          className="h-8 text-xs"
                          value={getBulkValue(p._id!, 'promotion') || ''}
                          onChange={e => setBulkField(p._id!, 'promotion', e.target.value || null)}
                          placeholder="🔥 Em alta"
                        />
                      )}
                      {col.key === 'vender_sem_estoque' && (
                        <Switch
                          checked={getBulkValue(p._id!, 'vender_sem_estoque') ?? true}
                          onCheckedChange={v => setBulkField(p._id!, 'vender_sem_estoque', v)}
                        />
                      )}
                      {col.key === 'badge_imagem' && (
                        <Input
                          className="h-8 text-xs"
                          value={getBulkValue(p._id!, 'badge_imagem') || ''}
                          onChange={e => setBulkField(p._id!, 'badge_imagem', e.target.value || null)}
                          placeholder="URL badge"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ============ LIST MODE ============
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produtos — {loja?.nome}</h1>
        <div className="flex gap-2 flex-wrap">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          <Button variant="outline" size="sm" className="gap-1" onClick={() => csvInputRef.current?.click()} disabled={csvImporting}>
            {csvImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadCsvModel}>
            <FileSpreadsheet className="h-4 w-4" /> Modelo CSV
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={openBulkEditor}>
              <CheckSquare className="h-4 w-4" /> Editar em Lote ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Produto</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="none">Sem categoria</SelectItem>
            {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">{products?.length ? 'Nenhum resultado' : 'Cadastre seu primeiro produto'}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {products?.length ? 'Tente alterar os filtros.' : 'Seus produtos aparecerão aqui após o cadastro.'}
          </p>
          {!products?.length && <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Produto</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every(p => selectedIds.has(p._id!))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const catName = categories.find(c => c._id === p.category_id)?.nome || 'Sem categoria';
                return (
                  <TableRow key={p._id} data-state={selectedIds.has(p._id!) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(p._id!)}
                        onCheckedChange={() => toggleSelectProduct(p._id!)}
                      />
                    </TableCell>
                    <TableCell>
                      {p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell>{p.estoque ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{catName}</TableCell>
                    <TableCell>R$ {(p.price / 100).toFixed(2).replace('.', ',')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleMut.mutate({ id: p._id!, is_active: !p.is_active })}>
                          {p.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(p._id!)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default LojaProdutos;
