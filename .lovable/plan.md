# Redesign Menu Lateral + Split Configuracoes — IMPLEMENTADO

## Status: ✅ Concluído

## Alteracoes Realizadas

### 1. `models/Loja.js` — Novos campos empresa e endereco
- Adicionados `empresa` e `endereco` dentro de `configuracoes`

### 2. `api/lojas.js` — Bug fix slogan
- Adicionado `slogan` ao array `allowed` no PUT (linha 290)

### 3. `src/services/saas-api.ts` — Novas interfaces
- Criadas `LojaEmpresa` e `LojaEndereco`
- Adicionadas à interface `Loja.configuracoes`

### 4. `src/pages/painel/LojaPerfilLoja.tsx` — Nova tela
- Card 1: Identidade (nome, nome_exibicao, slogan, favicon)
- Card 2: Empresa (tipo CPF/CNPJ com mascara, telefone, email suporte)
- Card 3: Endereco (CEP com ViaCEP, UF com Select de 27 estados)
- Mascaras: CPF, CNPJ, telefone, CEP
- Salva via useUpdateLoja com merge correto de configuracoes

### 5. `src/pages/painel/LojaConfiguracoes.tsx` — Limpeza
- Removidos campos de identidade (nome, slogan, favicon)
- Mantidos: exigir_cadastro, subdominio, dominio customizado

### 6. `src/components/layout/PainelLayout.tsx` — Redesign sidebar
- Menu agrupado com Collapsible: Produtos, Vendas, Loja Virtual, Marketing, Administracao
- Perfil da Loja adicionado ao grupo Administracao
- Grupo ativo abre automaticamente (defaultOpen)

### 7. `src/App.tsx` — Nova rota
- Adicionada rota `/painel/loja/:id/perfil-loja`

# Redesign Editor de Produtos — IMPLEMENTADO

## Status: ✅ Concluído

## Alteracoes Realizadas

### 1. `models/Product.js` — Campo dimensoes (strict schema)
- Adicionado `dimensoes: { peso, altura, largura, comprimento }` com tipos Number e defaults 0
- Schema estrito (não Mixed) para segurança na futura integração de fretes

### 2. `src/services/saas-api.ts` — Interface atualizada
- Adicionado `dimensoes?: { peso: number; altura: number; largura: number; comprimento: number }` na interface `LojaProduct`

### 3. `src/pages/painel/LojaProdutos.tsx` — Redesign completo do Editor
- **Sticky Header**: `position: sticky top-0 z-50` com backdrop-blur, contendo:
  - Botão Voltar + Nome do produto
  - Switch "Produto Ativo" (migrado da aba Extras)
  - Dropdown "Opções" (Duplicar, JSON Import/Export, JSON Exemplo)
  - Único botão "Salvar" primário
- **Barra inferior removida**: Sem mais duplicação de botões Salvar/Cancelar
- **Background**: `bg-muted/30` com conteúdo em Cards shadcn
- **Aba Básico**: 3 Cards (Info Gerais, Preço/Promoção, Categorias/Destaques) + Card Imagens na lateral
- **Aba Variações**: Card único com variações em grid horizontal `grid-cols-6`
- **Aba Avaliações**: Accordion shadcn com auto-expand ao criar nova avaliação via `expandedReviews` state
- **Aba Frete**: Card "Dimensões e Peso" (4 inputs numéricos) + Card "Frete Manual"
- **Aba Extras**: 3 Cards semânticos (Escassez, Prova Social, Upsell/Exibição)
