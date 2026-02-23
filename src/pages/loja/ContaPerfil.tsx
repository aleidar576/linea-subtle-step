import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import type { ClienteEndereco } from '@/hooks/useClienteAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, MapPin, Plus, Pencil, Trash2, Star, Package, User, Lock, LogOut } from 'lucide-react';

type Tab = 'dados' | 'enderecos' | 'pedidos' | 'senha';

export default function ContaPerfil() {
  const navigate = useNavigate();
  const {
    cliente, isLoggedIn, isLoading, logout,
    atualizarPerfil, alterarSenha,
    adicionarEndereco, editarEndereco, removerEndereco, definirPadrao,
    meusPedidos,
  } = useClienteAuth();

  const [tab, setTab] = useState<Tab>('dados');
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) navigate('/conta/login?redirect=/conta');
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (tab === 'pedidos' && isLoggedIn) {
      setPedidosLoading(true);
      meusPedidos().then(p => setPedidos(p)).catch(() => {}).finally(() => setPedidosLoading(false));
    }
  }, [tab, isLoggedIn]);

  if (isLoading || !cliente) {
    return <div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const tabs = [
    { id: 'dados' as Tab, label: 'Meus Dados', icon: User },
    { id: 'enderecos' as Tab, label: 'Endereços', icon: MapPin },
    { id: 'pedidos' as Tab, label: 'Pedidos', icon: Package },
    { id: 'senha' as Tab, label: 'Senha', icon: Lock },
  ];

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar à loja
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'dados' && <DadosTab cliente={cliente} onUpdate={atualizarPerfil} />}
        {tab === 'enderecos' && (
          <EnderecosTab
            enderecos={cliente.enderecos}
            onAdd={adicionarEndereco}
            onEdit={editarEndereco}
            onRemove={removerEndereco}
            onSetDefault={definirPadrao}
          />
        )}
        {tab === 'pedidos' && <PedidosTab pedidos={pedidos} loading={pedidosLoading} />}
        {tab === 'senha' && <SenhaTab onChangePassword={alterarSenha} />}
      </div>
    </div>
  );
}

