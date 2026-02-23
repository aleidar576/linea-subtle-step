import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminsApi, AdminUser } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trash2, Loader2, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

const AdminTeam = () => {
  const queryClient = useQueryClient();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admin-team'],
    queryFn: adminsApi.list,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Admin aprovado!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Admin removido!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = admins.filter((a: AdminUser) => a.status === 'active').length;
  const pendingCount = admins.filter((a: AdminUser) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <p className="text-2xl font-bold mt-1">{admins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Administradores do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin: AdminUser, idx: number) => (
                  <TableRow key={admin._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{admin.email}</span>
                        {idx === 0 && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            Mestre
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell>
                      {admin.status === 'active' ? (
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {admin.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => approveMutation.mutate(admin._id)}
                            disabled={approveMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Aprovar
                          </Button>
                        )}
                        {idx !== 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Remover admin ${admin.email}?`)) {
                                removeMutation.mutate(admin._id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum administrador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTeam;
