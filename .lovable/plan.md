

# Plano de Execucao V3: UX Variacoes + Super Popup + Newsletter + Footer Premium Configuravel

## Visao Geral

Este plano cobre 7 partes, agora incluindo as 3 adicoes solicitadas: (1) cores independentes para o footer, (2) colunas dinamicas com URLs livres, e (3) correcoes de visibilidade. O `vite.config.mts` permanece intocavel e os 12 arquivos na pasta `api/` sao mantidos.

---

## PARTE 1: UX de Variacoes (Loja Publica)

**Arquivo:** `src/pages/loja/LojaProduto.tsx`

### 1.1 Pre-selecao Automatica

No `useEffect` que reseta variacoes ao trocar de produto, apos resetar `selectedSize` e `selectedColor`, adicionar logica:

```text
if colorVars.length === 1 -> setSelectedColor(colorVars[0].nome)
if sizeVars.length === 1 -> setSelectedSize(sizeVars[0].nome)
if product.sizes?.length === 1 -> setSelectedSize(product.sizes[0])
```

Recalcular `colorVars`/`sizeVars` dentro do `useEffect` a partir de `product.variacoes`.

### 1.2 Ocultar Bloco "X opcoes" no Mobile (variacao unica)

No BLOCO 3 (resumo de variacoes), so renderizar o botao no mobile se `totalVariationOptions > 1`. Se for 1, ocultar no mobile (variacao ja pre-selecionada). Desktop inalterado.

---

## PARTE 2: Backend - Model Lead + Escopos API

### 2.1 Criar `models/Lead.js`

- `loja_id`: ObjectId (ref: 'Loja', required, indexed)
- `email`: String (required, trim, lowercase, maxlength: 255)
- `origem`: String (enum: ['POPUP', 'FOOTER'], default: 'POPUP')
- `criado_em`: Date (default: nowGMT3)
- Index unico composto: `{ loja_id: 1, email: 1 }`

### 2.2 Novos escopos em `api/loja-extras.js`

**Publicos (sem auth):**

| Escopo | Metodo | Descricao |
|---|---|---|
| `lead-newsletter` | POST | Recebe `{ loja_id, email, origem }`. Valida email regex. Upsert idempotente. |
| `cupons-popup` | GET | Recebe `loja_id` e `ids` (comma-separated). Retorna cupons ativos. |

**Autenticados (com auth lojista):**

| Escopo | Metodo | Descricao |
|---|---|---|
| `leads` | GET | Lista leads com vinculo (verifica colecao `Cliente`). |
| `lead` | PUT | Atualiza email de um lead. |
| `lead` | DELETE | Exclui um lead. |
| `leads-import` | POST | Insere emails em lote com `insertMany`. |
| `leads-export` | GET | Retorna todos os leads em JSON (CSV gerado no frontend). |

### 2.3 Atualizar tipo popup em `src/services/saas-api.ts`

Substituir o tipo `popup` na interface `HomepageConfig` (linhas 216-224):

```text
popup?: {
  ativo: boolean;
  tipo: 'CUPONS' | 'NEWSLETTER' | 'BANNER';
  titulo: string;
  subtitulo: string;
  texto_botao: string;
  imagem_url: string;
  cupons_ids: string[];
  cores?: { fundo?: string; texto?: string; botao_fundo?: string; botao_texto?: string };
  botao_link?: string;
};
```

### 2.4 Atualizar interfaces `FooterConfig` e `FooterLink` em `src/services/saas-api.ts`

Alteracoes na interface `FooterLink` (linha 104):

```text
// ANTES:
export interface FooterLink {
  label: string;
  pagina_slug?: string;
  url?: string;
}

// DEPOIS:
export interface FooterLink {
  nome: string;    // renomeado de "label" para consistencia
  url: string;     // URL livre (relativa ou absoluta)
}
```

Alteracoes na interface `FooterConfig` (linha 115):

```text
// ADICIONAR ao FooterConfig:
export interface FooterConfig {
  colunas: FooterColuna[];
  newsletter: boolean;
  redes_sociais: { ... };  // inalterado
  selos: { ativo: boolean; url: string };
  texto_copyright: string;
  texto_endereco: string;
  texto_cnpj: string;
  // NOVOS CAMPOS:
  cores?: {
    fundo?: string;
    texto?: string;
  };
}
```

