import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/saas-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminTickets = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: adminApi.listTickets,
  });

  const resolver = useMutation({
    mutationFn: (id: string) => adminApi.resolveTicket(id),
    onSuccess: () => {
      toast({ title: 'Ticket resolvido!' });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const tipoLabel: Record<string, string> = {
    compromisso_conta: 'Comprometimento de Conta',
    suporte: 'Suporte',
    bug: 'Bug',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tickets de Segurança</h1>
        <p className="text-muted-foreground">Gerencie tickets de segurança e suporte abertos pelos lojistas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Tickets</CardTitle>
          <CardDescription>Tickets gerados automaticamente ou por lojistas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !tickets?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum ticket registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Lojista</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t: any) => (
                  <TableRow key={t._id}>
                    <TableCell>
                      <Badge variant={t.tipo === 'compromisso_conta' ? 'destructive' : 'outline'}>
                        {tipoLabel[t.tipo] || t.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.lojista_email || t.lojista_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'aberto' ? 'destructive' : 'secondary'}>
                        {t.status === 'aberto' ? 'Aberto' : 'Resolvido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {t.status === 'aberto' && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => resolver.mutate(t._id)} disabled={resolver.isPending}>
                          <CheckCircle className="h-3 w-3" /> Resolver
                        </Button>
                      )}
                    </TableCell>
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

export default AdminTickets;
