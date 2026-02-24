

# Plano: UX do Botao "Verificar" + Debug Profundo

## Diagnostico

O backend `add-domain` (api/lojas.js linhas 96-121) ja esta correto:
- Faz POST para `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`
- Repassa erros da Vercel com `res.status(400).json({ error: ... })`
- Aceita `domain_already_exists` como sucesso (idempotente)

O problema esta exclusivamente no frontend: o `handleCheckDomain` atual nao chama `addDomain`, e o `handleSave` engole o erro do `addDomain` com um `catch` vazio.

## Alteracoes

### Arquivo 1: `src/pages/painel/LojaConfiguracoes.tsx`

**Alteracao A -- Refatorar `handleCheckDomain` (linhas 80-94)**

Novo fluxo com addDomain automatico e debug visivel:

```text
const handleCheckDomain = async () => {
  if (!dominioCustomizado.trim() || !id) return;
  setIsCheckingDomain(true);
  try {
    // 1. Registrar dominio na Vercel (idempotente)
    await lojasApi.addDomain(id, dominioCustomizado.trim());

    // 2. Respiro para a Vercel processar
    await new Promise(r => setTimeout(r, 2000));

    // 3. Verificacao real
    const result = await lojasApi.checkDomain(dominioCustomizado.trim());
    if (result.verified === true && !result.misconfigured) {
      toast({ title: 'Dominio verificado!', description: 'Dominio verificado e propagado com sucesso!' });
    } else {
      toast({ title: 'Propagacao pendente', description: 'Dominio ainda nao propagou ou DNS incorreto. Verifique o apontamento CNAME e aguarde.', variant: 'destructive' });
    }
  } catch (e: any) {
    toast({
      title: 'Erro ao registrar na Vercel',
      description: e?.message || 'Erro desconhecido. Verifique token e project ID.',
      variant: 'destructive',
    });
  } finally {
    setIsCheckingDomain(false);
  }
};
```

Pontos-chave:
- SEM catch silencioso -- o erro real da Vercel (token invalido, project ID errado, etc) aparece no Toast
- O `addDomain` roda ANTES do `checkDomain`, tornando o botao independente do "Salvar"
- Delay de 2s entre registro e verificacao

**Alteracao B -- Tornar o `addDomain` no `handleSave` visivel (linhas 64-68)**

Substituir o catch silencioso por um que mostra o erro:

```text
if (dominioCustomizado?.trim()) {
  try {
    await lojasApi.addDomain(id, dominioCustomizado.trim());
  } catch (e: any) {
    toast({
      title: 'Aviso: dominio nao registrado na Vercel',
      description: e?.message || 'Erro ao registrar. Use o botao Verificar Propagacao.',
      variant: 'destructive',
    });
  }
}
```

### Arquivo 2: `api/lojas.js` -- SEM ALTERACAO

O backend ja repassa erros corretamente (linha 113: `return res.status(400).json({ error: vercelData.error?.message ... })`). Nenhuma mudanca necessaria.

## Resumo

| Arquivo | Acao |
|---|---|
| `src/pages/painel/LojaConfiguracoes.tsx` | EDITAR - handleCheckDomain (addDomain + debug) + handleSave (catch visivel) |
| `api/lojas.js` | SEM ALTERACAO (backend ja correto) |
| `vite.config.mts` | INTOCAVEL |

## Nota sobre o erro de build

O erro "Permission denied" no vite e um problema transitorio do ambiente sandbox, nao do codigo. O arquivo `vite.config.mts` existe e nao sera tocado.

