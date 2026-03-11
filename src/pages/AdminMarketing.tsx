import { useState, useEffect } from 'react';
import { trackingPixelsApi, type APITrackingPixel } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Meta (Facebook)',
  tiktok: 'TikTok',
  google_ads: 'Google Ads',
};

const PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Meta (Facebook)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google_ads', label: 'Google Ads' },
];

interface PixelForm {
  platform: string;
  pixel_id: string;
  access_token: string;
  conversion_label: string;
  is_active: boolean;
}

const emptyForm: PixelForm = {
  platform: 'facebook',
  pixel_id: '',
  access_token: '',
  conversion_label: '',
  is_active: true,
};

const AdminMarketing = () => {
  const [pixels, setPixels] = useState<APITrackingPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PixelForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPixels = async () => {
    try {
      const data = await trackingPixelsApi.list();
      setPixels(data);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar pixels', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPixels(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: APITrackingPixel) => {
    setEditingId(p._id || null);
    setForm({
      platform: p.platform,
      pixel_id: p.pixel_id,
      access_token: p.access_token || '',
      conversion_label: (p as any).conversion_label || '',
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.pixel_id.trim()) {
      toast({ title: 'Erro', description: 'Preencha o Pixel ID', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        platform: form.platform,
        pixel_id: form.pixel_id.trim(),
        access_token: form.access_token.trim(),
        conversion_label: form.conversion_label.trim(),
        is_active: form.is_active,
      };
      if (editingId) {
        await trackingPixelsApi.update(editingId, payload);
        toast({ title: 'Pixel atualizado!' });
      } else {
        await trackingPixelsApi.create(payload);
        toast({ title: 'Pixel criado!' });
      }
      setDialogOpen(false);
      fetchPixels();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await trackingPixelsApi.delete(id);
      toast({ title: 'Pixel removido!' });
      fetchPixels();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await trackingPixelsApi.toggleActive(id, active);
      setPixels(prev => prev.map(p => p._id === id ? { ...p, is_active: active } : p));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Pixels globais da plataforma — rastreiam apenas as páginas institucionais do SaaS (Landing, Registro, Assinatura).
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Pixel
        </Button>
      </div>

      <div className="border border-border rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plataforma</TableHead>
              <TableHead>Pixel ID</TableHead>
              <TableHead>Conversion Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pixels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum pixel configurado. Clique em "Novo Pixel" para começar.
                </TableCell>
              </TableRow>
            ) : (
              pixels.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>
                    <Badge variant="outline">{PLATFORM_LABELS[p.platform] || p.platform}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.pixel_id}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {(p as any).conversion_label || '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) => handleToggle(p._id!, v)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p._id!)}
                      disabled={deleting === p._id}
                    >
                      {deleting === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pixel' : 'Novo Pixel Global'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Plataforma</label>
              <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Pixel ID</label>
              <Input
                value={form.pixel_id}
                onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))}
                placeholder={form.platform === 'google_ads' ? 'AW-XXXXXXXXX' : 'ID do Pixel'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Access Token (opcional)</label>
              <Input
                type="password"
                value={form.access_token}
                onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
                placeholder="Para CAPI (futuro)"
              />
            </div>
            {form.platform === 'google_ads' && (
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">Conversion Label</label>
                <Input
                  value={form.conversion_label}
                  onChange={e => setForm(f => ({ ...f, conversion_label: e.target.value }))}
                  placeholder="Ex: AbCdEfGhIjKlMn"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
              <label className="text-sm text-foreground">Ativo</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketing;
