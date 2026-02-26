import { useState, useEffect, useRef } from 'react';
import { GATEWAYS, type GatewayDefinition } from '@/config/gateways';
import { adminApi, type GatewayPlatformConfig, type GatewayPlatformRecord } from '@/services/saas-api';
import { settingsApi } from '@/services/api';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, CreditCard, Pencil, Save, Upload, X, Copy, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminGateways = () => {
  const [configs, setConfigs] = useState<GatewayPlatformRecord>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editGw, setEditGw] = useState<GatewayDefinition | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');

  useEffect(() => {
    adminApi.getGatewaysPlataforma()
      .then(setConfigs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveConfigs = async (newConfigs: GatewayPlatformRecord) => {
    setSaving(true);
    try {
      await adminApi.updateGatewaysPlataforma(newConfigs);
      setConfigs(newConfigs);
      toast({ title: 'Configuração salva' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (gatewayId: string, checked: boolean) => {
    const current: GatewayPlatformConfig = configs[gatewayId] || { ativo: false };
    const newConfigs = { ...configs, [gatewayId]: { ...current, ativo: checked } };
    saveConfigs(newConfigs);
  };

  const openEditDialog = (gw: GatewayDefinition) => {
    const current: GatewayPlatformConfig = configs[gw.id] || { ativo: false };
    setEditGw(gw);
    setEditNome(current.nome || '');
    setEditLogo(current.logo_url || '');
    setEditDescricao(current.descricao || '');
  };

  const handleSaveEdit = () => {
    if (!editGw) return;
    const current = configs[editGw.id] || { ativo: false };
    const newConfigs = {
      ...configs,
      [editGw.id]: {
        ...current,
        nome: editNome.trim() || undefined,
        logo_url: editLogo.trim() || undefined,
        descricao: editDescricao.trim() || undefined,
      },
    };
    saveConfigs(newConfigs);
    setEditGw(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Gateways de Pagamento</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Habilite ou desabilite gateways disponíveis para todos os lojistas do SaaS.
      </p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-3 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Logo</span>
          <span>Gateway</span>
          <span>Métodos</span>
          <span>Editar</span>
          <span>Ativo</span>
        </div>
        {GATEWAYS.map(gw => {
          const cfg = configs[gw.id] || { ativo: false };
          const isEnabled = !!cfg.ativo;
          const displayName = cfg.nome || gw.nome;
          const displayLogo = cfg.logo_url || gw.logo_url;
          const displayDesc = cfg.descricao || gw.descricao;

          return (
            <div key={gw.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 border-b border-border last:border-0">
              <img src={displayLogo} alt={displayName} className="h-8 w-8 rounded object-contain bg-muted p-1" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{displayName}</span>
                  {gw.tag && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{gw.tag}</Badge>}
                  {cfg.nome && <Badge variant="outline" className="text-[9px] px-1 py-0">Customizado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{displayDesc}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {gw.metodos.map(m => (
                  <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(gw)} disabled={saving}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(gw.id, checked)}
                disabled={saving}
              />
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editGw} onOpenChange={(open) => !open && setEditGw(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gateway — {editGw?.nome}</DialogTitle>
            <DialogDescription>Personalize o nome, logo e descrição que os lojistas verão. Deixe em branco para usar o padrão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Nome personalizado</Label>
              <Input placeholder={editGw?.nome} value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Logo do Gateway</Label>
              <div className="flex items-center gap-3 mt-1">
                {editLogo ? (
                  <div className="relative">
                    <img src={editLogo} alt="preview" className="h-12 w-12 rounded object-contain bg-muted p-1 border border-border" />
                    <button onClick={() => setEditLogo('')} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded bg-muted border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 w-fit"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Enviando...' : 'Enviar imagem'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB', variant: 'destructive' });
                        return;
                      }
                      setUploading(true);
                      try {
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result as string;
                          const { url } = await settingsApi.adminUpload(base64);
                          setEditLogo(url);
                          toast({ title: 'Imagem enviada!' });
                          setUploading(false);
                        };
                        reader.readAsDataURL(file);
                      } catch (err: any) {
                        toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
                        setUploading(false);
                      }
                    }}
                  />
                  <Input
                    placeholder="Ou cole uma URL"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <Input placeholder={editGw?.descricao} value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
            </div>

            {/* Appmax-specific: Integration URLs */}
            {editGw?.id === 'appmax' && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-primary" />
                  URLs de Integração do App
                </div>
                <p className="text-xs text-muted-foreground">
                  Copie estas URLs e cole no painel de desenvolvedor da Appmax ao criar o seu Aplicativo.
                </p>
                {[
                  { label: 'Host (Webhook)', value: `${window.location.origin}/api/loja-extras?scope=appmax-webhook` },
                  { label: 'URL do Sistema', value: window.location.origin },
                  { label: 'URL de Validação', value: `${window.location.origin}/api/loja-extras?scope=appmax-install` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={value} readOnly className="font-mono text-[11px] h-8 bg-muted" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(value);
                          toast({ title: 'URL copiada!' });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGw(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGateways;