**NOTA sobre retrocompatibilidade**: O campo `FooterLink` antigo usava `label` + `pagina_slug`. O novo usa `nome` + `url`. No `LojaFooter`, adicionaremos fallback para ler `link.label` caso `link.nome` nao exista, e `link.pagina_slug` caso `link.url` esteja vazio, garantindo que lojas existentes nao quebrem.

### 2.5 Adicionar `leadsApi` e `cuponsPopupApi` em `src/services/saas-api.ts`

```text
leadsApi.subscribe(lojaId, email, origem)  -> POST /loja-extras?scope=lead-newsletter
leadsApi.list(lojaId)                      -> GET  /loja-extras?scope=leads&loja_id=X
leadsApi.update(id, data)                  -> PUT  /loja-extras?scope=lead&id=X
leadsApi.delete(id)                        -> DELETE /loja-extras?scope=lead&id=X
leadsApi.import(lojaId, emails, origem)    -> POST /loja-extras?scope=leads-import
cuponsPopupApi.getBulk(lojaId, ids)        -> GET  /loja-extras?scope=cupons-popup&loja_id=X&ids=a,b,c
```

### 2.6 Adicionar hooks em `src/hooks/useLojaExtras.tsx`

- `useLeads(lojaId)` - query
- `useSubscribeNewsletter()` - mutation
- `useUpdateLead()` - mutation
- `useDeleteLead()` - mutation
- `useImportLeads()` - mutation

---

## PARTE 3: Painel do Lojista - Config do Popup

**Arquivo:** `src/pages/painel/LojaTemas.tsx`

Nova secao "Popup de Boas-Vindas" dentro das tabs existentes:

1. Switch ativo/inativo
2. Select tipo: CUPONS, NEWSLETTER, BANNER
3. Campos comuns: titulo (max 60), subtitulo (max 120), texto_botao (max 30), imagem_url (ImageUploader)
4. Campos dinamicos por tipo:
   - CUPONS: Multi-select com checkboxes dos cupons ativos
   - NEWSLETTER: Campos comuns apenas
   - BANNER: Campos comuns + botao_link (max 500)
5. 4 color pickers opcionais com fallback ao tema global

---

## PARTE 4: Painel do Lojista - Configuracao do Footer (NOVA)

**Arquivo:** `src/pages/painel/LojaTemas.tsx` (aba Footer, linhas 1079-1143)

### 4.1 Cores Independentes do Footer

Adicionar um novo bloco "Cores do Rodape" na aba Footer, ANTES do bloco de Colunas Navegaveis:

- **Color picker "Cor de Fundo do Rodape"**: Input tipo `color` ligado a `footer.cores.fundo`. Placeholder mostra fallback: "Padrao: cor de superficie do tema (bg_surface)".
- **Color picker "Cor do Texto do Rodape"**: Input tipo `color` ligado a `footer.cores.texto`. Placeholder mostra fallback: "Padrao: cor de texto do tema (text_primary)".
- Botao "Resetar para padrao" que limpa ambos os campos (seta `undefined`), fazendo o footer voltar a herdar as cores do tema global.

Estado inicial: `footer.cores` pode ser `undefined` (fallback automatico) ou um objeto `{ fundo, texto }`.

### 4.2 Colunas Dinamicas com URLs Livres

Refatorar completamente o bloco "Colunas Navegaveis" (linhas 1091-1112):

**ANTES**: 3 colunas fixas, cada link usa dropdown `Select` com paginas pre-cadastradas.

**DEPOIS**:
- Titulo muda de "Colunas Navegaveis (3)" para "Colunas do Rodape"
- Botao "+ Adicionar Coluna" no topo (maximo 5 colunas)
- Cada coluna renderiza:
  - Input para titulo da coluna + botao Lixeira para remover a coluna inteira
  - Lista de links, cada um com:
    - Input "Nome do link" (max 50 chars)
    - Input "URL" tipo texto livre (placeholder: "/contato ou https://...") - max 500 chars
    - Botao Lixeira para remover o link
  - Botao "+ Adicionar Link" no final de cada coluna (maximo 8 links por coluna)
- Helpers a atualizar:
  - `addColuna()`: push `{ titulo: '', links: [] }` no array
  - `removeColuna(idx)`: splice do array
  - `updateLink()`: agora salva `nome` e `url` (em vez de `label` e `pagina_slug`)
  - `addLinkToColuna()`: push `{ nome: '', url: '' }`

