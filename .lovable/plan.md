

## Fix: Grid de 4 planos quebrando para linha de baixo

### Problema
A lógica atual do grid só trata 1, 2 ou 3+ planos — para 3+ sempre usa `md:grid-cols-3`, fazendo o 4º plano cair para uma segunda linha.

### Solução
**`src/pages/painel/LojaAssinatura.tsx` — linha 359**

Adicionar caso para 4 planos com `md:grid-cols-4` (ou `md:grid-cols-2 lg:grid-cols-4` para melhor responsividade):

```
planos.length === 1 ? 'max-w-md mx-auto'
: planos.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto'
: planos.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4'
: 'md:grid-cols-3'
```

Também trocar `max-w-5xl` do container pai para `max-w-7xl` para acomodar 4 colunas sem ficarem espremidas.

### Arquivo alterado
- `src/pages/painel/LojaAssinatura.tsx`

