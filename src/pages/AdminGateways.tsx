import { useState, useEffect } from 'react';
import { GATEWAYS } from '@/config/gateways';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async res => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  });
}

const AdminGateways = () => {
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    adminRequest<string[]>('/settings?scope=gateways-plataforma')
      .then(setEnabledIds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (gatewayId: string, checked: boolean) => {
    const newIds = checked
      ? [...enabledIds, gatewayId]
      : enabledIds.filter(id => id !== gatewayId);

    setSaving(true);
    try {
      await adminRequest('/settings?scope=gateways-plataforma', {
        method: 'PATCH',
        body: JSON.stringify({ gateways_ativos: newIds }),
      });
      setEnabledIds(newIds);
      toast({ title: checked ? 'Gateway habilitado' : 'Gateway desabilitado' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Gateways de Pagamento</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Habilite ou desabilite gateways disponíveis para todos os lojistas do SaaS.
      </p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Logo</span>
          <span>Gateway</span>
          <span>Métodos</span>
          <span>Ativo</span>
        </div>
        {GATEWAYS.map(gw => {
          const isEnabled = enabledIds.includes(gw.id);
          return (
            <div key={gw.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-4 border-b border-border last:border-0">
              <img src={gw.logo_url} alt={gw.nome} className="h-8 w-8 rounded object-contain bg-muted p-1" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{gw.nome}</span>
                  {gw.tag && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{gw.tag}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{gw.descricao}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {gw.metodos.map(m => (
                  <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                ))}
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(gw.id, checked)}
                disabled={saving}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminGateways;
