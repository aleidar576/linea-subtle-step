import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja, useUpdateLoja } from '@/hooks/useLojas';
import { useToast } from '@/hooks/use-toast';
import type { LojaIntegracoes as IntegracoesTipo } from '@/services/saas-api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as DialogTitle,
  AlertDialogDescription as DialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Truck, PackageCheck, ExternalLink, Eye, EyeOff, Loader2, AlertTriangle, Blocks, Info } from 'lucide-react';

// ============================================
// 📦 Integrations Hub — App Store Style
// ============================================

const INTEGRATIONS = [
  {
    id: 'melhor_envio' as const,
    name: 'Melhor Envio',
    description: 'Cálculo de frete automático e geração de etiquetas com descontos exclusivos.',
    icon: Truck,
    helpUrl: 'https://melhorenvio.com.br',
  },
  {
    id: 'kangu' as const,
    name: 'Kangu',
    description: 'Plataforma de envios com cotação multi-transportadora e coleta grátis.',
    icon: PackageCheck,
    helpUrl: 'https://www.kangu.com.br',
  },
] as const;

type IntegrationId = typeof INTEGRATIONS[number]['id'];

// Defaults for each integration
const DEFAULTS: Record<IntegrationId, any> = {
  melhor_envio: { ativo: false, token: '', sandbox: true },
  kangu: { ativo: false, token: '' },
};

export default function LojaIntegracoes() {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const updateLoja = useUpdateLoja();
  const { toast } = useToast();

  const [activeSheet, setActiveSheet] = useState<IntegrationId | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCepConfirm, setShowCepConfirm] = useState(false);

  const hasStoreCep = !!loja?.configuracoes?.endereco?.cep;

  // Load integration data into sheet when opening
  useEffect(() => {
    if (activeSheet && loja) {
      const current = loja.configuracoes?.integracoes?.[activeSheet];
      setSheetData({ ...DEFAULTS[activeSheet], ...current });
      setShowToken(false);
    }
  }, [activeSheet, loja]);

  const doSave = async () => {
    if (!activeSheet || !id) return;
    setSaving(true);
    try {
      const currentIntegracoes: IntegracoesTipo = loja?.configuracoes?.integracoes || {};
      const merged = { ...currentIntegracoes, [activeSheet]: sheetData };

      await updateLoja.mutateAsync({
        id,
        data: { configuracoes: { integracoes: merged } } as any,
      });
      toast({ title: 'Integração salva com sucesso!' });
      setActiveSheet(null);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (activeSheet === 'melhor_envio' && sheetData?.ativo && !hasStoreCep) {
      setShowCepConfirm(true);
      return;
    }
    await doSave();
  };

  const getStatus = (integrationId: IntegrationId) => {
    return loja?.configuracoes?.integracoes?.[integrationId]?.ativo ?? false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loja não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Blocks className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        </div>
        <p className="text-muted-foreground">
          Conecte sua loja a serviços externos de logística e ferramentas.
        </p>
      </div>

      {/* Grid de Apps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((integration) => {
          const isActive = getStatus(integration.id);
          const Icon = integration.icon;

          return (
            <Card
              key={integration.id}
              className="group relative overflow-hidden border-border/60 hover:border-primary/50 transition-colors"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                </div>
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className={isActive
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'bg-muted text-muted-foreground'}
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardHeader>

              <CardContent className="pb-4">
                <CardDescription className="text-sm leading-relaxed">
                  {integration.description}
                </CardDescription>
              </CardContent>

              {/* Banner CEP ausente no card */}
              {integration.id === 'melhor_envio' && isActive && !hasStoreCep && (
                <Alert variant="destructive" className="mx-6 mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>Falta o CEP no cadastro da loja. Vá em Perfil da Loja.</AlertDescription>
                </Alert>
              )}

              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setActiveSheet(integration.id)}
                >
                  Configurar
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Sheet Lateral de Configuração */}
      <Sheet open={!!activeSheet} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent className="z-[60] sm:max-w-md overflow-y-auto">
          {activeSheet && sheetData && (
            <>
              <SheetHeader className="pb-6">
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const integration = INTEGRATIONS.find(i => i.id === activeSheet)!;
                    const Icon = integration.icon;
                    return (
                      <>
                        <Icon className="h-5 w-5 text-primary" />
                        {integration.name}
                      </>
                    );
                  })()}
                </SheetTitle>
                <SheetDescription>
                  Configure as credenciais e ative a integração.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Switch Ativar */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Ativar Integração</Label>
                    <p className="text-xs text-muted-foreground">
                      Habilita esta integração na sua loja.
                    </p>
                  </div>
                  <Switch
                    checked={sheetData.ativo}
                    onCheckedChange={(v) => setSheetData({ ...sheetData, ativo: v })}
                  />
                </div>

                {/* Banner CEP ausente no sheet */}
                {activeSheet === 'melhor_envio' && sheetData.ativo && !hasStoreCep && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                      Falta o CEP no cadastro da loja (Vá em Perfil da Loja). A integração não calculará fretes sem essa informação.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Melhor Envio: Sandbox toggle */}
                {activeSheet === 'melhor_envio' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Modo de Teste (Sandbox)</Label>
                        <p className="text-xs text-muted-foreground">
                          Usa o ambiente de testes do Melhor Envio.
                        </p>
                      </div>
                      <Switch
                        checked={sheetData.sandbox}
                        onCheckedChange={(v) => setSheetData({ ...sheetData, sandbox: v })}
                      />
                    </div>
                    {sheetData.sandbox && (
                      <Alert className="border-destructive/30 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-xs text-destructive">
                          Sandbox ativo. Use tokens do ambiente de teste.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Token Input */}
                <div className="space-y-2">
                  <Label htmlFor="token">Token de Acesso</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? 'text' : 'password'}
                      placeholder="Cole seu token aqui..."
                      value={sheetData.token}
                      onChange={(e) => setSheetData({ ...sheetData, token: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeSheet === 'melhor_envio'
                      ? 'Token Bearer gerado no painel do Melhor Envio.'
                      : 'Token de acesso gerado no painel da Kangu.'}
                  </p>
                </div>

                {/* Help link */}
                {(() => {
                  const integration = INTEGRATIONS.find(i => i.id === activeSheet)!;
                  return (
                    <a
                      href={integration.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Como obter minhas credenciais?
                    </a>
                  );
                })()}

                {/* Alerta de peso padrão — apenas Melhor Envio */}
                {activeSheet === 'melhor_envio' && (
                  <Alert className="bg-muted/50 border-border mt-4">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <AlertDescription className="text-xs text-muted-foreground">
                      <strong>Importante:</strong> Produtos cadastrados na sua loja sem peso ou dimensões informadas
                      utilizarão o padrão mínimo aceito pelas transportadoras (300g, 16×11×2 cm) para que o cálculo
                      de frete não falhe no checkout.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save Button */}
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Configurações
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* AlertDialog de confirmação CEP ausente */}
      <AlertDialog open={showCepConfirm} onOpenChange={setShowCepConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>CEP de origem não cadastrado</DialogTitle>
            <DialogDescription>
              O CEP de origem da sua loja não está cadastrado em Perfil da Loja. Deseja ativar a integração mesmo assim? O cálculo automático não funcionará corretamente sem o CEP.
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCepConfirm(false); doSave(); }}>
              Ativar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
