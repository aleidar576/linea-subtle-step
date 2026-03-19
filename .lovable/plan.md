
Atualização planejada para `vite.config.mts`:

1. Remover `experimentalMinChunkSize: 10000`
   - Como você pediu, a fragmentação passará a ser resolvida pela regra catch-all de `manualChunks`, não mais por fusão heurística de chunks pequenos.

2. Reestruturar `manualChunks(id)` em ordem de prioridade simples
   - Primeiro: agrupar componentes internos de `src/components/ui` em `ui-components`
   - Depois: chunks semânticos para bibliotecas conhecidas
     - `lucide-react` → `vendor-icons`
     - `react` / `react-dom` → `vendor-react`
     - `@radix-ui` → `vendor-radix`
     - `recharts` / `d3-*` → `vendor-charts`
     - `framer-motion` → `vendor-motion`

3. Adicionar a “rede de proteção” final
   - Qualquer módulo restante de `node_modules` cairá em `vendor`
   - Isso evita que dependências externas menores continuem sendo emitidas como micro-chunks soltos

4. Preservar o restante do arquivo exatamente como está
   - `server`
   - `plugins`
   - `resolve.alias`
   - `dedupe`
   - restante da estrutura de `build.rollupOptions`

Resultado esperado:
- redução drástica da quantidade de arquivos gerados
- eliminação dos micro-chunks residuais de dependências externas
- terminal de build mais limpo e deploy da Vercel mais previsível

Detalhe técnico:
```ts
manualChunks(id) {
  if (id.includes("/src/components/ui/") || id.includes("/components/ui/")) return "ui-components";

  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
  if (id.includes("@radix-ui")) return "vendor-radix";
  if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
  if (id.includes("framer-motion")) return "vendor-motion";

  if (id.includes("node_modules")) return "vendor";
}
```
