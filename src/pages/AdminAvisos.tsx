import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/saas-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminAvisos = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');

  const { data: avisos, isLoading } = useQuery({
    queryKey: ['admin-avisos'],
    queryFn: adminApi.listBroadcasts,
  });

  const broadcast = useMutation({
    mutationFn: () => adminApi.broadcast(titulo, mensagem),
    onSuccess: () => {
      toast({ title: 'Aviso enviado para todos os lojistas!' });
      setTitulo('');
      setMensagem('');
      qc.invalidateQueries({ queryKey: ['admin-avisos'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) {
      toast({ title: 'Erro', description: 'Título e mensagem são obrigatórios', variant: 'destructive' });
      return;
    }
    broadcast.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Avisos Globais</h1>
        <p className="text-muted-foreground">Envie notificações para todos os lojistas da plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Novo Aviso</CardTitle>
          <CardDescription>O aviso será enviado para todos os lojistas cadastrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Manutenção programada" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem</label>
              <Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Descrição detalhada do aviso..." rows={4} required />
            </div>
            <Button type="submit" disabled={broadcast.isPending} className="gap-2">
              {broadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para Todos
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Histórico de Avisos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !avisos?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum aviso enviado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avisos.map((a: any) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{a.mensagem}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAvisos;
