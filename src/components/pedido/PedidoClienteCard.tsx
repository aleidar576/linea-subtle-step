import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Pencil, User, X, Save, Loader2 } from 'lucide-react';
import { useUpdatePedidoDados } from '@/hooks/usePedidos';
import { toast } from 'sonner';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

function maskCpfCnpj(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

interface Props {
  pedidoId: string;
  cliente: { nome: string; email: string; telefone: string; cpf: string };
  hasClienteId: boolean;
}

export default function PedidoClienteCard({ pedidoId, cliente, hasClienteId }: Props) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(cliente.nome || '');
  const [email, setEmail] = useState(cliente.email || '');
  const [telefone, setTelefone] = useState(maskTelefone(cliente.telefone || ''));
  const [cpf, setCpf] = useState(maskCpfCnpj(cliente.cpf || ''));
  const [atualizarCadastro, setAtualizarCadastro] = useState(false);

  const updateDados = useUpdatePedidoDados();

  useEffect(() => {
    setNome(cliente.nome || '');
    setEmail(cliente.email || '');
    setTelefone(maskTelefone(cliente.telefone || ''));
    setCpf(maskCpfCnpj(cliente.cpf || ''));
  }, [cliente]);

  const cpfDigits = onlyDigits(cpf);
  const telDigits = onlyDigits(telefone);

  const cpfValid = cpfDigits.length === 0 || cpfDigits.length === 11 || cpfDigits.length === 14;
  const telValid = telDigits.length === 0 || telDigits.length >= 10;
  const nomeValid = nome.trim().length > 0;
  const canSave = nomeValid && cpfValid && telValid;

  const handleSave = () => {
    updateDados.mutate({
      id: pedidoId,
      data: {
        cliente: { nome: nome.trim(), email, telefone: onlyDigits(telefone), cpf: onlyDigits(cpf) },
        atualizar_cadastro: atualizarCadastro,
      },
    }, {
      onSuccess: () => { toast.success('Dados do cliente atualizados!'); setEditing(false); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleCancel = () => {
    setNome(cliente.nome || '');
    setEmail(cliente.email || '');
    setTelefone(maskTelefone(cliente.telefone || ''));
    setCpf(maskCpfCnpj(cliente.cpf || ''));
    setAtualizarCadastro(false);
    setEditing(false);
  };

  return (
    <Card className="bg-secondary/50 border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" /> Cliente
        </CardTitle>
        {!editing && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar dados do cliente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!editing ? (
          <div className="text-sm space-y-1.5">
            <p className="font-medium">{cliente.nome || '—'}</p>
            <p className="text-muted-foreground">{cliente.email || '—'}</p>
            <p className="text-muted-foreground">{cliente.telefone ? maskTelefone(cliente.telefone) : '—'}</p>
            <p className="text-muted-foreground">CPF: {cliente.cpf ? maskCpfCnpj(cliente.cpf) : '—'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className="h-8 text-sm" />
              {!nomeValid && <p className="text-xs text-destructive mt-1">Nome obrigatório</p>}
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} readOnly disabled className="h-8 text-sm opacity-60" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={telefone}
                onChange={e => setTelefone(maskTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="h-8 text-sm"
              />
              {!telValid && <p className="text-xs text-destructive mt-1">Telefone inválido (mín. 10 dígitos)</p>}
            </div>
            <div>
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input
                value={cpf}
                onChange={e => setCpf(maskCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={18}
                className="h-8 text-sm"
              />
              {!cpfValid && <p className="text-xs text-destructive mt-1">CPF deve ter 11 dígitos ou CNPJ 14</p>}
            </div>

            {hasClienteId && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="update-global-cliente"
                  checked={atualizarCadastro}
                  onCheckedChange={(c) => setAtualizarCadastro(!!c)}
                />
                <label htmlFor="update-global-cliente" className="text-xs text-muted-foreground cursor-pointer">
                  Atualizar dados no cadastro global do cliente?
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
