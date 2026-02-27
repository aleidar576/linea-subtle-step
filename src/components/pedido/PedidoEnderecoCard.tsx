import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Pencil, MapPin, X, Save, Loader2 } from 'lucide-react';
import { useUpdatePedidoDados } from '@/hooks/usePedidos';
import { toast } from 'sonner';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

function maskCep(value: string): string {
  const digits = onlyDigits(value);
  return digits.replace(/(\d{5})(\d{1,3})/, '$1-$2');
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface Endereco {
  cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string;
}

interface Props {
  pedidoId: string;
  endereco: Endereco | null;
  hasClienteId: boolean;
}

export default function PedidoEnderecoCard({ pedidoId, endereco, hasClienteId }: Props) {
  const [editing, setEditing] = useState(false);
  const [cep, setCep] = useState(maskCep(endereco?.cep || ''));
  const [rua, setRua] = useState(endereco?.rua || '');
  const [numero, setNumero] = useState(endereco?.numero || '');
  const [complemento, setComplemento] = useState(endereco?.complemento || '');
  const [bairro, setBairro] = useState(endereco?.bairro || '');
  const [cidade, setCidade] = useState(endereco?.cidade || '');
  const [estado, setEstado] = useState(endereco?.estado || '');
  const [atualizarCadastro, setAtualizarCadastro] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const updateDados = useUpdatePedidoDados();

  useEffect(() => {
    setCep(maskCep(endereco?.cep || ''));
    setRua(endereco?.rua || '');
    setNumero(endereco?.numero || '');
    setComplemento(endereco?.complemento || '');
    setBairro(endereco?.bairro || '');
    setCidade(endereco?.cidade || '');
    setEstado(endereco?.estado || '');
  }, [endereco]);

  const cepDigits = onlyDigits(cep);
  const cepValid = cepDigits.length === 0 || cepDigits.length === 8;
  const canSave = cepDigits.length === 8 && rua.trim() && numero.trim() && cidade.trim() && estado;

  // Auto-busca ViaCEP
  useEffect(() => {
    if (cepDigits.length === 8 && editing) {
      setBuscandoCep(true);
      fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        .then(r => r.json())
        .then(data => {
          if (!data.erro) {
            setRua(data.logradouro || rua);
            setBairro(data.bairro || bairro);
            setCidade(data.localidade || cidade);
            setEstado(data.uf || estado);
          }
        })
        .catch(() => {})
        .finally(() => setBuscandoCep(false));
    }
  }, [cepDigits, editing]);

  const handleSave = () => {
    updateDados.mutate({
      id: pedidoId,
      data: {
        endereco: { cep: cepDigits, rua, numero, complemento, bairro, cidade, estado },
        atualizar_cadastro: atualizarCadastro,
      },
    }, {
      onSuccess: () => { toast.success('Endereço atualizado!'); setEditing(false); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleCancel = () => {
    setCep(maskCep(endereco?.cep || ''));
    setRua(endereco?.rua || '');
    setNumero(endereco?.numero || '');
    setComplemento(endereco?.complemento || '');
    setBairro(endereco?.bairro || '');
    setCidade(endereco?.cidade || '');
    setEstado(endereco?.estado || '');
    setAtualizarCadastro(false);
    setEditing(false);
  };

  return (
    <Card className="bg-secondary/50 border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Endereço de Entrega
        </CardTitle>
        {!editing && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar endereço</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!editing ? (
          endereco ? (
            <p className="text-sm">
              {endereco.rua}, {endereco.numero}
              {endereco.complemento ? ` - ${endereco.complemento}` : ''}
              <br />{endereco.bairro} — {endereco.cidade}/{endereco.estado}
              <br />CEP: {maskCep(endereco.cep)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem endereço</p>
          )
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">CEP *</Label>
              <div className="relative">
                <Input
                  value={cep}
                  onChange={e => setCep(maskCep(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                  className="h-8 text-sm"
                />
                {buscandoCep && <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {!cepValid && <p className="text-xs text-destructive mt-1">CEP deve ter 8 dígitos</p>}
            </div>
            <div>
              <Label className="text-xs">Rua *</Label>
              <Input value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua / Avenida" className="h-8 text-sm" />
              {editing && !rua.trim() && <p className="text-xs text-destructive mt-1">Campo obrigatório</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Número *</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" className="h-8 text-sm" />
                {editing && !numero.trim() && <p className="text-xs text-destructive mt-1">Obrigatório</p>}
              </div>
              <div>
                <Label className="text-xs">Complemento</Label>
                <Input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto, Bloco..." className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Bairro</Label>
              <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Cidade *</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="h-8 text-sm" />
                {editing && !cidade.trim() && <p className="text-xs text-destructive mt-1">Obrigatório</p>}
              </div>
              <div>
                <Label className="text-xs">Estado *</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editing && !estado && <p className="text-xs text-destructive mt-1">Obrigatório</p>}
              </div>
            </div>

            {hasClienteId && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="update-global-endereco"
                  checked={atualizarCadastro}
                  onCheckedChange={(c) => setAtualizarCadastro(!!c)}
                />
                <label htmlFor="update-global-endereco" className="text-xs text-muted-foreground cursor-pointer">
                  Atualizar endereço no cadastro do cliente?
                </label>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!canSave || updateDados.isPending}>
                {updateDados.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancel}>
                <X className="h-3 w-3" /> Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
