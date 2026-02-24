

# Plano de Execucao: 3 Hotfixes Criticos

## HOTFIX 1: Inteligencia da Verificacao de Dominio

**Arquivo:** `src/pages/painel/LojaConfiguracoes.tsx` (linhas 73-84)

**Problema:** `handleCheckDomain` trata qualquer resposta 200 como sucesso. A Vercel retorna 200 com `verified: false` quando o dominio ainda nao propagou.

**Correcao:** Alterar a funcao `handleCheckDomain` para inspecionar o payload retornado:

```text
const handleCheckDomain = async () => {
  if (!dominioCustomizado.trim()) return;
  setIsCheckingDomain(true);
  try {
    const result = await lojasApi.checkDomain(dominioCustomizado.trim());
    if (result.verified === true && !result.misconfigured) {
      toast({ title: 'Dominio verificado!', description: 'Dominio verificado e propagado com sucesso!' });
    } else {
      toast({ title: 'Propagacao pendente', description: 'Dominio ainda nao propagou ou DNS incorreto. Verifique o apontamento CNAME e aguarde.', variant: 'destructive' });
    }
  } catch {
    toast({ title: 'Erro na verificacao', description: 'Nao foi possivel verificar o dominio. Tente novamente.', variant: 'destructive' });
  } finally {
    setIsCheckingDomain(false);
  }
};
```

---

## HOTFIX 2: Registro do Dominio na Vercel ao Salvar

**Arquivo:** `src/pages/painel/LojaConfiguracoes.tsx` (funcao `handleSave`, linhas 48-71)

**Problema:** Ao salvar um dominio customizado, ele e persistido no banco mas nunca registrado na Vercel, causando 404.

**Correcao:** Apos o `updateLoja.mutateAsync` com sucesso, verificar se `dominioCustomizado` tem valor e chamar `lojasApi.addDomain(id, dominioCustomizado)`:

```text
// Dentro do try, apos updateLoja.mutateAsync:
if (dominioCustomizado?.trim()) {
  try {
    await lojasApi.addDomain(id, dominioCustomizado.trim());
  } catch {
    // nao bloqueia o save, apenas avisa
  }
}
```

O toast de sucesso permanece. Se o `addDomain` falhar, o save do banco ja foi feito -- nao bloqueamos.

---

## HOTFIX 3: Espacamento Fantasma no Mobile

**Arquivo:** `src/pages/loja/LojaProduto.tsx` (linha 374)

**Problema:** A div raiz tem `pb-40` (160px) no mobile, criando um espaco branco excessivo abaixo do conteudo.

**Correcao:** Reduzir de `pb-40` para `pb-24` (96px), suficiente para a bottom bar de "Comprar Agora" sem deixar espaco morto:

```text
// ANTES:
<div className="min-h-screen bg-background md:pb-0 pb-40">

// DEPOIS:
<div className="min-h-screen bg-background md:pb-0 pb-24">
```

Tambem corrigir em `src/pages/ProductPage.tsx` (linha 234) de `pb-40` para `pb-24` por consistencia.

---

## Resumo

| Arquivo | Acao |
|---|---|
| `src/pages/painel/LojaConfiguracoes.tsx` | EDITAR - handleCheckDomain (payload) + handleSave (addDomain) |
| `src/pages/loja/LojaProduto.tsx` | EDITAR - pb-40 para pb-24 |
| `src/pages/ProductPage.tsx` | EDITAR - pb-40 para pb-24 |
| `vite.config.mts` | INTOCAVEL |
| `api/*` | SEM ALTERACAO |

