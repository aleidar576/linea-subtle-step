import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { usePixels, useCreatePixel, useUpdatePixel, useDeletePixel } from '@/hooks/useLojaExtras';
import { useLojaProducts } from '@/hooks/useLojaProducts';
import type { TrackingPixelData, ScriptCustomizado } from '@/services/saas-api';
import { lojasApi } from '@/services/saas-api';
import { Code, Plus, Pencil, Trash2, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const EVENTS_OPTIONS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'];
const TRIGGER_OPTIONS = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'categorias', label: 'Categorias' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'produtos', label: 'Produtos Específicos' },
];

const emptyPixel: Partial<TrackingPixelData> = {
  platform: 'facebook', pixel_id: '', access_token: '', events: ['PageView'],
  trigger_pages: ['homepage'], trigger_product_ids: [], is_active: true,
};

const emptyScript: ScriptCustomizado = { nome: '', local: 'head', codigo: '' };

const LojaPixels = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, refetch: refetchLoja } = useLoja(id);
  const { data: pixels, isLoading, isError } = usePixels(id);
  const { data: products } = useLojaProducts(id);
  const createMut = useCreatePixel();
  const updateMut = useUpdatePixel();
  const deleteMut = useDeletePixel();

  // Pixel state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TrackingPixelData>>(emptyPixel);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Script state
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptEditIdx, setScriptEditIdx] = useState<number | null>(null);
  const [scriptForm, setScriptForm] = useState<ScriptCustomizado>(emptyScript);
  const [savingScripts, setSavingScripts] = useState(false);

  const scripts: ScriptCustomizado[] = loja?.configuracoes?.scripts_customizados || [];

  // === Pixel handlers ===
  const openNew = () => { setEditId(null); setForm({ ...emptyPixel }); setOpen(true); };
  const openEdit = (p: TrackingPixelData) => { setEditId(p._id); setForm(p); setOpen(true); };

  const toggleEvent = (ev: string) => {
    const current = form.events || [];
    setForm({ ...form, events: current.includes(ev) ? current.filter(e => e !== ev) : [...current, ev] });
  };

  const toggleTriggerPage = (page: string) => {
    const current = form.trigger_pages || [];
    setForm({ ...form, trigger_pages: current.includes(page) ? current.filter(p => p !== page) : [...current, page] });
  };

  const toggleProductId = (pid: string) => {
    const current = form.trigger_product_ids || [];
    setForm({ ...form, trigger_product_ids: current.includes(pid) ? current.filter(p => p !== pid) : [...current, pid] });
  };

  const handleSave = async () => {
    if (!form.pixel_id?.trim()) { toast.error('Pixel ID é obrigatório'); return; }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: form });
        toast.success('Pixel atualizado');
      } else {
        await createMut.mutateAsync({ ...form, loja_id: id! } as any);
        toast.success('Pixel criado');
      }
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm);
      toast.success('Pixel excluído');
      setDeleteConfirm(null);
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const triggerLabel = (pages: string[]) => {
    if (!pages?.length) return 'Nenhum';
    return pages.map(p => TRIGGER_OPTIONS.find(o => o.value === p)?.label || p).join(', ');
  };

  // === Script handlers ===
  const openNewScript = () => { setScriptEditIdx(null); setScriptForm({ ...emptyScript }); setScriptOpen(true); };
  const openEditScript = (idx: number) => { setScriptEditIdx(idx); setScriptForm({ ...scripts[idx] }); setScriptOpen(true); };

  const saveScript = async () => {
    if (!scriptForm.nome.trim() || !scriptForm.codigo.trim()) { toast.error('Nome e código são obrigatórios'); return; }
    setSavingScripts(true);
    try {
      const updated = [...scripts];
      if (scriptEditIdx !== null) {
        updated[scriptEditIdx] = scriptForm;
      } else {
        updated.push(scriptForm);
      }
      await lojasApi.update(id!, { configuracoes: { scripts_customizados: updated } } as any);
      await refetchLoja();
      toast.success(scriptEditIdx !== null ? 'Script atualizado' : 'Script adicionado');
      setScriptOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingScripts(false); }
  };

  const deleteScript = async (idx: number) => {
    setSavingScripts(true);
    try {
      const updated = scripts.filter((_, i) => i !== idx);
      await lojasApi.update(id!, { configuracoes: { scripts_customizados: updated } } as any);
      await refetchLoja();
      toast.success('Script removido');
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingScripts(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pixels & Scripts — {loja?.nome}</h1>

      <Tabs defaultValue="pixels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pixels" className="gap-1"><Code className="h-3 w-3" /> Pixels</TabsTrigger>
          <TabsTrigger value="scripts" className="gap-1"><FileCode className="h-3 w-3" /> Scripts Customizados</TabsTrigger>
        </TabsList>

        {/* ===== ABA PIXELS ===== */}
        <TabsContent value="pixels">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Pixel</Button>
          </div>

          {isError ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-12 text-center">
              <p className="font-medium text-destructive mb-1">Erro ao carregar pixels</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Atualizar</Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : !pixels?.length ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Nenhum pixel configurado</p>
              <p className="text-sm text-muted-foreground mb-4">Adicione pixels do Facebook, TikTok, Google Ads, GTM ou outras plataformas para rastrear suas conversões.</p>
              <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Pixel</Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Pixel ID</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pixels.map(p => (
                    <TableRow key={p._id}>
                      <TableCell><Badge variant="outline">{p.platform}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{p.pixel_id}</TableCell>
                      <TableCell className="text-xs">{(p.events || []).join(', ')}</TableCell>
                      <TableCell className="text-xs">{triggerLabel(p.trigger_pages)}</TableCell>
                      <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ===== ABA SCRIPTS ===== */}
        <TabsContent value="scripts">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="gap-1" onClick={openNewScript}><Plus className="h-4 w-4" /> Novo Script</Button>
          </div>

          {!scripts.length ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Nenhum script customizado</p>
              <p className="text-sm text-muted-foreground mb-4">Cole tags de UTMify, Google Analytics, etc.</p>
              <Button size="sm" className="gap-1" onClick={openNewScript}><Plus className="h-4 w-4" /> Novo Script</Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Prévia</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scripts.map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell><Badge variant="outline">{s.local === 'head' ? 'Head' : s.local === 'body_start' ? 'Body (início)' : 'Body (fim)'}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{s.codigo.substring(0, 60)}...</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditScript(idx)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteScript(idx)} disabled={savingScripts}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Criar/Editar Pixel */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Editar Pixel' : 'Novo Pixel'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook (Meta Pixel)</SelectItem>
                  <SelectItem value="tiktok">TikTok Pixel</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="gtm">Google Tag Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.platform === 'google_ads' ? 'Conversion ID (AW-XXXXX) *' : form.platform === 'gtm' ? 'Container ID (GTM-XXXXX) *' : 'Pixel ID *'}</Label>
              <Input value={form.pixel_id || ''} onChange={e => setForm({ ...form, pixel_id: e.target.value })} placeholder={form.platform === 'google_ads' ? 'AW-123456789' : form.platform === 'gtm' ? 'GTM-XXXXXX' : '123456789'} className="font-mono" />
            </div>
            {form.platform === 'google_ads' && (
              <div>
                <Label>Conversion Label (opcional)</Label>
                <Input value={form.conversion_label || ''} onChange={e => setForm({ ...form, conversion_label: e.target.value })} placeholder="AbC123xYz" className="font-mono" />
                <p className="text-xs text-muted-foreground mt-1">Label da conversão para rastrear Purchase. Encontre em Google Ads → Ferramentas → Conversões.</p>
              </div>
            )}
            {form.platform !== 'gtm' && (
              <>
              <div>
                <Label>Access Token (opcional)</Label>
                <Input type="password" value={form.access_token || ''} onChange={e => setForm({ ...form, access_token: e.target.value })} placeholder="••••••••" />
              </div>
            <div>
              <Label className="mb-2 block">Eventos a rastrear</Label>
              <div className="flex flex-wrap gap-2">
                {EVENTS_OPTIONS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={(form.events || []).includes(ev)} onCheckedChange={() => toggleEvent(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Páginas de disparo</Label>
              <div className="flex flex-wrap gap-3">
                {TRIGGER_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={(form.trigger_pages || []).includes(opt.value)} onCheckedChange={() => toggleTriggerPage(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
              </>
            )}
            {(form.trigger_pages || []).includes('produtos') && products && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-1">
                {products.map(p => (
                  <label key={p._id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={(form.trigger_product_ids || []).includes(p._id!)} onCheckedChange={() => toggleProductId(p._id!)} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
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

      {/* Dialog Excluir Pixel */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir pixel?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar/Editar Script */}
      <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{scriptEditIdx !== null ? 'Editar Script' : 'Novo Script'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Script *</Label>
              <Input value={scriptForm.nome} onChange={e => setScriptForm({ ...scriptForm, nome: e.target.value })} placeholder="Google Analytics" />
            </div>
            <div>
              <Label>Local de Inserção</Label>
              <Select value={scriptForm.local} onValueChange={v => setScriptForm({ ...scriptForm, local: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">Head</SelectItem>
                  <SelectItem value="body_start">Body (início)</SelectItem>
                  <SelectItem value="body_end">Body (fim)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código *</Label>
              <Textarea className="font-mono text-xs" rows={8} value={scriptForm.codigo} onChange={e => setScriptForm({ ...scriptForm, codigo: e.target.value })} placeholder={'<script>\n  // Cole seu script aqui\n</script>'} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveScript} disabled={savingScripts}>{savingScripts ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaPixels;
