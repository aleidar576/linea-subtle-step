

## Refatoração Completa — Card de Planos "SaaS Enterprise Clean"

### Resumo
Eliminar toda estrutura de Accordion e Badges. Substituir por um card minimalista com preço massivo, CTA verde acima da lista, e uma lista flat de vantagens com parser de negrito `**texto**`.

### Alterações em `src/pages/painel/LojaAssinatura.tsx`

**1. Imports — Limpar e simplificar (linhas 1-7)**
- Remover imports de `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, `Separator`, `Badge`
- Remover imports de `Store`, `Users`, `Package`, `Target`
- Remover `DESTAQUE_ICONS` e `getDestaqueIcon` (linhas 9-22)

**2. Criar helper `parseBold` (nova função utilitária)**
```typescript
const parseBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
      : part
  );
};
```

**3. Card — Novo layout (linhas 360-489)**

Estrutura por card:

```text
┌──────────────────────────────────┐
│          "Recomendado"           │  ← badge absoluto (se destaque)
│                                  │
│        Plano Essencial           │  ← text-3xl font-bold, centralizado
│    Taxa: 1.5% por venda         │  ← text-xs muted
│                                  │
│         R$ 49,90                 │  ← text-6xl font-black
│           /mês                   │
│                                  │
│   [ Começar 7 Dias Grátis ]     │  ← rounded-full bg-green-500
│                                  │
│ ✓ 1 Loja Ativa                  │  ← destaques (flat)
│ ✓ 500 Produtos                  │
│ ✓ Recuperação de Carrinhos      │  ← topicos.itens.titulo (flat)
│ ✓ Cupons Inteligentes           │
│ ──────────────────────────────  │
│ ✕ Sem CSS Customizado           │  ← limitacoes
│ ✕ Sem API Avançada              │
└──────────────────────────────────┘
```

- **Card container**: `bg-card rounded-2xl p-8 relative` + se `plano.destaque`: `border-2 border-green-500 shadow-lg shadow-green-500/10`
- **Nome**: `text-3xl font-bold text-center`
- **Taxa**: `text-xs text-muted-foreground text-center mt-1`
- **Preço**: `text-6xl font-black text-center` com R$ em `text-2xl align-top` e `/mês` em `text-sm`
- **CTA**: `rounded-full bg-green-500 hover:bg-green-600 text-white w-full` — posicionado ANTES da lista
- **Lista flat**: Mesclar `plano.destaques` + todos `topico.itens.map(i => i.titulo)` numa lista única. Cada item com `CheckCircle2 text-green-500` + `parseBold(text)`
- **Limitações**: Separadas por `border-t border-border/30 mt-6 pt-6`, cada com `XCircle text-destructive/60`

### Arquivo alterado
- `src/pages/painel/LojaAssinatura.tsx`

