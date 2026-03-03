

## Plano: Tolerância por lojista para taxas + correção da tolerância de mensalidade

### Diagnóstico

**Mensalidade:**
- `api/lojas.js` (linha 166) e `PainelLayout.tsx` (linha 285) usam `toleranciaGlobal = 7` **hardcoded**, ignorando o setting `dias_tolerancia_inadimplencia` do admin.
- `lib/auth.js` (`checkTolerancia`) recebe `diasGlobal` como parâmetro (default 5), mas quem o chama precisa passar o valor do setting — preciso verificar se alguém chama essa função.
- O campo `tolerancia_extra_dias` no perfil do lojista (admin) funciona corretamente somando à global, mas a global está errada (hardcoded).

**Taxas:**
- Quando atinge 3 tentativas, o cron seta `status_taxas = 'bloqueado'` mas **não salva uma data de quando foi bloqueado**. O `data_vencimento_taxas` nesse momento não é atualizado (fica com o último valor da tentativa anterior).
- Não existe campo `tolerancia_extra_dias_taxas` no modelo Lojista nem no painel admin.
- Não existe lógica de bloqueio real (White-label Extremo) por taxas.

### Alterações

#### 1. Modelo Lojista — novo campo
**`models/Lojista.js`**: Adicionar `tolerancia_extra_dias_taxas: { type: Number, default: 0 }` e `data_bloqueio_taxas: { type: Date, default: null }` (para registrar quando virou `bloqueado`).

#### 2. Cron — salvar data de bloqueio
**`lib/services/assinaturas/stripe.js`** (linha 401): Quando `status_taxas = 'bloqueado'`, salvar `lojista.data_bloqueio_taxas = new Date()`.

#### 3. Corrigir tolerância global de mensalidade (hardcoded → setting)
**`api/lojas.js`** (linha 166): Carregar `dias_tolerancia_inadimplencia` do Setting (já importado ali). Default 5.

**`src/components/layout/PainelLayout.tsx`** (linha 285): Carregar o setting via `settingsApi.getByKeys(['dias_tolerancia_inadimplencia'])` no `useEffect` existente. Usar valor real em vez de 7.

#### 4. Bloqueio real por taxas na API pública
**`api/lojas.js`**: Após o bloco de `past_due`, adicionar: se `dono.status_taxas === 'bloqueado'` e `!dono.modo_amigo`, carregar setting `dias_tolerancia_taxas` (default 3), somar `dono.tolerancia_extra_dias_taxas || 0`, calcular dias desde `dono.data_bloqueio_taxas`. Se excedeu, retornar `403 is_blocked`.

#### 5. Admin — setting global de tolerância de taxas
**`src/pages/AdminConfigEmpresa.tsx`**: Adicionar `dias_tolerancia_taxas` ao `SETTING_KEYS` e ao form (default `3`), com input abaixo de "Dias de Tolerância Padrão".

#### 6. Admin — campo extra por lojista para taxas
**`src/pages/AdminLojistas.tsx`**: No card "Controle de Tolerância", adicionar campo "Dias Extras de Tolerância para Taxas" que salva `tolerancia_extra_dias_taxas`.

**`api/admins.js`** (action `tolerancia`): Aceitar e salvar `tolerancia_extra_dias_taxas`.

#### 7. Banners de taxas no PainelLayout
**`src/components/layout/PainelLayout.tsx`**: Após o bloco de `past_due`, adicionar:
- `status_taxas === 'falha'`: Banner amarelo "Cobrança de taxas falhou. Regularize."
- `status_taxas === 'bloqueado'`: Banner vermelho com data limite calculada (`data_bloqueio_taxas` + tolerância global + extra).

#### 8. Data limite no LojaAssinatura
**`src/pages/painel/LojaAssinatura.tsx`**: No banner de bloqueio de taxas, carregar settings e calcular/exibir "Regularize até DD/MM/AAAA para evitar a suspensão."

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `models/Lojista.js` | Campos `tolerancia_extra_dias_taxas` e `data_bloqueio_taxas` |
| `lib/services/assinaturas/stripe.js` | Salvar `data_bloqueio_taxas` no bloqueio |
| `api/lojas.js` | Usar setting real para mensalidade + bloqueio real por taxas |
| `api/admins.js` | Aceitar `tolerancia_extra_dias_taxas` na action tolerancia |
| `src/pages/AdminConfigEmpresa.tsx` | Campo `dias_tolerancia_taxas` |
| `src/pages/AdminLojistas.tsx` | Campo extra de tolerância de taxas por lojista |
| `src/components/layout/PainelLayout.tsx` | Setting real para mensalidade + banners de taxas |
| `src/pages/painel/LojaAssinatura.tsx` | Data limite no banner de bloqueio |

### Fluxo temporal das taxas (resumo)

```text
Tentativa 1 falha → status_taxas = 'falha' (retry em 24h)
Tentativa 2 falha → status_taxas = 'falha' (retry em 24h)
Tentativa 3 falha → status_taxas = 'bloqueado', data_bloqueio_taxas = agora
                     ↓
              Tolerância começa a correr
              (dias_tolerancia_taxas + tolerancia_extra_dias_taxas)
                     ↓
              Expirou → White-label Extremo (403 is_blocked)
```

