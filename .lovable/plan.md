

# Refatoracao do Sistema de Cores da Loja (Storefront)

## Resumo
Migrar o esquema de cores da loja publica de 4 variaveis genericas (`cor_primaria`, `cor_secundaria`, `cor_fundo`, `cor_texto`) para 6 variaveis semanticas com proposito claro, botao WhatsApp isolado, hierarquia de overrides e defaults inspirados no TikTok Shop.

## Impacto
- **Loja publica (Storefront)**: Todas as paginas sob `LojaLayout` recebem o novo esquema de cores dinamico
- **Painel Lojista e Admin**: INTOCAVEIS - nenhuma alteracao
- **Backend**: Sem nova serverless function (limite de 12)

---

## 1. Backend - Model e API

### 1.1 Atualizar `models/Loja.js`
Substituir o objeto `cores_globais` atual por um novo schema com as 6 variaveis semanticas:

```javascript
cores_globais: {
  type: mongoose.Schema.Types.Mixed,
  default: {
    brand_primary: '#E60023',
    brand_secondary: '#F1F1F2',
    bg_base: '#F8F8F8',
    bg_surface: '#FFFFFF',
    text_primary: '#111111',
    whatsapp_button: '#25D366',
  },
},
```

### 1.2 Atualizar `api/lojas.js` - Criacao de loja
No `Loja.create()`, popular explicitamente o `cores_globais` com os defaults TikTok Shop para que toda nova loja ja venha com o esquema correto.

### 1.3 Atualizar `api/loja-extras.js` - Scope "tema"
O GET e PUT do scope `tema` ja retornam/aceitam `cores_globais` como Mixed, entao nenhuma mudanca estrutural e necessaria na API. O campo continua sendo salvo e retornado normalmente.

---

## 2. Frontend - Tipos e Interface

### 2.1 Atualizar `src/services/saas-api.ts`
Substituir a interface `CoresGlobais`:

```typescript
export interface CoresGlobais {
  brand_primary?: string;
  brand_secondary?: string;
  bg_base?: string;
  bg_surface?: string;
  text_primary?: string;
  whatsapp_button?: string;
}
```

### 2.2 Atualizar `src/contexts/LojaContext.tsx`
Atualizar a interface `CoresGlobais` local para refletir os novos campos.

---

## 3. Painel do Lojista - Aba "Cores"

### 3.1 Atualizar `src/pages/painel/LojaTemas.tsx`
- Alterar `DEFAULT_CORES` para os novos defaults TikTok Shop
- Reestruturar a aba "Cores" com 6 color pickers semanticos, cada um com label descritivo:
  - **Cor de Acao Principal (brand-primary)**: "Botoes de compra, tags de desconto, steps ativos"
  - **Cor de Acao Secundaria (brand-secondary)**: "Botao Adicionar ao Carrinho, badges"
  - **Fundo da Pagina (bg-base)**: "Cor de fundo geral do body"
  - **Superficie / Cards (bg-surface)**: "Cards, modais, blocos de checkout"
  - **Texto Principal (text-primary)**: "Titulos, precos, nomes de produto"
  - **Botao WhatsApp**: "Cor independente do botao flutuante" (separado visualmente dos demais com um divisor)
- Preview em tempo real com mini-mockup mostrando as cores aplicadas

---

## 4. Injecao Dinamica de CSS no Storefront

### 4.1 Atualizar `src/components/LojaLayout.tsx`
Refatorar o bloco `dynamicThemeCss` para mapear as novas variaveis semanticas para as CSS custom properties do Tailwind:

```text
brand_primary   --> --primary, --accent, --ring
brand_secondary --> --secondary
bg_base         --> --background
bg_surface      --> --card, --popover
text_primary    --> --foreground, --card-foreground, --popover-foreground
```

Calculos automaticos derivados:
- `--primary-foreground`: branco ou preto baseado na luminosidade de `brand_primary`
- `--secondary-foreground`: branco ou preto baseado na luminosidade de `brand_secondary`
- `--border`: tom derivado de `bg_surface` com leve escurecimento
- `--muted`: tom derivado de `bg_base`
- `--muted-foreground`: tom medio entre `text_primary` e `bg_base`

### 4.2 Botao WhatsApp isolado
No componente `WhatsAppFloat` dentro de `LojaLayout.tsx`, trocar a classe `bg-[#25D366]` fixa por uma CSS variable `--whatsapp-button` injetada dinamicamente, usando o valor de `cores_globais.whatsapp_button`.

---

## 5. Hierarquia de Overrides

A logica ja existente para componentes como Tarja do Topo (`tarja_topo.cor_fundo`), Banners e Cronometros permanece inalterada. O CSS dinamico injeta as variaveis globais em `:root`, e os componentes que possuem configuracao de cor propria (inline style) naturalmente sobrepoem o global. Quando a cor especifica esta vazia, o componente ja usa classes Tailwind que referenciam `--primary` ou `--card`, herdando automaticamente do tema global. Nenhuma mudanca adicional e necessaria para manter esta hierarquia.

---

## 6. Migraciao de Dados Existentes

Adicionar logica de compatibilidade no `LojaLayout.tsx` para lojas que ainda possuem o formato antigo (`cor_primaria`, `cor_secundaria`, etc.). Ao ler `cores_globais`, se detectar o campo legado `cor_primaria`, mapear automaticamente:

```text
cor_primaria   --> brand_primary
cor_secundaria --> brand_secondary  
cor_fundo      --> bg_base
cor_texto      --> text_primary
(bg_surface default #FFFFFF)
(whatsapp_button default #25D366)
```

Isso garante que lojas criadas antes da migracao continuem funcionando sem precisar rodar script de migracao no banco.

---

## Arquivos Modificados

| Arquivo | Tipo de mudanca |
|---|---|
| `models/Loja.js` | Alterar default de `cores_globais` |
| `api/lojas.js` | Popular `cores_globais` na criacao |
| `src/services/saas-api.ts` | Atualizar interface `CoresGlobais` |
| `src/contexts/LojaContext.tsx` | Atualizar interface `CoresGlobais` |
| `src/pages/painel/LojaTemas.tsx` | Reestruturar aba Cores com 6 pickers |
| `src/components/LojaLayout.tsx` | Refatorar injecao CSS + WhatsApp isolado |

Nenhuma nova serverless function sera criada. Total permanece em 12/12.

