import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLoja } from '@/hooks/useLojas';
import { useLojaProducts, useUpdateProduct } from '@/hooks/useLojaProducts';
import { useToast } from '@/hooks/use-toast';
import { Boxes, Upload, Download, Loader2, ImageIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LojaProduct } from '@/services/saas-api';

const LojaEstoque = () => {
  const { id } = useParams<{ id: string }>();
  const { data: loja } = useLoja(id);
  const { data: products, isLoading } = useLojaProducts(id);
  const updateMut = useUpdateProduct();
  const { toast } = useToast();

  const [edits, setEdits] = useState<Record<string, number>>({});

  const handleChange = (productId: string, value: number) => {
    setEdits(prev => ({ ...prev, [productId]: value }));
  };

  const handleSave = async (p: LojaProduct) => {
    const newEstoque = edits[p._id!];
    if (newEstoque === undefined || newEstoque === p.estoque) return;
    try {
      await updateMut.mutateAsync({ id: p._id!, data: { estoque: newEstoque } });
      setEdits(prev => { const n = { ...prev }; delete n[p._id!]; return n; });
      toast({ title: `Estoque de "${p.name}" atualizado` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  // Flatten products + variations
  const rows: Array<{ product: LojaProduct; variacao?: { nome: string; tipo: string; estoque: number; idx: number } }> = [];
  (products || []).forEach(p => {
    if (p.variacoes && p.variacoes.length > 0) {
      p.variacoes.forEach((v, idx) => {
        rows.push({ product: p, variacao: { nome: v.nome, tipo: v.tipo, estoque: v.estoque, idx } });
      });
    } else {
      rows.push({ product: p });
    }
  });

  const hasEdits = Object.keys(edits).length > 0;

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Estoque — {loja?.nome}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1"><Upload className="h-4 w-4" /> Importar CSV</Button>
          <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </div>
      </div>

      {!rows.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Boxes className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Sem produtos no estoque</p>
          <p className="text-sm text-muted-foreground">Cadastre produtos primeiro. Depois, gerencie as quantidades aqui com edição rápida.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead className="w-[120px]">Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const p = row.product;
                const v = row.variacao;
                const currentEstoque = v ? v.estoque : (edits[p._id!] ?? p.estoque ?? 0);
                const isEdited = !v && edits[p._id!] !== undefined && edits[p._id!] !== p.estoque;

                return (
                  <TableRow key={`${p._id}-${v?.idx ?? 'main'}`}>
                    <TableCell>
                      {!v && p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{v ? '' : p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v ? `${v.tipo}: ${v.nome}` : '—'}</TableCell>
                    <TableCell>
                      {v ? (
                        <span className="text-sm">{v.estoque}</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          className="w-20 h-8"
                          value={edits[p._id!] ?? p.estoque ?? 0}
                          onChange={e => handleChange(p._id!, Number(e.target.value))}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {(v ? v.estoque : currentEstoque) === 0 ? (
                        <Badge variant="destructive">Sem estoque</Badge>
                      ) : (
                        <Badge variant="default">Em estoque</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEdited && (
                        <Button variant="ghost" size="icon" onClick={() => handleSave(p)} disabled={updateMut.isPending}>
                          <Save className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default LojaEstoque;
