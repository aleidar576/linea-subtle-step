

## Refatoração UX da aba Homepage — LojaTemas.tsx

### Problema
A aba Homepage (linhas 280-974, ~700 linhas de JSX) empilha linearmente 10+ blocos de configuração. O botão "Salvar" fica escondido na linha 1433. Causa scroll fatigue e sobrecarga cognitiva.

### Build errors (pré-existente)
Os erros de build (`Cannot find module`) são causados por um problema de ambiente (permissão negada no Vite), nao por código. Nao requerem alteração de código.

### Plano de implementação

**Arquivo:** `src/pages/painel/LojaTemas.tsx`

**1. Imports** — Adicionar `Accordion, AccordionContent, AccordionItem, AccordionTrigger` e ícones extras (`Crown, Megaphone, Users, Sparkles, Store`).

**2. Sticky Save Bar** — Mover o botão "Salvar" (linha 1433) para dentro de uma barra sticky no bottom do container principal, antes do `</div>` final:
```tsx
<div className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-md border-t p-4 flex justify-end">
  <Button onClick={handleSaveAll} disabled={saving}>
    {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
  </Button>
</div>
```
Adicionar `pb-20` no container pai para evitar sobreposição.

**3. Accordion com 5 seções** — Substituir o conteúdo de `<TabsContent value="homepage">` (linhas 280-974) por:

```
<Accordion type="single" collapsible className="w-full space-y-4">
```

| # | AccordionItem value | Titulo (com ícone) | Conteúdo movido (linhas originais) |
|---|---|---|---|
| 1 | `cabecalho` | `<Store /> Cabeçalho da Loja` | Logo (282-315) + Tarja do Topo (317-391) |
| 2 | `banners` | `<ImageIcon /> Banners e Destaques` | Banners carrossel (393-627) + Destaques (629-683) |
| 3 | `vitrines` | `<ShoppingBag /> Vitrines e Produtos` | Seções de produtos (685-748) |
| 4 | `prova-social` | `<Users /> Prova Social e Confiança` | Social proof (750-823) + Trust badges (850-875) |
| 5 | `engajamento` | `<Megaphone /> Engajamento e Rodapé` | Tarja inferior (825-848) + Popup boas-vindas (877-973) |

Cada `AccordionContent` envolve o conteúdo existente em `<Card className="p-6">`.

**4. Refatoração dos Banners** — Dentro da seção 2, cada banner individual (atualmente linhas 404-566) será reestruturado com `<Tabs>` internas:

```tsx
<Tabs defaultValue="midia" className="w-full">
  <TabsList className="grid grid-cols-4 w-full">
    <TabsTrigger value="midia">Mídia</TabsTrigger>
    <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
    <TabsTrigger value="badge">Badge</TabsTrigger>
    <TabsTrigger value="cores">Cores</TabsTrigger>
  </TabsList>
  <TabsContent value="midia">
    {/* Imagem desktop, imagem mobile, blur */}
  </TabsContent>
  <TabsContent value="conteudo">
    {/* Título, subtítulo, botão de ação */}
  </TabsContent>
  <TabsContent value="badge">
    {/* Badge texto, ícone, cores, transparência */}
  </TabsContent>
  <TabsContent value="cores">
    {/* Cores título, subtítulo, tamanhos */}
  </TabsContent>
</Tabs>
```

**5. Estilização Clean UI**
- Inputs de cor lado a lado em `grid grid-cols-2`
- Áreas de agrupamento com `bg-muted/30 rounded-lg p-4` em vez de bordas pesadas
- Accordion items com `border rounded-xl shadow-sm`

### Preservação de estado
Nenhum estado é alterado. Todos os `useState`, handlers e helpers permanecem idênticos. Apenas a estrutura JSX de apresentação muda. O `Accordion` do Radix/Shadcn monta/desmonta conteúdo via CSS (`overflow: hidden` + animação), mas os inputs controlados por React state (`value={...}`) mantêm seus valores independentemente de qual seção está aberta.

### Escopo
- Apenas a `<TabsContent value="homepage">` é alterada
- Nenhuma funcionalidade removida
- Nenhum state/handler modificado
- Botão save movido para sticky bar (afeta todo o componente, não só homepage)

