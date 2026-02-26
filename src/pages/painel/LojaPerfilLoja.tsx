import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja, useUpdateLoja } from '@/hooks/useLojas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Building2, MapPin, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ImageUploader';
import type { LojaEmpresa, LojaEndereco } from '@/services/saas-api';

// === Masks ===
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const emptyEmpresa: LojaEmpresa = {
  tipo_documento: '', documento: '', razao_social: '', email_suporte: '', telefone: '',
};

const emptyEndereco: LojaEndereco = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
};

const LojaPerfilLoja = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja, isLoading } = useLoja(id);
  const updateLoja = useUpdateLoja();
  const { toast } = useToast();

  const [nome, setNome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [slogan, setSlogan] = useState('');
  const [favicon, setFavicon] = useState('');
  const [empresa, setEmpresa] = useState<LojaEmpresa>({ ...emptyEmpresa });
  const [endereco, setEndereco] = useState<LojaEndereco>({ ...emptyEndereco });
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    if (!loja) return;
    setNome(loja.nome || '');
    setNomeExibicao(loja.nome_exibicao || '');
    setSlogan((loja as any).slogan || '');
    setFavicon(loja.favicon || '');
    setEmpresa({ ...emptyEmpresa, ...loja.configuracoes?.empresa });
    setEndereco({ ...emptyEndereco, ...loja.configuracoes?.endereco });
  }, [loja]);

  const fetchCep = async (cep: string) => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch { /* silent */ } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (v: string) => {
    const masked = maskCEP(v);
    setEndereco(prev => ({ ...prev, cep: masked }));
    if (onlyDigits(v).length === 8) fetchCep(v);
  };

  const handleDocumentoChange = (v: string) => {
    const mask = empresa.tipo_documento === 'cnpj' ? maskCNPJ : maskCPF;
    setEmpresa(prev => ({ ...prev, documento: mask(v) }));
  };

  const handleTelefoneChange = (v: string) => {
    setEmpresa(prev => ({ ...prev, telefone: maskPhone(v) }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Strip masks before saving
      const empresaClean = {
        ...empresa,
        documento: onlyDigits(empresa.documento),
        telefone: onlyDigits(empresa.telefone),
      };
      const enderecoClean = {
        ...endereco,
        cep: onlyDigits(endereco.cep),
      };

      await updateLoja.mutateAsync({
        id,
        data: {
          nome,
          nome_exibicao: nomeExibicao,
          slogan,
          favicon,
          configuracoes: {
            empresa: empresaClean,
            endereco: enderecoClean,
          },
        } as any,
      });
      toast({ title: 'Perfil da loja salvo!', description: 'Alterações aplicadas com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!loja) return <p className="text-muted-foreground">Loja não encontrada.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil da Loja — {loja.nome}</h1>

      {/* Card 1 — Identidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Identidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome Interno da Loja</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da loja" />
          </div>
          <div>
            <Label>Nome Externo da Loja</Label>
            <Input value={nomeExibicao} onChange={e => setNomeExibicao(e.target.value)} placeholder="Nome exibido na vitrine e aba do navegador" />
            <p className="text-xs text-muted-foreground mt-1">Este nome aparece no header da loja e na aba do navegador.</p>
          </div>
          <div>
            <Label>Slogan da Loja</Label>
            <Input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Ex: As melhores ofertas para você" />
            <p className="text-xs text-muted-foreground mt-1">Aparece na aba do navegador junto ao nome da loja.</p>
          </div>
          <div>
            <Label>Favicon</Label>
            <ImageUploader lojaId={id || ''} value={favicon} onChange={(url) => setFavicon(url)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>País</Label>
            <Input value="Brasil" disabled className="bg-muted cursor-not-allowed" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={empresa.tipo_documento || ''} onValueChange={v => setEmpresa(prev => ({ ...prev, tipo_documento: v, documento: '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">Pessoa Física</SelectItem>
                <SelectItem value="cnpj">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {empresa.tipo_documento && (
            <div>
              <Label>{empresa.tipo_documento === 'cnpj' ? 'CNPJ' : 'CPF'}</Label>
              <Input
                value={empresa.documento}
                onChange={e => handleDocumentoChange(e.target.value)}
                placeholder={empresa.tipo_documento === 'cnpj' ? 'Ex: 12.345.678/0001-90' : 'Ex: 123.456.789-00'}
              />
            </div>
          )}
          <div>
            <Label>{empresa.tipo_documento === 'cnpj' ? 'Razão Social' : 'Nome Completo'}</Label>
            <Input value={empresa.razao_social} onChange={e => setEmpresa(prev => ({ ...prev, razao_social: e.target.value }))} placeholder={empresa.tipo_documento === 'cnpj' ? 'Razão social da empresa' : 'Nome completo do responsável'} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={empresa.telefone}
              onChange={e => handleTelefoneChange(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
          <div>
            <Label>E-mail de Suporte</Label>
            <Input
              type="email"
              value={empresa.email_suporte}
              onChange={e => setEmpresa(prev => ({ ...prev, email_suporte: e.target.value }))}
              placeholder="suporte@minhaloja.com.br"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Endereço de Origem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Endereço de Origem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={endereco.cep}
                onChange={e => handleCepChange(e.target.value)}
                placeholder="Ex: 01001-000"
              />
              {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Logradouro</Label>
              <Input value={endereco.logradouro} onChange={e => setEndereco(prev => ({ ...prev, logradouro: e.target.value }))} placeholder="Rua, Avenida..." />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={endereco.numero} onChange={e => setEndereco(prev => ({ ...prev, numero: e.target.value }))} placeholder="Nº" />
            </div>
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={endereco.complemento} onChange={e => setEndereco(prev => ({ ...prev, complemento: e.target.value }))} placeholder="Sala, bloco, apto..." />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={endereco.bairro} onChange={e => setEndereco(prev => ({ ...prev, bairro: e.target.value }))} placeholder="Bairro" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cidade</Label>
              <Input value={endereco.cidade} onChange={e => setEndereco(prev => ({ ...prev, cidade: e.target.value }))} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Select value={endereco.estado || ''} onValueChange={v => setEndereco(prev => ({ ...prev, estado: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {UF_LIST.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Perfil da Loja
      </Button>
    </div>
  );
};

export default LojaPerfilLoja;
