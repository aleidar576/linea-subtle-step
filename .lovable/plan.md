

## Refatoração UX da aba Footer — LojaTemas.tsx

### Escopo
Linhas 1308-1497: substituir o conteúdo de `<TabsContent value="footer">` por um `<Accordion>` com 4 seções colapsáveis. Zero alterações em state/handlers.

### Imports
Adicionar `Palette, Link2, Shield` aos ícones já importados (linha 7-9). `MessageSquare` já existe.

### Nova estrutura JSX

```
<TabsContent value="footer" className="space-y-4">
  <Accordion type="single" collapsible className="w-full space-y-4">

    <!-- Seção 1: Estilo e Identidade -->
    <AccordionItem value="estilo" className="border rounded-xl shadow-sm">
      <AccordionTrigger> <Palette /> Estilo e Identidade </AccordionTrigger>
      <AccordionContent>
        <Card className="p-6 space-y-6">
          <!-- Cores do Rodapé (grid-cols-2) + botão Resetar -->
          <!-- L1318-1340 movido para cá -->
          
          <Separator />
          
          <!-- Personalizar Logo do Footer -->
          <!-- L1434-1488 movido para cá -->
        </Card>
      </AccordionContent>
    </AccordionItem>

    <!-- Seção 2: Colunas e Navegação -->
    <AccordionItem value="colunas" className="border rounded-xl shadow-sm">
      <AccordionTrigger> <Link2 /> Colunas e Navegação </AccordionTrigger>
      <AccordionContent>
        <Card className="p-6 space-y-4">
          <!-- Construtor de colunas -->
          <!-- L1342-1372 movido para cá -->
          <!-- Cada coluna envolta em border rounded-md p-4 mb-4 bg-muted/10 -->
        </Card>
      </AccordionContent>
    </AccordionItem>

    <!-- Seção 3: Engajamento e Redes Sociais -->
    <AccordionItem value="engajamento" className="border rounded-xl shadow-sm">
      <AccordionTrigger> <MessageSquare /> Engajamento e Redes Sociais </AccordionTrigger>
      <AccordionContent>
        <Card className="p-6 space-y-6">
          <!-- WhatsApp Flutuante (L1309-1316) -->
          <Separator />
          <!-- Newsletter toggle + cores (L1377-1406) -->
          <Separator />
          <!-- Redes Sociais em grid-cols-1 md:grid-cols-2 (L1408-1425) -->
        </Card>
      </AccordionContent>
    </AccordionItem>

    <!-- Seção 4: Informações Legais e Confiança -->
    <AccordionItem value="legal" className="border rounded-xl shadow-sm">
      <AccordionTrigger> <Shield /> Informações Legais e Confiança </AccordionTrigger>
      <AccordionContent>
        <Card className="p-6 space-y-6">
          <!-- Textos do Rodapé (L1491-1496) -->
          <Separator />
          <!-- Selos de Segurança (L1426-1432) -->
        </Card>
      </AccordionContent>
    </AccordionItem>

  </Accordion>
</TabsContent>
```

### Mudanças de estilização
- Remover todas as `div className="bg-card border border-border rounded-xl p-6"` externas (substituídas pelos AccordionItems + Card internos)
- Colunas do rodapé: cada coluna com `bg-muted/10` em vez de `border-border`
- Redes sociais: envolver em `grid grid-cols-1 md:grid-cols-2 gap-4`
- Inputs de cor já estão em `grid-cols-2` — manter

### Preservação de estado
Nenhum `useState`, handler ou lógica alterados. Apenas reorganização do JSX.

### Arquivo
`src/pages/painel/LojaTemas.tsx` — linhas 1306-1497

