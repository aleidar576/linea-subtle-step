

## Migração: `vantagens: string[]` para `topicos: [{nome, itens: [{titulo, descricao}]}]`

### Arquivos alterados

**1. `models/Plano.js`**
- Remover `vantagens: { type: [String], default: [] }`
- Adicionar subdocumento aninhado:
```javascript
topicos: [{
  nome: { type: String, required: true },
  itens: [{
    titulo: { type: String, required: true },
    descricao: { type: String, default: '' }
  }]
}]
```
- `limitacoes` permanece inalterado

**2. `src/pages/AdminPlanos.tsx`**

Tipagem:
```typescript
interface TopicoItem { titulo: string; descricao: string; }
interface Topico { nome: string; itens: TopicoItem[]; }

interface PlanoForm {
  // ... campos existentes ...
  topicos: Topico[];  // substitui vantagens
  limitacoes: string[];
}
```

Helpers de estado (substituem addVantagem/removeVantagem/updateVantagem):
- `addTopico()` -- push `{ nome: '', itens: [] }`
- `removeTopico(ti)` -- remove tópico por índice
- `updateTopicoNome(ti, nome)` -- atualiza nome do tópico
- `addItem(ti)` -- push `{ titulo: '', descricao: '' }` no tópico
- `removeItem(ti, ii)` -- remove item do tópico
- `updateItem(ti, ii, field, value)` -- atualiza titulo ou descricao

UI no Dialog (substitui a seção "Vantagens"):
- Seção "Tópicos de Recursos" com botão "+ Adicionar Novo Tópico"
- Cada tópico renderiza como um Card com borda, contendo:
  - Input para nome do tópico + botão remover tópico
  - Lista de itens, cada um com Input (título) + Textarea (descrição) + botão remover item
  - Botão "+ Adicionar Item" no rodapé do card
- Seção "Limitações" permanece abaixo, inalterada

Tabela: coluna "Vantagens" muda para "Tópicos" exibindo count de `(p.topicos || []).length`

`openEdit`: carrega `topicos: p.topicos || []` (e ignora `vantagens` legado)

### Resultado
Estrutura hierárquica pronta para renderização em Accordion no storefront. Compatível com MongoDB (subdocuments nativos, sem migration necessária).