// ── Dados Tab ──
function DadosTab({ cliente, onUpdate }: { cliente: any; onUpdate: (data: any) => Promise<any> }) {
  const [form, setForm] = useState({ nome: cliente.nome, telefone: cliente.telefone, cpf: cliente.cpf, data_nascimento: cliente.data_nascimento || '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate(form);
      toast.success('Dados atualizados!');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>E-mail</Label>
        <Input value={cliente.email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado</p>
      </div>
      {[
        { name: 'nome', label: 'Nome completo' },
        { name: 'telefone', label: 'Celular' },
        { name: 'cpf', label: 'CPF' },
        { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
      ].map(f => (
        <div key={f.name}>
          <Label>{f.label}</Label>
          <Input type={f.type || 'text'} value={(form as any)[f.name]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} />
        </div>
      ))}
      <Button onClick={handleSave} disabled={loading} className="rounded-full font-bold">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar alterações
      </Button>
    </div>
  );
}

// ── Endereços Tab ──
function EnderecosTab({
  enderecos, onAdd, onEdit, onRemove, onSetDefault,
}: {
  enderecos: ClienteEndereco[];
  onAdd: (data: any) => Promise<void>;
  onEdit: (id: string, data: any) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ apelido: 'Casa', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({ apelido: 'Casa', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (end: ClienteEndereco) => {
    setForm({ apelido: end.apelido, cep: end.cep, rua: end.rua, numero: end.numero, complemento: end.complemento, bairro: end.bairro, cidade: end.cidade, estado: end.estado });
    setEditingId(end._id);
    setShowForm(true);
  };

  const handleCepChange = async (value: string) => {
    setForm(p => ({ ...p, cep: value }));
    const clean = value.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const d = await r.json();
        if (!d.erro) {
          setForm(p => ({ ...p, rua: d.logradouro || p.rua, bairro: d.bairro || p.bairro, cidade: d.localidade || p.cidade, estado: d.uf || p.estado }));
          toast.success('Endereço encontrado!');
          setTimeout(() => { (document.querySelector('input[name="end-numero"]') as HTMLInputElement)?.focus(); }, 100);
        }
      } catch {} finally { setLoadingCep(false); }
    }
  };

  const handleSave = async () => {
    if (!form.cep || !form.rua || !form.numero || !form.bairro || !form.cidade || !form.estado) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await onEdit(editingId, form);
        toast.success('Endereço atualizado!');
      } else {
        await onAdd({ ...form, padrao: enderecos.length === 0 });
        toast.success('Endereço adicionado!');
      }
      resetForm();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {enderecos.map(end => (
        <div key={end._id} className={`rounded-xl border p-4 space-y-2 ${end.padrao ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{end.apelido}</span>
              {end.padrao && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Padrão</span>}
            </div>
            <div className="flex gap-1">
              {!end.padrao && (
                <Button variant="ghost" size="sm" onClick={() => onSetDefault(end._id)}>
                  <Star className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => startEdit(end)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Remover este endereço?')) onRemove(end._id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{end.rua}, {end.numero}{end.complemento ? ` - ${end.complemento}` : ''}</p>
          <p className="text-sm text-muted-foreground">{end.bairro} - {end.cidade}/{end.estado} - CEP {end.cep}</p>
        </div>
      ))}

      {!showForm && enderecos.length < 5 && (
        <Button variant="outline" onClick={() => { resetForm(); setShowForm(true); }} className="w-full rounded-full">
          <Plus className="h-4 w-4 mr-2" /> Adicionar endereço
        </Button>
      )}

      {showForm && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-foreground">{editingId ? 'Editar endereço' : 'Novo endereço'}</h3>
          <div>
            <Label>Apelido</Label>
            <Input value={form.apelido} onChange={e => setForm(p => ({ ...p, apelido: e.target.value }))} placeholder="Ex: Casa, Trabalho" />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.cep} onChange={e => handleCepChange(e.target.value)} placeholder="00000-000" />
            {loadingCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
          </div>
          {[
            { name: 'rua', label: 'Rua' },
            { name: 'end-numero', field: 'numero', label: 'Número' },
            { name: 'complemento', label: 'Complemento' },
            { name: 'bairro', label: 'Bairro' },
            { name: 'cidade', label: 'Cidade' },
            { name: 'estado', label: 'Estado (UF)' },
          ].map(f => {
            const field = (f as any).field || f.name;
            return (
              <div key={f.name}>
                <Label>{f.label}</Label>
                <Input name={f.name} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm} className="flex-1 rounded-full">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pedidos Tab ──
function PedidosTab({ pedidos, loading }: { pedidos: any[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!pedidos.length) return <p className="text-center text-muted-foreground py-10">Nenhum pedido encontrado.</p>;

  const statusColors: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-blue-100 text-blue-800',
    enviado: 'bg-purple-100 text-purple-800',
    entregue: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-3">
      {pedidos.map((p: any) => (
        <div key={p._id} className="rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Pedido #{p.numero}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status] || 'bg-muted text-muted-foreground'}`}>
              {p.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</p>
          <p className="text-sm font-medium text-foreground">
            {(p.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          {p.rastreio && <p className="text-xs text-primary">Rastreio: {p.rastreio}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Senha Tab ──
function SenhaTab({ onChangePassword }: { onChangePassword: (atual: string, nova: string) => Promise<void> }) {
  const [form, setForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nova_senha.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    if (form.nova_senha !== form.confirmar) { toast.error('Senhas não conferem'); return; }

    setLoading(true);
    try {
      await onChangePassword(form.senha_atual, form.nova_senha);
      toast.success('Senha alterada com sucesso!');
      setForm({ senha_atual: '', nova_senha: '', confirmar: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Senha atual</Label>
        <Input type="password" value={form.senha_atual} onChange={e => setForm(p => ({ ...p, senha_atual: e.target.value }))} />
      </div>
      <div>
        <Label>Nova senha</Label>
        <Input type="password" value={form.nova_senha} onChange={e => setForm(p => ({ ...p, nova_senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
      </div>
      <div>
        <Label>Confirmar nova senha</Label>
        <Input type="password" value={form.confirmar} onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))} />
      </div>
      <Button type="submit" disabled={loading} className="rounded-full font-bold">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Alterar senha
      </Button>
    </form>
  );
}
