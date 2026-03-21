## Layout Premium Meloja — Implementação Completa ✅

### Arquivos Modificados (6 no total)

| Arquivo | Mudança |
|---|---|
| `models/LandingPageCMS.js` | +ctaIntermediario, +ctaFinal schemas |
| `api/landing-cms.js` | PUT destructuring atualizado |
| `src/services/saas-api.ts` | +CTAIntermediarioCMS, +CTAFinalCMS interfaces |
| `src/pages/AdminLandingPage.tsx` | +2 tabs CMS, helpers, hydration |
| `src/pages/LandingPage.tsx` | Hero inline CTA, carrossel infinito, FAQ 2-col, pricing split, CTAs |
| `src/index.css` | @keyframes scroll-infinite |

### Regras de Negócio
- Planos `isSobMedida === false` → bloco SaaS → `/registro`
- Planos `isSobMedida === true` → bloco Loja Pronta → WhatsApp
- CTA Hero usa `rounded-xl` (consistente com cards)
