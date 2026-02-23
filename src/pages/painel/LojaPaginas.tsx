import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { usePaginas, useCreatePagina, useUpdatePagina, useDeletePagina } from '@/hooks/useLojaExtras';
import type { PaginaData } from '@/services/saas-api';
import { FileText, Plus, Pencil, Trash2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const TipTapEditor = ({ content, onChange }: { content: string; onChange: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-accent' : ''}>B</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-accent' : ''}><em>I</em></Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}>H2</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}>H3</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-accent' : ''}>• Lista</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-accent' : ''}>1. Lista</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => {
          const url = window.prompt('URL do link:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}>Link</Button>
        {editor.isActive('link') && (
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().unsetLink().run()}>Remover Link</Button>
        )}
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[250px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]" />
    </div>
  );
};

const LojaPaginas = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: paginas, isLoading, isError } = usePaginas(id);
  const createMut = useCreatePagina();
  const updateMut = useUpdatePagina();
  const deleteMut = useDeletePagina();

  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editingPage, setEditingPage] = useState<PaginaData | null>(null);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openNew = () => {
    setEditingPage(null);
    setTitulo('');
    setConteudo('');
    setIsActive(true);
    setMode('editor');
  };

  const openEdit = (p: PaginaData) => {
    setEditingPage(p);
    setTitulo(p.titulo);
    setConteudo(p.conteudo);
    setIsActive(p.is_active);
    setMode('editor');
  };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Título é obrigatório'); return; }
    try {
      if (editingPage) {
        await updateMut.mutateAsync({ id: editingPage._id, data: { titulo, conteudo, is_active: isActive } });
        toast.success('Página atualizada');
      } else {
        await createMut.mutateAsync({ loja_id: id!, titulo, conteudo });
        toast.success('Página criada');
      }
      setMode('list');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm);
      toast.success('Página excluída');
      setDeleteConfirm(null);
    } catch (e: any) { toast.error(e.message); }
  };

  if (mode === 'editor') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode('list')}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold">{editingPage ? 'Editar Página' : 'Nova Página'}</h1>
          </div>
          <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Quem Somos" />
          </div>
          {editingPage && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Slug: /{editingPage.slug}</Label>
            </div>
          )}
          <div>
            <Label className="mb-2 block">Conteúdo</Label>
            <TipTapEditor key={editingPage?._id || 'new'} content={conteudo} onChange={setConteudo} />
          </div>
          {editingPage && (
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm">Página ativa</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Páginas — {loja?.nome}</h1>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Nova Página</Button>
      </div>

      {isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-12 text-center">
          <p className="font-medium text-destructive mb-1">Erro ao carregar páginas</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Atualizar</Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !paginas?.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nenhuma página criada</p>
          <p className="text-sm text-muted-foreground mb-4">Crie páginas como "Quem Somos", "Trocas e Devoluções", "Termos de Uso".</p>
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Nova Página</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginas.map(p => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">/{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? <><Eye className="h-3 w-3 mr-1" />Ativa</> : <><EyeOff className="h-3 w-3 mr-1" />Inativa</>}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(p._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir página?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível. Links no footer que apontem para esta página ficarão quebrados.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaPaginas;
