

## Correção: Migração de dados legado + Atualização da página pública de planos

### Problema
1. `openEdit` em `AdminPlanos.tsx` ignora dados legados `vantagens` — modal abre com tópicos vazios
2. Página pública `LojaAssinatura.tsx` ainda renderiza `plano.vantagens` (array que não existe mais no schema)
3. Interface `Plano` em `saas-api.ts` não tem `topicos` nem `limitacoes`

### Alterações

**1. `src/services/saas-api.ts` (linhas 682-696)** — Atualizar interface `Plano`
- Adicionar `topicos: { nome: string; itens: { titulo: string; descricao: string }[] }[]`
- Adicionar `limitacoes: string[]`
- Manter `vantagens: string[]` como opcional (`vantagens?: string[]`) para compatibilidade com dados legados

**2. `src/pages/AdminPlanos.tsx` (linha 54-63)** — Fallback no `openEdit`
- Se `p.topicos` estiver vazio/undefined E `p.vantagens` tiver itens, auto-gerar:
```typescript
const topicos = (p.topicos && p.topicos.length > 0)
  ? p.topicos
  : (p.vantagens && p.vantagens.length > 0)
    ? [{ nome: 'Recursos Principais', itens: p.vantagens.map(v => ({ titulo: v, descricao: '' })) }]
    : [];
```

**3. `src/pages/painel/LojaAssinatura.tsx` (linhas 381-390)** — Substituir renderização
- Remover bloco `plano.vantagens`
- Adicionar import `XCircle` ou `Lock` do lucide-react
- Renderizar `topicos`: nome do tópico em negrito, itens com CheckCircle2
- Renderizar `limitacoes`: cada string com ícone XCircle em vermelho
- Fallback: se `topicos` vazio mas `vantagens` existe, renderizar `vantagens` como antes (resiliência)

### Resultado
- Modal admin carrega dados legados automaticamente em formato tópico
- Página pública exibe tópicos categorizados + limitações com iconografia clara
- Sem breaking changes — dados antigos são consumidos via fallback

