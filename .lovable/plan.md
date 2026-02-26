
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
