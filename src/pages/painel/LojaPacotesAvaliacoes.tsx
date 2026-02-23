import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { settingsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Download, Upload, FileJson, Loader2, Star, User, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ImageUploader from '@/components/ImageUploader';
import type { ComentarioItem, PacoteComentarioV2 } from '@/pages/AdminPacotesComentarios';

function gerarExemplos(): ComentarioItem[] {
  return [
    { nome: 'Maria S.', texto: 'Produto incrível! Superou minhas expectativas. Recomendo a todos!', nota: 5, data: '2025-01-15', foto_avaliador: '', imagens: [] },
    { nome: 'João P.', texto: 'Muito bom, qualidade excelente. Entrega rápida e segura.', nota: 4.5, data: '2025-01-10', foto_avaliador: '', imagens: [] },
    { nome: 'Ana L.', texto: 'Já comprei várias vezes, sempre satisfeita! Ótimo custo-benefício.', nota: 5, data: '2025-01-05', foto_avaliador: '', imagens: [] },
  ];
}

type ViewMode = 'list' | 'editor';

const LojaPacotesAvaliacoes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { toast } = useToast();

  const SETTINGS_KEY = `comentarios_loja_${id}`;

  const [pacotes, setPacotes] = useState<PacoteComentarioV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editIdx, setEditIdx] = useState<number>(-1);
  const [editNome, setEditNome] = useState('');
  const [editComentarios, setEditComentarios] = useState<ComentarioItem[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    if (!id) return;
    settingsApi.getByKeys([SETTINGS_KEY]).then(settings => {
      const raw = settings.find(s => s.key === SETTINGS_KEY)?.value;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((p: any) => {
              if (p.comentarios) return p;
              return { nome: p.nome, comentarios: (p.textos || []).map((t: string) => ({ nome: 'Cliente', texto: t, nota: 5, data: '', foto_avaliador: '', imagens: [] })) };
            });
            setPacotes(migrated);
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const savePacotes = async (newPacotes: PacoteComentarioV2[]) => {
    setSaving(true);
    try {
      await settingsApi.upsert([{ key: SETTINGS_KEY, value: JSON.stringify(newPacotes) }]);
      setPacotes(newPacotes);
      toast({ title: 'Pacotes salvos!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const openNew = () => { setEditIdx(-1); setEditNome(''); setEditComentarios([]); setMode('editor'); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditNome(pacotes[idx].nome); setEditComentarios(JSON.parse(JSON.stringify(pacotes[idx].comentarios))); setMode('editor'); };

  const handleSaveEditor = () => {
    if (!editNome.trim()) { toast({ title: 'Nome é obrigatório', variant: 'destructive' }); return; }
    const newPacotes = [...pacotes];
    const pacote: PacoteComentarioV2 = { nome: editNome.trim(), comentarios: editComentarios };
    if (editIdx === -1) newPacotes.push(pacote); else newPacotes[editIdx] = pacote;
    savePacotes(newPacotes);
    setMode('list');
  };

  const handleDelete = (idx: number) => savePacotes(pacotes.filter((_, i) => i !== idx));

  const handleExportOne = (idx: number) => {
    const p = pacotes[idx];
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `pacote-${p.nome}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportEditor = () => {
    const p = { nome: editNome, comentarios: editComentarios };
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `pacote-${editNome || 'novo'}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const handleImportEditorConfirm = () => {
    try {
      const data = JSON.parse(importJson);
      if (data.comentarios && Array.isArray(data.comentarios)) setEditComentarios(prev => [...prev, ...data.comentarios]);
      else if (Array.isArray(data)) setEditComentarios(prev => [...prev, ...data]);
      setImportOpen(false); setImportJson('');
      toast({ title: 'Comentários importados!' });
    } catch { toast({ title: 'JSON inválido', variant: 'destructive' }); }
  };

  const addComentario = () => setEditComentarios(prev => [...prev, { nome: '', texto: '', nota: 5, data: new Date().toISOString().split('T')[0], foto_avaliador: '', imagens: [] }]);
  const updateComentario = (idx: number, key: keyof ComentarioItem, value: any) => setEditComentarios(prev => { const l = [...prev]; l[idx] = { ...l[idx], [key]: value }; return l; });
  const removeComentario = (idx: number) => setEditComentarios(prev => prev.filter((_, i) => i !== idx));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // ===== EDITOR =====
  if (mode === 'editor') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode('list')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold">{editIdx === -1 ? 'Novo Pacote' : 'Editar Pacote'}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Importar JSON</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportEditor}><Download className="h-4 w-4" /> Exportar JSON</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditComentarios(gerarExemplos())}><Wand2 className="h-4 w-4" /> Gerar Exemplo</Button>
            <Button onClick={handleSaveEditor} disabled={saving} className="gap-1">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
          </div>
        </div>
        <div className="space-y-4">
          <div><Label>Nome do Pacote</Label><Input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Ex: Avaliações Positivas" /></div>
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Comentários ({editComentarios.length})</Label>
            <Button size="sm" onClick={addComentario}><Plus className="h-3 w-3 mr-1" /> Novo Comentário</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editComentarios.map((c, i) => (
              <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Comentário {i + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeComentario(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                <div className="flex items-center gap-3">
                  {c.foto_avaliador ? <img src={c.foto_avaliador} alt={c.nome} className="h-10 w-10 rounded-full object-cover border border-border shrink-0" /> : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border shrink-0"><User className="h-5 w-5 text-muted-foreground" /></div>}
                  <div className="flex-1"><Label className="text-xs">Foto do avaliador</Label><ImageUploader lojaId={id || ''} value={c.foto_avaliador || ''} onChange={(url) => updateComentario(i, 'foto_avaliador', url)} placeholder="URL da foto" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nome" value={c.nome} onChange={e => updateComentario(i, 'nome', e.target.value)} />
                  <Input placeholder="Nota" type="number" step="0.1" min="0" max="5" value={c.nota} onChange={e => updateComentario(i, 'nota', Number(e.target.value))} />
                  <Input placeholder="Data" type="date" value={c.data} onChange={e => updateComentario(i, 'data', e.target.value)} />
                </div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.floor(c.nota) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />)}<span className="text-xs text-muted-foreground ml-1">{Number(c.nota).toFixed(1)}</span></div>
                <Textarea placeholder="Texto da avaliação..." rows={2} value={c.texto} onChange={e => updateComentario(i, 'texto', e.target.value)} />
                <div className="space-y-1">
                  <Label className="text-xs">Fotos (até 3)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(c.imagens || []).map((img, j) => (
                      <div key={j} className="relative group"><img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                        <button type="button" onClick={() => { const imgs = [...(c.imagens || [])]; imgs.splice(j, 1); updateComentario(i, 'imagens', imgs); }} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </div>
                    ))}
                  </div>
                  {(c.imagens || []).length < 3 && <ImageUploader lojaId={id || ''} onChange={(url) => updateComentario(i, 'imagens', [...(c.imagens || []), url])} placeholder="URL da foto ou upload" />}
                </div>
              </div>
            ))}
          </div>
          {editComentarios.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileJson className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Nenhum comentário neste pacote</p>
              <p className="text-sm text-muted-foreground mb-4">Adicione comentários ou clique em "Gerar Exemplo".</p>
              <Button size="sm" className="gap-1" onClick={addComentario}><Plus className="h-4 w-4" /> Novo Comentário</Button>
            </div>
          )}
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Importar via JSON</DialogTitle></DialogHeader>
            <Textarea className="min-h-[200px] font-mono text-sm" value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[{"nome":"Maria","texto":"Adorei!","nota":5,"data":"2025-01-01"}]' />
            <DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button><Button onClick={handleImportEditorConfirm}>Importar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== LIST =====
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avaliações — {loja?.nome}</h1>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Pacote</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Pacotes criados aqui são <strong>exclusivos desta loja</strong>.</p>
      {pacotes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileJson className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhum pacote de avaliações</p>
          <p className="text-sm text-muted-foreground mb-4">Crie pacotes de comentários para usar nos seus produtos.</p>
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Pacote</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pacotes.map((p, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-5 space-y-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openEdit(idx)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.nome}</h3>
                <span className="text-xs text-muted-foreground">{p.comentarios.length} comentários</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {p.comentarios.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {c.foto_avaliador ? <img src={c.foto_avaliador} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" /> : <div className="h-5 w-5 rounded-full bg-muted shrink-0" />}
                    <p className="text-xs text-muted-foreground truncate flex-1">{c.nome}: {c.texto}</p>
                  </div>
                ))}
                {p.comentarios.length > 3 && <p className="text-xs text-muted-foreground">... e mais {p.comentarios.length - 3}</p>}
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(idx)}>Editar</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExportOne(idx)}><Download className="h-3 w-3" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Excluir "{p.nome}"?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(idx)}>Excluir</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LojaPacotesAvaliacoes;
