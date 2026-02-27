

# Refatoração do Recálculo de Frete Automático no Checkout

## Resumo
Remover o botão manual "Recalcular frete" e implementar recálculo automático quando o carrinho ou CEP mudam, com skeletons durante o carregamento.

---

## 1. Remover botão manual (linhas 841-855)

Deletar completamente o bloco JSX do botão "Recalcular frete":

```jsx
// REMOVER ESTE BLOCO INTEIRO:
{shippingData.zipCode.replace(/\D/g, '').length >= 8 && !isCalculatingFreight && (
  <Button type="button" variant="outline" size="sm" onClick={...}>
    <Truck /> Recalcular frete
  </Button>
)}
```

---

## 2. Adicionar recálculo automático por mudança no carrinho (após linha 187)

Criar um `useEffect` que monitora mudanças nas quantidades/itens do carrinho e dispara `fetchDynamicFreights` automaticamente quando o CEP já está preenchido:

```javascript
// Fingerprint do carrinho (id + quantidade de cada item)
const cartFingerprint = useMemo(
  () => items.map(i => `${i.product.id}:${i.quantity}`).join(','),
  [items]
);
const lastCartFingerprintRef = useRef(cartFingerprint);

useEffect(() => {
  const cleanCep = shippingData.zipCode.replace(/\D/g, '');
  if (cleanCep.length >= 8 && cartFingerprint !== lastCartFingerprintRef.current) {
    lastCartFingerprintRef.current = cartFingerprint;
    lastCalcCepRef.current = cleanCep;
    fetchDynamicFreights(cleanCep);
  }
}, [cartFingerprint, shippingData.zipCode, fetchDynamicFreights]);
```

O efeito existente (CEP) continua funcionando normalmente — este novo efeito cobre apenas o cenário de mudança no carrinho.

---

## 3. Skeletons de carregamento (já existentes)

Os skeletons já estão implementados corretamente nas linhas 858-864. Nenhuma alteração necessária — eles aparecem automaticamente quando `isCalculatingFreight` é `true`, ocultando valores antigos (pois `setShippingOptions([])` e `setSelectedFrete(null)` são chamados no início de `fetchDynamicFreights`).

---

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/loja/LojaCheckout.tsx` | -botão manual, +useEffect de recálculo por carrinho |
