

## ✅ CONCLUÍDO: Eliminar Flash Fantasma + Tokenizar Arquivos Críticos

### FRENTE 1 — Flash Fantasma (RESOLVIDO)
- `src/index.css`: Variáveis `:root` e `.dark` sincronizadas com paleta oficial (#00D1FF primary, #09090B dark bg)
- `src/components/SaaSBrand.tsx`: Fallbacks hex atualizados (#00D1FF, #E44F30, #09090B, #FAFAFA)

### FRENTE 2 — Tokenização (RESOLVIDO)
Cores hardcoded substituídas por tokens semânticos em 16 arquivos:

| Arquivo | Mudança |
|---|---|
| `AdminEstatisticas.tsx` | Ícones + chart fill → `text-primary`, `hsl(var(--primary))` |
| `LojaAssinatura.tsx` | STATUS_MAP + badges + CTA → primary/secondary/destructive tokens |
| `LojaPedidos.tsx` | STATUS_MAP completo → tokens semânticos |
| `PedidoDetailModal.tsx` | STATUS_MAP duplicado → mesmos tokens |
| `PainelInicio.tsx` | Checklist + badge Ativa → `text-primary`, `Badge variant="success"` |
| `AdminLojistas.tsx` | Badges de status → primary/secondary tokens |
| `AdminSetup.tsx` | Ícones amber/green → `text-secondary`, `text-primary` |
| `LojaProdutos.tsx` | Validações, stars, JSON preview → tokens |
| `LojaIntegracoes.tsx` | Badge ativo → `bg-primary/15 text-primary` |
| `LojaPerfil.tsx` | Ícone copy → `text-primary` |
| `AdminForgotPassword.tsx` | Success icon → `bg-primary/10 text-primary` |
| `AdminResetPassword.tsx` | Success icon → `bg-primary/10 text-primary` |
| `LojaConfiguracoes.tsx` | Warnings amber → `text-secondary` |
| `LojaGateways.tsx` | Warnings yellow → `bg-secondary/15 text-secondary` |

### Arquivos intencionalmente NÃO alterados
- Vitrine Pública (`LojaCheckout`, `CheckoutPage`, `LojaHome`) — isolamento de tema
- `AdminConfigEmpresa.tsx` — cores simulam UI do Google (blue/green intencionais)
- `LojaTemas.tsx` — verde do WhatsApp é cor de marca
- `ChatWidget.tsx` — dot verde "online" é indicador funcional
