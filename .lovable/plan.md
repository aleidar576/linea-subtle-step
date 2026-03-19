

## Plano Enterprise / Sob Medida — CTA via WhatsApp

### Resumo
Adicionar 4 campos ao Plano (`isSobMedida`, `textoBotao`, `whatsappNumero`, `whatsappMensagem`) para permitir que um plano "Enterprise" redirecione para WhatsApp em vez do checkout Stripe, com preço exibido como "Sob Medida" quando zerado.

### Alterações

**1. `models/Plano.js` — 4 novos campos no schema**
- `isSobMedida: { type: Boolean, default: false }`
- `textoBotao: { type: String, default: '' }`
- `whatsappNumero: { type: String, default: '' }`
- `whatsappMensagem: { type: String, default: '' }`

**2. `src/services/saas-api.ts` — Interface `Plano` (linha ~692)**
- Adicionar `isSobMedida: boolean`, `textoBotao: string`, `whatsappNumero: string`, `whatsappMensagem: string`

**3. `src/pages/AdminPlanos.tsx` — Formulário**
- Adicionar os 4 campos à `PlanoForm` e ao `emptyForm`
- Em `openEdit`, mapear os novos campos
- No modal, após o Switch "Destaque", nova seção "Configuração do Botão e CTA":
  - Input "Texto Customizado do Botão" (placeholder: "Ex: Falar com especialista")
  - Switch "Ativar Modo Sob Medida (Venda via WhatsApp)"
  - Condicional: se `isSobMedida` ativo, renderizar inputs "Número do WhatsApp" (placeholder: "5511999999999") e "Mensagem Predefinida" (textarea)
- Relaxar validação: se `isSobMedida`, `stripe_price_id` não é obrigatório

**4. `src/pages/painel/LojaAssinatura.tsx` — Renderização**
- **Preço**: Se `isSobMedida && preco_promocional === 0`, ocultar R$/valor/mês e renderizar `<span className="text-4xl font-black">Sob Medida</span>`. Ocultar também a linha de taxa de transação.
- **CTA**: Texto = `plano.textoBotao || 'Começar 7 Dias Grátis'`. Se `isSobMedida`, onClick faz `window.open(\`https://wa.me/${plano.whatsappNumero}?text=${encodeURIComponent(plano.whatsappMensagem)}\`, '_blank')` em vez de `handleCheckout`. Ícone muda para `MessageCircle` (lucide) quando sob medida.

### Arquivos alterados
- `models/Plano.js`
- `src/services/saas-api.ts`
- `src/pages/AdminPlanos.tsx`
- `src/pages/painel/LojaAssinatura.tsx`

