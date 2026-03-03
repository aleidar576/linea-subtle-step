

## Plano de Correção: Banners e datas não aparecendo

### Problema raiz

1. **`data_bloqueio_taxas` não existe no MongoDB** — o campo foi adicionado ao schema mas o lojista já estava bloqueado antes do deploy. No PainelLayout, `if (!dataBloqueio) return null` faz o banner desaparecer completamente.

2. **`tolerancia_global_inadimplencia` não vem da API** — o PainelLayout tenta ler `lojistaProfile.tolerancia_global_inadimplencia` mas a API `/lojista` GET retorna apenas campos do modelo Lojista, sem settings globais. O PainelLayout precisa buscar os settings separadamente.

3. **PainelLayout banner de taxas usa tolerância hardcoded (3)** — deveria buscar o setting `dias_tolerancia_taxas` da API.

### Correções necessárias

#### 1. PainelLayout — buscar settings reais + fallback quando data_bloqueio_taxas é null
**`src/components/layout/PainelLayout.tsx`**:
- No `useEffect` que carrega o perfil, também buscar `settingsApi.getByKeys(['dias_tolerancia_inadimplencia', 'dias_tolerancia_taxas'])`.
- No banner de mensalidade: usar o setting real em vez de `lojistaProfile.tolerancia_global_inadimplencia`.
- No banner de taxas bloqueadas: se `data_bloqueio_taxas` é null mas `status_taxas === 'bloqueado'`, ainda exibir o banner (sem data específica, mas com o aviso genérico de suspensão iminente).

#### 2. LojaAssinatura — fallback quando data_bloqueio_taxas é null
**`src/pages/painel/LojaAssinatura.tsx`**:
- Quando `status_taxas === 'bloqueado'` mas `data_bloqueio_taxas` é null, exibir o banner vermelho sem a data limite (mensagem genérica "Regularize o mais rápido possível para evitar suspensão").

### Nota sobre o MongoDB
O campo `data_bloqueio_taxas` precisa ser adicionado manualmente no MongoDB para este lojista de teste. Valor sugerido: a data em que ele atingiu 3 tentativas (ou `new Date()` para testar). Futuros lojistas terão o campo preenchido automaticamente pelo cron.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/components/layout/PainelLayout.tsx` | Buscar settings reais + fallback para banner sem data |
| `src/pages/painel/LojaAssinatura.tsx` | Fallback no banner quando data_bloqueio_taxas é null |