### 4.3 Validacao de Redes Sociais

No bloco de Redes Sociais (linhas 1120-1127), adicionar validacao visual: se o switch estiver ativo mas a URL estiver vazia, exibir borda vermelha no input (`border-destructive`) como alerta.

### 4.4 DEFAULT_FOOTER Atualizado

```text
const DEFAULT_FOOTER: FooterConfig = {
  colunas: [],   // array vazio em vez de 3 colunas fixas vazias
  newsletter: false,
  redes_sociais: {
    instagram: { ativo: false, url: '' },
    tiktok: { ativo: false, url: '' },
    facebook: { ativo: false, url: '' },
    youtube: { ativo: false, url: '' },
  },
  selos: { ativo: false, url: '#' },
  texto_copyright: '',
  texto_endereco: '',
  texto_cnpj: '',
  cores: undefined,
};
```

---

## PARTE 5: Loja Publica - WelcomePopup + Footer Premium Responsivo

### 5.1 Refatorar `WelcomePopup` em `src/components/LojaLayout.tsx`

Reescrever o componente (linhas 213-270):

- Gatilho: 2.5s na Home e em rotas de produto. `sessionStorage('popup_seen')` 1x por sessao.
- Cores opcionais com fallback CSS
- Renderizacao por tipo:
  - CUPONS: Fetch cupons, exibir cards, "Resgatar" salva em `sessionStorage('popup_cupons')`, toast
  - NEWSLETTER: Input email + validacao + `leadsApi.subscribe(lojaId, email, 'POPUP')`, toast
  - BANNER: Imagem + textos + botao com link

### 5.2 Refatorar `LojaFooter` em `src/components/LojaLayout.tsx` (linhas 105-178)

Props atualizadas:

```text
LojaFooter({
  footer: FooterConfig | null,
  nome: string,
  slug: string,
  lojaId: string,
  logo: LogoConfig | null,
  icone: string
})
```

**BLOCO 1 - Newsletter (topo do footer):**
- Condicional: renderiza se `footer.newsletter === true` (independente de qualquer outra config)
- Fundo com contraste sutil usando `footer.cores?.fundo` escurecido em 10%, ou `bg-black/5` como fallback
- Mobile: `flex-col` centralizado (titulo, subtitulo, input empilhados)
- Desktop: `md:flex md:justify-between md:items-center` (textos esquerda, form direita)
- Submit chama `leadsApi.subscribe(lojaId, email, 'FOOTER')` + toast

**BLOCO 2 - Grid de Navegacao e Marca:**

Cores aplicadas via inline style:
- `backgroundColor: footer.cores?.fundo || undefined` (fallback herda `bg-card` via classe Tailwind)
- `color: footer.cores?.texto || undefined` (fallback herda `text-foreground`)

Desktop (`md:`):
- Grid dinamico: `md:grid md:grid-cols-{N+1}` onde N = numero de colunas configuradas
- PRIMEIRA coluna: Logo da loja (max-h-12, SEMPRE visivel) + icones de redes sociais abaixo
- PROXIMAS colunas: Titulo `font-semibold` + lista de links visivel (sem sanfona)
- Links usam `link.nome || link.label` para retrocompatibilidade
- Se `link.url` comeca com `/` ou `#`, usa `<Link to={url}>`. Caso contrario, usa `<a href={url} target="_blank">`.

Mobile:
- `flex-col` centralizado
- Logo centralizada (max-h-12) + icones de redes sociais centralizados
- Colunas navegaveis como `Accordion` (Radix, ja existente) fechado por padrao
- Cada `AccordionItem` com titulo como trigger e links como conteudo

Icones de redes sociais (lucide-react: `Instagram`, `Music2`, `Facebook`, `Youtube`):
- Renderiza APENAS se `rede.ativo === true` E `rede.url` nao for vazia e nao for `"#"`
- Se nenhuma rede atende a condicao, o bloco de icones e ocultado

**BLOCO 3 - Creditos:**
- Divisor `border-t` com cor derivada de `footer.cores?.texto` em 20% opacidade, ou `border-border`
- Mobile: empilhado e centralizado
- Desktop: `md:flex md:justify-between` (copyright esquerda, CNPJ + endereco direita)

### 5.3 Newsletter no Footer

