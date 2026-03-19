

## Adicionar Cores de Branding à seção "Identidade Visual" em AdminConfigEmpresa

### Contexto
A seção "Identidade Visual" já existe em `src/pages/AdminConfigEmpresa.tsx` (linha 123). As cores de branding devem ser adicionadas ali — não como página separada. Essas cores afetarão todas as áreas do SaaS (admin, painel lojista, login, homepage), mas **não** a loja pública (que usa `cores_globais` do tema Market Tok).

### Alterações

**1. `src/pages/AdminConfigEmpresa.tsx`**
- Adicionar 6 keys ao `SETTING_KEYS`: `branding_cor_primaria`, `branding_cor_secundaria`, `branding_fundo_dark`, `branding_fundo_light`, `branding_texto_light`, `branding_texto_dark`
- Adicionar defaults no `form` state inicial: `#3CC7F5`, `#EE49FD`, `#1E1E2E`, `#FFFFFF`, `#F3F4F6`, `#111827`
- Na seção "Identidade Visual" (após logos/favicon, antes do card de SEO), adicionar:
  - Subtítulo "Cores do SaaS" com descrição explicativa
  - Grid 3x2 com 6 color pickers — cada um com `<input type="color">` + `Input` hex lado a lado
  - Seção de preview visual abaixo mostrando: botões primário/secundário, card em fundo dark com texto light, card em fundo light com texto dark, gradiente primária→secundária
  - Botão "Restaurar Padrões" que reseta os 6 campos aos valores default
- Tudo salva junto com o botão "Salvar Configurações" existente (já funciona via `settingsApi.upsert`)

**2. `src/components/SaaSBrand.tsx`**
- Adicionar as 6 keys de branding ao array `BRAND_KEYS`
- Expor no retorno de `useSaaSBrand()`: `corPrimaria`, `corSecundaria`, `fundoDark`, `fundoLight`, `textoLight`, `textoDark` com os defaults correspondentes
- Nenhuma aplicação visual ainda — apenas disponibilizar para uso futuro

### Arquivos alterados
- `src/pages/AdminConfigEmpresa.tsx` (adicionar cores na seção existente)
- `src/components/SaaSBrand.tsx` (expor cores no hook)

