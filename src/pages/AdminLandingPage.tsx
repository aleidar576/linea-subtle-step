import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { adminApi, type LandingPageCMSData, type ZPatternBlock, type MiniFeature, type FAQItem } from '@/services/saas-api';
import ImageUploader from '@/components/ImageUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save, GripVertical, Image as ImageIcon, Type, Zap, HelpCircle, LayoutTemplate } from 'lucide-react';

const EMPTY_CMS: LandingPageCMSData = {
  hero: { titulo: '', subtitulo: '', ctaTexto: '', bottomTexto: '', imagemUrl: '' },
  zPatternBlocks: [],
  miniFeatures: [],
  integrations: [],
  faq: [],
};

const AdminLandingPage = () => {
  const [data, setData] = useState<LandingPageCMSData>(EMPTY_CMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    adminApi.getLandingCMS().then(cms => {
      setData({
        hero: cms.hero || EMPTY_CMS.hero,
        zPatternBlocks: cms.zPatternBlocks || [],
        miniFeatures: cms.miniFeatures || [],
        integrations: cms.integrations || [],
        faq: cms.faq || [],
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateLandingCMS(data);
      toast({ title: 'CMS salvo com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Hero helpers ──
  const updateHero = useCallback((field: string, value: string) => {
    setData(prev => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }, []);

  // ── Z-Pattern helpers ──
  const addZBlock = () => {
    setData(prev => ({
      ...prev,
      zPatternBlocks: [...prev.zPatternBlocks, { titulo: '', descricao: '', imagemUrl: '', alinhamentoImagem: 'direita' as const }],
    }));
  };
  const removeZBlock = (idx: number) => {
    setData(prev => ({ ...prev, zPatternBlocks: prev.zPatternBlocks.filter((_, i) => i !== idx) }));
  };
  const updateZBlock = (idx: number, field: keyof ZPatternBlock, value: string) => {
    setData(prev => ({
      ...prev,
      zPatternBlocks: prev.zPatternBlocks.map((b, i) => i === idx ? { ...b, [field]: value } : b),
    }));
  };

  // ── MiniFeatures helpers ──
  const addFeature = () => {
    setData(prev => ({ ...prev, miniFeatures: [...prev.miniFeatures, { iconeNome: '', titulo: '', descricao: '' }] }));
  };
  const removeFeature = (idx: number) => {
    setData(prev => ({ ...prev, miniFeatures: prev.miniFeatures.filter((_, i) => i !== idx) }));
  };
  const updateFeature = (idx: number, field: keyof MiniFeature, value: string) => {
    setData(prev => ({
      ...prev,
      miniFeatures: prev.miniFeatures.map((f, i) => i === idx ? { ...f, [field]: value } : f),
    }));
  };

  // ── Integrations helpers ──
  const addIntegration = () => {
    setData(prev => ({ ...prev, integrations: [...prev.integrations, ''] }));
  };
  const removeIntegration = (idx: number) => {
    setData(prev => ({ ...prev, integrations: prev.integrations.filter((_, i) => i !== idx) }));
  };
  const updateIntegration = (idx: number, value: string) => {
    setData(prev => ({
      ...prev,
      integrations: prev.integrations.map((url, i) => i === idx ? value : url),
    }));
  };

  // ── FAQ helpers ──
  const addFAQ = () => {
    setData(prev => ({ ...prev, faq: [...prev.faq, { pergunta: '', resposta: '' }] }));
  };
  const removeFAQ = (idx: number) => {
    setData(prev => ({ ...prev, faq: prev.faq.filter((_, i) => i !== idx) }));
  };
  const updateFAQ = (idx: number, field: keyof FAQItem, value: string) => {
    setData(prev => ({
      ...prev,
      faq: prev.faq.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Header + Save */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" />
            CMS da Landing Page
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todo o conteúdo da página inicial pública.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="hero" className="gap-1.5 text-xs"><Type className="h-3.5 w-3.5" />Hero</TabsTrigger>
          <TabsTrigger value="zpattern" className="gap-1.5 text-xs"><GripVertical className="h-3.5 w-3.5" />Blocos Z-Pattern</TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Recursos</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs"><ImageIcon className="h-3.5 w-3.5" />Integrações</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5 text-xs"><HelpCircle className="h-3.5 w-3.5" />FAQ</TabsTrigger>
        </TabsList>

        {/* ═══════════════ HERO ═══════════════ */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Seção Hero</CardTitle>
              <CardDescription>Título principal, subtítulo e chamada para ação exibidos no topo da landing page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={data.hero.titulo} onChange={e => updateHero('titulo', e.target.value)} placeholder="Sua Loja Online Profissional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Textarea value={data.hero.subtitulo} onChange={e => updateHero('subtitulo', e.target.value)} placeholder="Monte sua loja virtual completa..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do CTA</Label>
                    <Input value={data.hero.ctaTexto} onChange={e => updateHero('ctaTexto', e.target.value)} placeholder="Começar agora" />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto inferior (abaixo do CTA)</Label>
                    <Input value={data.hero.bottomTexto} onChange={e => updateHero('bottomTexto', e.target.value)} placeholder="Sem cartão de crédito necessário" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Imagem do Hero</Label>
                  <ImageUploader
                    adminMode
                    qualityProfile="banner"
                    value={data.hero.imagemUrl}
                    onChange={url => updateHero('imagemUrl', url)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ Z-PATTERN ═══════════════ */}
        <TabsContent value="zpattern">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blocos de Destaque (Z-Pattern)</CardTitle>
                <CardDescription>Seções com texto e imagem alternados.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addZBlock} className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar Bloco
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.zPatternBlocks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum bloco adicionado. Clique em "Adicionar Bloco" para começar.</p>
              )}
              {data.zPatternBlocks.map((block, idx) => (
                <Card key={idx} className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Bloco {idx + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeZBlock(idx)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input value={block.titulo} onChange={e => updateZBlock(idx, 'titulo', e.target.value)} placeholder="Gestão Simples e Poderosa" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea value={block.descricao} onChange={e => updateZBlock(idx, 'descricao', e.target.value)} placeholder="Controle pedidos, estoque e finanças..." rows={4} />
                        </div>
                        <div className="space-y-2">
                          <Label>Alinhamento da Imagem</Label>
                          <Select value={block.alinhamentoImagem} onValueChange={v => updateZBlock(idx, 'alinhamentoImagem', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="esquerda">Imagem à Esquerda</SelectItem>
                              <SelectItem value="direita">Imagem à Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Imagem</Label>
                        <ImageUploader
                          adminMode
                          qualityProfile="banner"
                          value={block.imagemUrl}
                          onChange={url => updateZBlock(idx, 'imagemUrl', url)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <TabsContent value="features">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recursos (Grid)</CardTitle>
                <CardDescription>Grid de funcionalidades com ícone, título e descrição.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFeature} className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar Recurso
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.miniFeatures.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum recurso adicionado.</p>
              )}
              {data.miniFeatures.map((feat, idx) => (
                <Card key={idx} className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Recurso {idx + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeFeature(idx)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Ícone (Lucide)</Label>
                        <Input value={feat.iconeNome} onChange={e => updateFeature(idx, 'iconeNome', e.target.value)} placeholder="shopping-cart" />
                        <p className="text-[11px] text-muted-foreground">
                          Digite o nome do ícone em inglês conforme documentação do Lucide (ex: shopping-cart, star, zap).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input value={feat.titulo} onChange={e => updateFeature(idx, 'titulo', e.target.value)} placeholder="Catálogo Ilimitado" />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input value={feat.descricao} onChange={e => updateFeature(idx, 'descricao', e.target.value)} placeholder="Cadastre quantos produtos quiser." />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ INTEGRAÇÕES ═══════════════ */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logos de Integrações</CardTitle>
                <CardDescription>Logos de parceiros e integrações exibidas em carrossel.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addIntegration} className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar Logo
              </Button>
            </CardHeader>
            <CardContent>
              {data.integrations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma logo adicionada.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.integrations.map((url, idx) => (
                  <Card key={idx} className="border-dashed">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Logo {idx + 1}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeIntegration(idx)} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <ImageUploader
                        adminMode
                        qualityProfile="standard"
                        value={url}
                        onChange={newUrl => updateIntegration(idx, newUrl)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ FAQ ═══════════════ */}
        <TabsContent value="faq">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Perguntas Frequentes</CardTitle>
                <CardDescription>Seção de dúvidas exibida no final da landing page.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFAQ} className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar Pergunta
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.faq.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma FAQ adicionada.</p>
              )}
              {data.faq.map((item, idx) => (
                <Card key={idx} className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-muted-foreground">Pergunta {idx + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeFAQ(idx)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pergunta</Label>
                        <Input value={item.pergunta} onChange={e => updateFAQ(idx, 'pergunta', e.target.value)} placeholder="Como funciona o frete?" />
                      </div>
                      <div className="space-y-2">
                        <Label>Resposta</Label>
                        <Textarea value={item.resposta} onChange={e => updateFAQ(idx, 'resposta', e.target.value)} placeholder="Integramos com os Correios e..." rows={3} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLandingPage;
