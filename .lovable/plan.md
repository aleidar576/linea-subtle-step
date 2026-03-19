

## Diagnóstico

O bug é um race condition no `useEffect`:

1. Na montagem, `activeLojas.length === 0` (lojas ainda carregando) → `setChecked(true)` com `checkResults` todos `false`
2. `useLojas` termina → `activeLojas.length` muda → `useEffect` re-executa `checkAll()` async
3. **Durante essa execução async**, `checked` já é `true` e o checklist renderiza com dados desatualizados
4. Quando `checkAll` termina, se tudo está completo, o card some → **flash**

## Correção

**Arquivo:** `src/pages/painel/PainelInicio.tsx`

1. **Resetar `checked` para `false`** no início do `useEffect` quando há lojas, para que o Skeleton apareça enquanto os dados reais carregam:

```tsx
useEffect(() => {
  if (!activeLojas.length) { setChecked(true); return; }

  setChecked(false); // ← ADICIONAR: força skeleton enquanto busca dados reais

  const checkAll = async () => {
    // ... lógica existente ...
  };
  checkAll();
}, [activeLojas.length]);
```

2. **Proteger a renderização do checklist** adicionando a condição `checked` ao guard existente:

```tsx
{!isOnboardingCompleted && checked && (
  <Card className="mb-8">
    {/* ... conteúdo do checklist ... */}
  </Card>
)}
```

Isso garante que o card de "Primeiros Passos" só aparece **após** a verificação real terminar E se houver passos pendentes — eliminando o flash.

