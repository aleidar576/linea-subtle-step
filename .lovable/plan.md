

## Correção: Banner não some após pagamento manual de taxas

### Problema
O `PainelLayout` carrega o perfil do lojista em seu próprio `useEffect` e guarda em estado local (`lojistaProfile`). Quando o `LojaAssinatura` faz o pagamento manual e chama `fetchData()`, só atualiza o estado **dele** — o PainelLayout continua com o `status_taxas: 'bloqueado'` em memória.

### Solução
Adicionar um listener de `visibilitychange` ou, mais direto, usar um **evento customizado** para que o `LojaAssinatura` notifique o `PainelLayout` para recarregar o perfil após o pagamento.

**Abordagem simples:** Disparar `window.dispatchEvent(new Event('refresh-lojista-profile'))` no `handlePayManual` do `LojaAssinatura`, e no `PainelLayout` ouvir esse evento para recarregar o perfil.

### Alterações

#### 1. `src/pages/painel/LojaAssinatura.tsx`
No `handlePayManual`, após `await fetchData()` com sucesso, disparar:
```js
window.dispatchEvent(new Event('refresh-lojista-profile'));
```

#### 2. `src/components/layout/PainelLayout.tsx`
Adicionar um `useEffect` que escuta o evento `refresh-lojista-profile` e re-executa o fetch do perfil do lojista.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/painel/LojaAssinatura.tsx` | Disparar evento após pagamento manual |
| `src/components/layout/PainelLayout.tsx` | Ouvir evento e recarregar perfil |