Integrada no BLOCO 1 conforme descrito acima. Usa `leadsApi.subscribe(lojaId, email, 'FOOTER')`. Validacao de email com regex antes do submit.

---

## PARTE 6: Auto-Apply no Checkout

**Arquivo:** `src/pages/loja/LojaCheckout.tsx`

`useEffect` de mount:
1. Verificar `sessionStorage.getItem('popup_cupons')`
2. Parsear array de codigos
3. Validar primeiro cupom via API
4. Se valido, aplicar e exibir toast
5. Nao sobrescrever cupom manual
6. Remover do sessionStorage apos uso

---

## PARTE 7: Painel do Lojista - Gestao de Newsletter/Leads

### 7.1 Criar `src/pages/painel/LojaNewsletter.tsx`

Pagina seguindo padrao visual de `LojaClientes.tsx`:

**Cabecalho:** Titulo "Newsletter" + botoes "Importar" e "Exportar CSV"

**Filtros:** Busca por email, filtro por origem (Popup/Footer), vinculo (Cliente/Visitante), data (7/30/90 dias)

**DataTable:**
- Checkbox de selecao multipla
- Colunas: Email, Origem (badge POPUP/FOOTER), Data (DD/MM/AAAA), Vinculo (badge Cliente Cadastrado / Visitante)
- Acoes: Editar (lapiz -> dialog para alterar email), Excluir (lixeira -> confirmacao)
- Barra de acoes em massa (excluir selecionados)

**Modal de Importacao:** Textarea (um email por linha) + select origem + botao importar

**Exportar CSV:** Gerado no frontend com colunas Email, Origem, Data, Vinculo

### 7.2 Registrar rota e menu

- `src/App.tsx`: Rota `loja/:id/newsletter` -> `LojaNewsletter`
- `src/components/layout/PainelLayout.tsx`: Item "Newsletter" com icone `Mail` no submenu

---

## Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| `models/Lead.js` | **CRIAR** |
| `api/loja-extras.js` | EDITAR - 7 novos escopos |
| `src/services/saas-api.ts` | EDITAR - FooterLink, FooterConfig (cores), popup type, leadsApi, cuponsPopupApi |
| `src/hooks/useLojaExtras.tsx` | EDITAR - hooks de leads |
| `src/pages/loja/LojaProduto.tsx` | EDITAR - pre-selecao + ocultar bloco mobile |
| `src/components/LojaLayout.tsx` | EDITAR - WelcomePopup + Footer premium (cores, accordion, redes, newsletter) |
| `src/pages/painel/LojaTemas.tsx` | EDITAR - secao popup + footer (cores indep., colunas dinamicas, URLs livres) |
| `src/pages/loja/LojaCheckout.tsx` | EDITAR - auto-apply cupom |
| `src/pages/painel/LojaNewsletter.tsx` | **CRIAR** |
| `src/App.tsx` | EDITAR - nova rota newsletter |
| `src/components/layout/PainelLayout.tsx` | EDITAR - menu newsletter |
| `vite.config.mts` | INTOCAVEL |
| `vercel.json` | SEM ALTERACAO |

## Ordem de Implementacao

1. `models/Lead.js` (dependencia zero)
2. `api/loja-extras.js` (depende do model)
3. `src/services/saas-api.ts` (tipos + APIs - inclui FooterConfig atualizado)
4. `src/hooks/useLojaExtras.tsx` (hooks)
5. `src/pages/loja/LojaProduto.tsx` (UX variacoes - independente)
6. `src/pages/painel/LojaTemas.tsx` (config popup + footer refatorado com cores e colunas dinamicas)
7. `src/components/LojaLayout.tsx` (WelcomePopup + Footer premium responsivo com newsletter)
8. `src/pages/loja/LojaCheckout.tsx` (auto-apply)
9. `src/pages/painel/LojaNewsletter.tsx` + rota + menu

## Conformidade MASTER RULES

1. `vite.config.mts`: intocavel
2. Vercel: 12 arquivos mantidos (escopos em `loja-extras.js`)
3. Cores: footer tem cores independentes com fallback para tema global; popup idem
4. Sem achismos: todas as regras de negocio explicitadas
5. Ponta a ponta: Model -> API -> Service -> Hook -> UI
6. Validacoes: email regex, max chars em todos os inputs, index unico no banco
7. Sincronia: `saas-api.ts` atualizado; `vercel.json` inalterado

