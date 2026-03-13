

# Plano: Otimização do GlobalSearch — Renderização Condicional, Deep Links e Fuzzy Match

## Arquivos modificados: 2

---

## Fase 1: Renderização Condicional (`PainelLayout.tsx`)

**Linha 305-313** — O bloco IIFE que renderiza `<GlobalSearch>` será envolvido em condicional:

```tsx
{(() => {
  const lojaMatch = location.pathname.match(/\/painel\/loja\/([^/]+)/);
  const activeLojaId = lojaMatch ? lojaMatch[1] : null;
  if (!activeLojaId) return null;  // ← esconde fora de contexto de loja
  return (
    <div className="mb-4">
      <GlobalSearch lojaId={activeLojaId} />
    </div>
  );
})()}
```

Quando `activeLojaId` for `null` (tela inicial `/painel`, `/painel/perfil`, etc.), nenhum trigger visual será renderizado.

**Atalho de teclado** — No `GlobalSearch.tsx` (linha 84-93), o handler `Ctrl+K` já depende do componente estar montado. Como o componente não será montado sem loja ativa, o atalho automaticamente deixa de funcionar fora de contexto. Nenhuma mudança extra necessária.

---

## Fase 2: Enriquecimento do NAV_INDEX (`GlobalSearch.tsx`)

Adicionar 6 novas entradas como "Deep Links" para subseções. Serão inseridas nos grupos existentes, logo após suas entradas-pai:

```text
NAV_INDEX expandido (novas entradas marcadas com +):

Loja Virtual:
  Temas
+ Banners e Destaques    → /temas   | ['banner', 'carrossel', 'imagens', 'slideshow', 'destaque']
+ Cabeçalho da Loja      → /temas   | ['header', 'cabeçalho', 'logo', 'menu', 'navegação']
  Páginas
  Conteúdo

Administração:
  Perfil da Loja
+ Endereço de Origem      → /perfil-loja | ['cep', 'rua', 'origem', 'remetente', 'endereco origem']
  Fretes
  Gateways
  Integrações
  Configurações
+ Modo Orçamento          → /configuracoes | ['orcamento', 'whatsapp', 'orçar', 'budget']
+ Domínio                 → /configuracoes | ['dominio', 'url', 'site', 'cname', 'dns']
+ Endereço Interno        → /configuracoes | ['subdominio', 'endereço interno', 'link interno']

Conta (absolute, mantidos como estão):
  Meu Perfil
  Assinatura
```

Ícones: `Image` para Banners, `LayoutTemplate` para Cabeçalho, `Settings` para Modo Orçamento/Domínio/Endereço Interno, `Truck` para Endereço de Origem. (Importações já existentes no arquivo.)

---

## Fase 3: Fuzzy Match via `value` do CommandItem

A propriedade `value` nos `CommandItem` estáticos **já está implementada corretamente** (linha ~234 do código atual):

```tsx
value={`${item.title} ${item.subtitle} ${item.keywords.join(' ')}`}
```

Com as novas keywords enriquecidas, digitar "bann", "logo", "cep" ou "orcamento" já fará match direto pelo `cmdk`. Nenhuma mudança estrutural necessária nesta parte — apenas garantir que as novas entradas seguem o mesmo padrão de `value`.

---

## Resumo de edições

| Arquivo | Mudança |
|---|---|
| `PainelLayout.tsx` | Adicionar `if (!activeLojaId) return null` no bloco do GlobalSearch (1 linha) |
| `GlobalSearch.tsx` | Adicionar 6 entradas ao `NAV_INDEX` (~12 linhas) |

Impacto zero em outros arquivos. Sem novos imports necessários.

