import { useState, useEffect, useRef } from 'react';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { useLojas } from '@/hooks/useLojas';
import { lojistaApi, midiasApi, type LojistaProfile } from '@/services/saas-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock, ShieldCheck, Copy, Check, Camera, Upload, Link as LinkIcon } from 'lucide-react';

const LojaPerfil = () => {
  const { user } = useLojistaAuth();
  const { data: lojas } = useLojas();
  const { toast } = useToast();
  const [profile, setProfile] = useState<LojistaProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Password fields
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [loading2FA, setLoading2FA] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstLojaId = lojas?.find(l => l.is_active)?._id;

  useEffect(() => {
    lojistaApi.perfil()
      .then(p => {
        setProfile(p);
        setNome(p.nome);
        setTelefone(p.telefone || '');
        setCpfCnpj(p.cpf_cnpj || '');
        setAvatarUrl(p.avatar_url || '');
        setTwoFAEnabled(p.two_factor_enabled || false);
      })
      .catch(() => toast({ title: 'Erro', description: 'Falha ao carregar perfil', variant: 'destructive' }))
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const wasMissingData = !profile?.cpf_cnpj || !profile?.telefone;
    try {
      const updated = await lojistaApi.atualizar({ nome, telefone, cpf_cnpj: cpfCnpj });
      setProfile(updated);
      toast({ title: 'Perfil atualizado!' });
      if (wasMissingData && updated.cpf_cnpj && updated.telefone) {
        toast({ title: '✅ Acesso ao free trial liberado!', description: 'Clique para assinar um plano.', action: <a href="/painel/assinatura" className="text-primary underline text-sm">Ver Planos</a> });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSavingProfile(false); }
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const updated = await lojistaApi.atualizar({ avatar_url: avatarUrl });
      setProfile(updated);
      toast({ title: 'Foto de perfil atualizada!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSavingAvatar(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!firstLojaId) {
      toast({ title: 'Erro', description: 'Crie uma loja primeiro para fazer upload de imagens.', variant: 'destructive' });
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Tipo inválido', description: 'Apenas JPG, PNG, WebP e GIF.', variant: 'destructive' });
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 4.5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await midiasApi.upload(firstLojaId, reader.result as string);
        setAvatarUrl(result.url);
        const updated = await lojistaApi.atualizar({ avatar_url: result.url });
        setProfile(updated);
        toast({ title: 'Foto enviada e salva!' });
      } catch (err: any) {
        toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) { toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' }); return; }
    if (novaSenha.length < 6) { toast({ title: 'Erro', description: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return; }
    setSavingPassword(true);
    try {
      await lojistaApi.alterarSenha({ senha_atual: senhaAtual, nova_senha: novaSenha });
      toast({ title: 'Senha alterada com sucesso!' });
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
    finally { setSavingPassword(false); }
  };

  const handleGenerate2FA = async () => {
    setLoading2FA(true);
    try { const res = await lojistaApi.generate2FA(); setQrCode(res.qrCode); setSecretKey(res.secret); setShowSetupModal(true); }
    catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
    finally { setLoading2FA(false); }
  };

  const handleEnable2FA = async () => {
    if (otpCode.length !== 6) return;
    setLoading2FA(true);
    try { await lojistaApi.enable2FA(otpCode); setTwoFAEnabled(true); setShowSetupModal(false); setOtpCode(''); toast({ title: '2FA ativado com sucesso!' }); }
    catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); setOtpCode(''); }
    finally { setLoading2FA(false); }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) return;
    setLoading2FA(true);
    try { await lojistaApi.disable2FA(disablePassword); setTwoFAEnabled(false); setShowDisableModal(false); setDisablePassword(''); toast({ title: '2FA desativado' }); }
    catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
    finally { setLoading2FA(false); }
  };

  const copySecret = () => { navigator.clipboard.writeText(secretKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loadingProfile) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e segurança</p>
      </div>

      {/* Foto de Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Foto de Perfil</CardTitle>
          <CardDescription>Atualize sua foto de perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">
                  {profile?.nome?.slice(0, 2).toUpperCase() || 'US'}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid grid-cols-2 h-8">
                  <TabsTrigger value="upload" className="text-xs gap-1"><Upload className="h-3 w-3" /> Upload</TabsTrigger>
                  <TabsTrigger value="url" className="text-xs gap-1"><LinkIcon className="h-3 w-3" /> URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-2">
                  <div className="flex gap-2 items-center">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="url" className="mt-2">
                  <div className="flex gap-2">
                    <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://exemplo.com/minha-foto.jpg" className="text-xs" />
                    <Button size="sm" onClick={handleSaveAvatar} disabled={savingAvatar}>
                      {savingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Dados Pessoais</CardTitle>
            <CardDescription>Atualize seu nome e telefone</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Nome</label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required /></div>
              <div><label className="text-sm font-medium mb-1 block">Email</label><Input value={profile?.email || ''} readOnly className="bg-muted cursor-not-allowed" /><p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p></div>
              <div><label className="text-sm font-medium mb-1 block">CPF/CNPJ</label><Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" /></div>
              <div><label className="text-sm font-medium mb-1 block">Telefone</label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></div>
              <Button type="submit" disabled={savingProfile}>{savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Salvar</Button>
            </form>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Alterar Senha</CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Senha Atual</label><Input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="••••••••" required /></div>
              <div><label className="text-sm font-medium mb-1 block">Nova Senha</label><Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required /></div>
              <div><label className="text-sm font-medium mb-1 block">Confirmar Nova Senha</label><Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha" required /></div>
              <Button type="submit" disabled={savingPassword}>{savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Alterar Senha</Button>
            </form>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Autenticação de Dois Fatores (2FA)
                  {twoFAEnabled && <Badge variant="default" className="ml-2">Ativo</Badge>}
                </CardTitle>
                <CardDescription>Adicione uma camada extra de segurança usando um app autenticador</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {twoFAEnabled ? (
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">A autenticação de dois fatores está ativa na sua conta.</p>
                <Button variant="destructive" size="sm" onClick={() => setShowDisableModal(true)}>Desativar 2FA</Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Proteja sua conta com autenticação de dois fatores.</p>
                <Button onClick={handleGenerate2FA} disabled={loading2FA}>
                  {loading2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Ativar 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup 2FA Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Configurar Autenticação 2FA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escaneie o QR Code com seu app autenticador.</p>
            {qrCode && <div className="flex justify-center p-4 bg-white rounded-lg"><img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" /></div>}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ou insira esta chave manualmente:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">{secretKey}</code>
                <Button variant="outline" size="icon" onClick={copySecret}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Digite o código de 6 dígitos:</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button onClick={handleEnable2FA} className="w-full" disabled={loading2FA || otpCode.length !== 6}>
              {loading2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirmar e Ativar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Desativar 2FA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite sua senha atual para desativar.</p>
            <Input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} placeholder="Senha atual" />
            <Button variant="destructive" onClick={handleDisable2FA} className="w-full" disabled={loading2FA || !disablePassword}>
              {loading2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Desativar 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LojaPerfil;
