# Arquitetura Temporal do Sistema

## Objetivo

Padronizar o sistema para operar corretamente em cenário multi-país e multi-loja, separando:

- persistência física de datas
- timezone de negócio da loja
- filtros e agregações temporais
- exibição no frontend

---

## Padrão final adotado

### 1. Persistência

- Todos os timestamps novos devem ser persistidos em **UTC real**.
- O helper padrão para novos timestamps é [`nowUtc()`](lib/utc.js:1).
- Não devemos introduzir novos usos de [`nowGMT3()`](lib/date-utils.js:5) para persistência.

### 2. Timezone de negócio

- Cada loja possui seu timezone próprio em [`models/Loja.js`](models/Loja.js).
- O campo atual é `timezone` com default `America/Sao_Paulo`.
- O timezone deve ser sempre um identificador IANA válido.

Exemplos:

- `America/Sao_Paulo`
- `America/New_York`
- `Europe/Lisbon`

### 3. Backend temporal

- Regras de negócio por período devem usar o timezone da loja.
- Conversões centrais ficam em [`lib/timezone.js`](lib/timezone.js).
- Helpers principais:
  - [`resolveStoreTimezone()`](lib/timezone.js:5)
  - [`normalizeTimezone()`](lib/timezone.js)
  - [`buildUtcDateForStore()`](lib/timezone.js)
  - [`getDateKeyInTimezone()`](lib/timezone.js)

### 4. Frontend temporal

- O frontend deve usar range centralizado e não recalcular lógica diferente por tela.
- O util atual é [`getStoreDateRange()`](src/lib/store-timezone.ts:5).
- Overview e relatórios devem compartilhar esse padrão.

---

## Regras práticas

### Persistência

Use:

- [`nowUtc()`](lib/utc.js:1)

Evite:

- [`nowGMT3()`](lib/date-utils.js:5)
- `new Date()` espalhado diretamente para timestamps de domínio, quando houver helper padrão disponível

### Filtros por período

- Sempre converter o período civil da loja para UTC antes de consultar no banco.
- Nunca depender do timezone implícito do navegador ou do servidor para decidir o dia de negócio.

### Agregações por dia

- Sempre agrupar usando timezone da loja.
- Exemplo atual: [`api/relatorios.js`](api/relatorios.js) usa `timezone` em [`$dateToString`](api/relatorios.js:76).

---

## Arquivos centrais da arquitetura temporal

### Backend

- [`lib/utc.js`](lib/utc.js)
- [`lib/timezone.js`](lib/timezone.js)
- [`api/relatorios.js`](api/relatorios.js)
- [`api/analytics.js`](api/analytics.js)

### Frontend

- [`src/lib/store-timezone.ts`](src/lib/store-timezone.ts)
- [`src/pages/painel/LojaOverview.tsx`](src/pages/painel/LojaOverview.tsx)
- [`src/pages/painel/LojaRelatorios.tsx`](src/pages/painel/LojaRelatorios.tsx)
- [`src/pages/painel/LojaPerfilLoja.tsx`](src/pages/painel/LojaPerfilLoja.tsx)

---

## Estratégia de compatibilidade adotada

### Forward-compatible

- Não reescrevemos histórico antigo automaticamente.
- Novos registros passam a seguir UTC explícito.
- Leituras críticas foram adaptadas para operar com timezone da loja.

### Quando pensar em backfill

Só vale considerar backfill quando houver um caso real de divergência histórica comprovada que impacte:

- relatórios financeiros antigos
- reconciliação operacional
- exportações legais/auditoria

Até lá, a estratégia recomendada é manter compatibilidade progressiva.

---

## Checklist para novas features

Antes de criar qualquer recurso que use datas, validar:

1. O timestamp será salvo em UTC?
2. O timezone de negócio da loja está sendo respeitado?
3. O filtro por período converte faixa civil para UTC?
4. A agregação por dia/mês usa timezone explícito?
5. O frontend reutiliza util central em vez de inventar nova lógica?

---

## Estado final após as fases executadas

- timezone por loja implantado
- analytics diário por loja alinhado ao timezone da loja
- relatórios alinhados ao timezone da loja
- persistência crítica nova em UTC explícito
- models legados remanescentes principais migrados para UTC explícito
- build validado com sucesso ao fim das fases

---

## Próxima orientação para evolução futura

Ao criar novos módulos, a regra é simples:

- **salva em UTC**
- **interpreta no timezone da loja**
- **centraliza utilitários de range e agregação**

Esse é o padrão definitivo recomendado para a plataforma.
