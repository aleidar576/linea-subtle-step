

## Correção de Alinhamento dos Cards — `LojaAssinatura.tsx`

### Problema
A classe `mt-auto` na div de features (linha 512) cria um gap visual gigante entre o CTA e a lista de vantagens.

### 3 Alterações Pontuais

**Arquivo:** `src/pages/painel/LojaAssinatura.tsx`

**1. Remover `mt-auto` da lista de features (linha 512)**
```
// DE:
<div className="mt-auto">
// PARA:
<div>
```

**2. Header — trocar `min-h` por `h` fixo responsivo (linha 413)**
```
// DE:
<div className="text-center pt-2 min-h-[140px] flex flex-col justify-start">
// PARA:
<div className="text-center pt-2 h-auto md:h-[140px] flex flex-col justify-start">
```

**3. Bloco de preço — trocar `min-h` por `h` fixo responsivo (linha 431)**
```
// DE:
<div className="text-center py-8 min-h-[140px] flex flex-col items-center justify-center">
// PARA:
<div className="text-center py-8 h-auto md:h-[140px] flex flex-col items-center justify-center">
```

### Resultado
No desktop, Header (140px) + Preço (140px) = 280px fixos acima do CTA em todos os cards. O botão CTA fica sempre na mesma coordenada Y. No mobile, `h-auto` permite fluxo natural sem cortes.

