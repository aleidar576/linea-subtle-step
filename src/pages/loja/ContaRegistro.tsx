import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

// ── Masks ──
function maskCPF(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
function maskCEP(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}
function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

// ── CPF Validation ──
function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) d += parseInt(cpf[c]) * ((t + 1) - c);
    d = ((10 * d) % 11) % 10;
    if (parseInt(cpf[t]) !== d) return false;
  }
  return true;
}

const registroSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().email('E-mail inválido').regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string(),
  telefone: z.string().min(14, 'Celular inválido'),
  cpf: z.string().min(14, 'CPF inválido').refine(v => isValidCPF(v), 'CPF inválido'),
  cep: z.string().min(9, 'CEP inválido'),
  rua: z.string().min(3, 'Rua obrigatória'),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatório'),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().length(2, 'Estado inválido'),
  apelido: z.string().optional(),
}).refine(d => d.senha === d.confirmarSenha, { message: 'Senhas não conferem', path: ['confirmarSenha'] });

export default function ContaRegistro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { registro } = useClienteAuth();

  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', cpf: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', apelido: 'Casa',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'cpf') value = maskCPF(value);
    if (name === 'telefone') value = maskPhone(value);
    if (name === 'cep') value = maskCEP(value);
    if (name === 'numero') value = onlyDigits(value);
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));

    if (name === 'cep') {
      const clean = value.replace(/\D/g, '');
      if (clean.length === 8) fetchCep(clean);
    }
  };

  const fetchCep = async (cep: string) => {
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(p => ({
          ...p,
          rua: d.logradouro || p.rua,
          bairro: d.bairro || p.bairro,
          cidade: d.localidade || p.cidade,
          estado: d.uf || p.estado,
        }));
        toast.success('Endereço encontrado!');
        setTimeout(() => {
          const el = document.querySelector('input[name="numero"]') as HTMLInputElement;
          el?.focus();
        }, 100);
      } else {
        toast.error('CEP não encontrado');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = registroSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const result2 = await registro({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone,
        cpf: form.cpf,
        endereco: {
          apelido: form.apelido || 'Casa',
          cep: form.cep,
          rua: form.rua,
          numero: form.numero,
          complemento: form.complemento || '',
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        },
      });
      if (result2.pending_verification) {
        toast.success('Conta criada! Verifique seu email para ativá-la.');
        navigate(`/conta/verificar?pending=1&email=${encodeURIComponent(form.email)}`);
      } else {
        toast.success('Conta criada com sucesso!');
        navigate(redirect);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'nome', label: 'Nome completo', placeholder: 'Seu nome', type: 'text' },
    { name: 'email', label: 'E-mail', placeholder: 'seu@email.com', type: 'email' },
    { name: 'telefone', label: 'Celular', placeholder: '(11) 99999-9999', type: 'text', inputMode: 'numeric' as const },
    { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00', type: 'text', inputMode: 'numeric' as const },
    { name: 'senha', label: 'Senha', placeholder: 'Mínimo 6 caracteres', type: 'password' },
    { name: 'confirmarSenha', label: 'Confirmar senha', placeholder: '••••••', type: 'password' },
  ];

  const addressFields = [
    { name: 'apelido', label: 'Apelido do endereço', placeholder: 'Ex: Casa, Trabalho' },
    { name: 'cep', label: 'CEP', placeholder: '00000-000', inputMode: 'numeric' as const },
    { name: 'rua', label: 'Rua', placeholder: 'Rua / Avenida' },
    { name: 'numero', label: 'Número', placeholder: '123', inputMode: 'numeric' as const },
    { name: 'complemento', label: 'Complemento', placeholder: 'Apto, bloco...' },
    { name: 'bairro', label: 'Bairro', placeholder: 'Bairro' },
    { name: 'cidade', label: 'Cidade', placeholder: 'Cidade' },
    { name: 'estado', label: 'Estado (UF)', placeholder: 'SP' },
  ];

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar à loja
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Criar minha conta</h1>
          <p className="text-sm text-muted-foreground">Preencha seus dados para criar sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-semibold text-foreground">Dados pessoais</h3>
          {fields.map(f => (
            <div key={f.name}>
              <Label>{f.label}</Label>
              <Input
                name={f.name}
                type={f.type}
                value={(form as any)[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                inputMode={(f as any).inputMode}
              />
              {errors[f.name] && <p className="text-xs text-destructive mt-1">{errors[f.name]}</p>}
            </div>
          ))}

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-3">Endereço</h3>
            {addressFields.map(f => (
              <div key={f.name} className="mb-3">
                <Label>{f.label}</Label>
                <Input
                  name={f.name}
                  value={(form as any)[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  inputMode={(f as any).inputMode}
                />
                {f.name === 'cep' && loadingCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
                {errors[f.name] && <p className="text-xs text-destructive mt-1">{errors[f.name]}</p>}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full rounded-full font-bold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to={`/conta/login?redirect=${encodeURIComponent(redirect)}`} className="text-primary hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
