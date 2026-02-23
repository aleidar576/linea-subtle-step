import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useClientes, useUpdateCliente } from '@/hooks/useClientes';
import { Users, Download, Search, Mail, Edit2, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { clientesApi } from '@/services/saas-api';
import { toast } from 'sonner';
import type { ClienteData } from '@/services/saas-api';
import { useQueryClient } from '@tanstack/react-query';

function formatPrice(cents: number) { return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`; }
function formatDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }

const LojaClientes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const { data: clientes = [], isLoading } = useClientes(id, search || undefined);
  const updateCliente = useUpdateCliente();

  const [editingCliente, setEditingCliente] = useState<ClienteData | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGasto, setFilterGasto] = useState('all');
  const [filterData, setFilterData] = useState('all');

  // Add manual
  const [addOpen, setAddOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [adding, setAdding] = useState(false);

  const openEdit = (c: ClienteData) => { setEditingCliente(c); setEditNome(c.nome); setEditTelefone(c.telefone); };

  const saveEdit = () => {
    if (!editingCliente) return;
    updateCliente.mutate({ id: editingCliente._id, data: { nome: editNome, telefone: editTelefone } }, {
      onSuccess: () => { toast.success('Cliente atualizado!'); setEditingCliente(null); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleAddCliente = async () => {
    if (!newEmail.trim()) { toast.error('Email é obrigatório'); return; }
    setAdding(true);
    try {
      await clientesApi.create({ loja_id: id!, nome: newNome, email: newEmail, telefone: newTelefone, cpf: newCpf });
      toast.success('Cliente adicionado!');
      setAddOpen(false);
      setNewNome(''); setNewEmail(''); setNewTelefone(''); setNewCpf('');
      qc.invalidateQueries({ queryKey: ['clientes', id] });
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const handleRedefinirSenha = async (clienteId: string) => {
    try { await clientesApi.enviarRedefinicaoSenha(clienteId); toast.success('Email de redefinição enviado!'); }
    catch (e: any) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    let result = clientes;
    if (filterStatus === 'com_pedidos') result = result.filter(c => c.total_pedidos > 0);
    if (filterStatus === 'sem_pedidos') result = result.filter(c => c.total_pedidos === 0);
    if (filterGasto === '0-100') result = result.filter(c => c.total_gasto <= 10000);
    if (filterGasto === '100-500') result = result.filter(c => c.total_gasto > 10000 && c.total_gasto <= 50000);
    if (filterGasto === '500+') result = result.filter(c => c.total_gasto > 50000);
    if (filterData !== 'all') {
      const now = new Date();
      const days = filterData === '7d' ? 7 : filterData === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter(c => new Date(c.criado_em) >= cutoff);
    }
    return result;
  }, [clientes, filterStatus, filterGasto, filterData]);

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nenhum dado para exportar');
    const header = 'Nome,Email,Telefone,CPF,Pedidos,Total Gasto,Data Cadastro\n';
    const rows = filtered.map(c => `"${c.nome}","${c.email}","${c.telefone}","${c.cpf}",${c.total_pedidos},"${formatPrice(c.total_gasto)}","${formatDate(c.criado_em)}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes — {loja?.nome}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Adicionar</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="com_pedidos">Com pedidos</SelectItem>
            <SelectItem value="sem_pedidos">Sem pedidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterGasto} onValueChange={setFilterGasto}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Gasto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer gasto</SelectItem>
            <SelectItem value="0-100">Até R$100</SelectItem>
            <SelectItem value="100-500">R$100–500</SelectItem>
            <SelectItem value="500+">Acima R$500</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterData} onValueChange={setFilterData}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Cadastro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !filtered.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhum cliente encontrado</p>
          <p className="text-sm text-muted-foreground">Tente alterar os filtros ou adicione manualmente.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Telefone</th>
                <th className="text-left p-3 font-medium">Pedidos</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Gasto Total</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Cadastro</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3"><span className="font-medium truncate max-w-[120px]">{c.nome || '—'}</span></td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground truncate max-w-[150px]">{c.email}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.telefone || '—'}</td>
                  <td className="p-3 font-semibold">{c.total_pedidos}</td>
                  <td className="p-3 hidden sm:table-cell font-semibold">{formatPrice(c.total_gasto)}</td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDate(c.criado_em)}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Manual Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={newNome} onChange={e => setNewNome(e.target.value)} /></div>
            <div><Label>Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={newTelefone} onChange={e => setNewTelefone(e.target.value)} /></div>
            <div><Label>CPF</Label><Input value={newCpf} onChange={e => setNewCpf(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddCliente} disabled={adding}>{adding ? 'Salvando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCliente} onOpenChange={open => !open && setEditingCliente(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          {editingCliente && (
            <div className="space-y-4 mt-2">
              <div><Label>Nome</Label><Input value={editNome} onChange={e => setEditNome(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={editTelefone} onChange={e => setEditTelefone(e.target.value)} /></div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <Input value={editingCliente.email} disabled className="opacity-50" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEdit} disabled={updateCliente.isPending} className="flex-1">{updateCliente.isPending ? 'Salvando...' : 'Salvar'}</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleRedefinirSenha(editingCliente._id)}>
                  <Mail className="h-4 w-4" /> Redefinir Senha
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaClientes;
