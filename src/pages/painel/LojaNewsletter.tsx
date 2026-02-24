import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useLeads, useUpdateLead, useDeleteLead, useImportLeads } from '@/hooks/useLojaExtras';
import { Mail, Search, Download, Upload, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { LeadData } from '@/services/saas-api';

const LojaNewsletter = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: leads = [], isLoading } = useLeads(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const importLeads = useImportLeads();

  const [search, setSearch] = useState('');
  const [origemFilter, setOrigemFilter] = useState('todos');
  const [vinculoFilter, setVinculoFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editLead, setEditLead] = useState<LeadData | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importOrigem, setImportOrigem] = useState<'POPUP' | 'FOOTER'>('POPUP');

  const filtered = useMemo(() => {
    let list = leads;
    if (search) list = list.filter(l => l.email.includes(search.toLowerCase()));
    if (origemFilter !== 'todos') list = list.filter(l => l.origem === origemFilter);
    if (vinculoFilter !== 'todos') list = list.filter(l => (vinculoFilter === 'cliente' ? l.vinculo === 'Cliente Cadastrado' : l.vinculo === 'Visitante'));
    if (dateFilter !== 'todos') {
      const days = parseInt(dateFilter);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(l => new Date(l.criado_em) >= cutoff);
    }
    return list;
  }, [leads, search, origemFilter, vinculoFilter, dateFilter]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l._id)));
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Excluir este lead?')) return;
    try { await deleteLead.mutateAsync(leadId); toast.success('Lead excluído'); } catch { toast.error('Erro'); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selected.size} leads?`)) return;
    for (const leadId of selected) { await deleteLead.mutateAsync(leadId); }
    setSelected(new Set());
    toast.success('Leads excluídos');
  };

  const handleEditSave = async () => {
    if (!editLead) return;
    try {
      await updateLead.mutateAsync({ id: editLead._id, data: { email: editEmail } });
      toast.success('E-mail atualizado');
      setEditLead(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleImport = async () => {
    const emails = importText.split('\n').map(e => e.trim()).filter(Boolean);
    if (!emails.length || !id) return;
    try {
      const r = await importLeads.mutateAsync({ lojaId: id, emails, origem: importOrigem });
      toast.success(`${r.inseridos} e-mails importados`);
      setImportOpen(false); setImportText('');
    } catch { toast.error('Erro na importação'); }
  };

  const exportCSV = () => {
    const header = 'Email,Origem,Data,Vinculo\n';
    const rows = filtered.map(l => `${l.email},${l.origem},${new Date(l.criado_em).toLocaleDateString('pt-BR')},${l.vinculo || 'Visitante'}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'newsletter.csv'; a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Newsletter — {loja?.nome}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}><Upload className="h-3 w-3" /> Importar</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}><Download className="h-3 w-3" /> Exportar CSV</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por e-mail..." className="pl-9" />
        </div>
        <Select value={origemFilter} onValueChange={setOrigemFilter}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas origens</SelectItem><SelectItem value="POPUP">Popup</SelectItem><SelectItem value="FOOTER">Footer</SelectItem></SelectContent></Select>
        <Select value={vinculoFilter} onValueChange={setVinculoFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos vínculos</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="visitante">Visitante</SelectItem></SelectContent></Select>
        <Select value={dateFilter} onValueChange={setDateFilter}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Qualquer data</SelectItem><SelectItem value="7">7 dias</SelectItem><SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem></SelectContent></Select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selected.size} selecionados</span>
          <Button variant="destructive" size="sm" className="gap-1" onClick={handleBulkDelete}><Trash2 className="h-3 w-3" /> Excluir selecionados</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum lead encontrado</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="p-3 text-left font-medium">E-mail</th>
                <th className="p-3 text-left font-medium">Origem</th>
                <th className="p-3 text-left font-medium">Data</th>
                <th className="p-3 text-left font-medium">Vínculo</th>
                <th className="p-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead._id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={selected.has(lead._id)} onCheckedChange={() => { const s = new Set(selected); s.has(lead._id) ? s.delete(lead._id) : s.add(lead._id); setSelected(s); }} /></td>
                  <td className="p-3 font-medium">{lead.email}</td>
                  <td className="p-3"><Badge variant={lead.origem === 'POPUP' ? 'default' : 'secondary'}>{lead.origem}</Badge></td>
                  <td className="p-3 text-muted-foreground">{new Date(lead.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3"><Badge variant={lead.vinculo === 'Cliente Cadastrado' ? 'default' : 'outline'}>{lead.vinculo || 'Visitante'}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditLead(lead); setEditEmail(lead.email); }}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(lead._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar E-mail</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="novo@email.com" />
            <Button className="w-full" onClick={handleEditSave} disabled={updateLead.isPending}>{updateLead.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar E-mails</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-sm">Cole os e-mails (um por linha)</Label><Textarea rows={8} value={importText} onChange={e => setImportText(e.target.value)} placeholder="email1@exemplo.com&#10;email2@exemplo.com" /></div>
            <div><Label className="text-sm">Origem</Label><Select value={importOrigem} onValueChange={v => setImportOrigem(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="POPUP">Popup</SelectItem><SelectItem value="FOOTER">Footer</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={handleImport} disabled={importLeads.isPending}>{importLeads.isPending ? 'Importando...' : 'Importar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaNewsletter;
