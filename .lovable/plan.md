

## Diagnóstico completo + Plano de correção

### Por que calculou R$195 e não R$260?

O `pedido.total` é armazenado em **centavos** (R$130,00 = `13000`). A fórmula atual na linha 41 de `confirmarPagamento.js`:

```
pedido.total * taxaPercentual / 100
```

Com taxa 1.5%: `13000 * 1.5 / 100 = 195` (errado, deveria ser R$1,95)

**Mas por que usou 1.5% e não 2% (trial)?** Isso indica que o `subscription_status` do lojista no banco não estava como `trialing` no momento da venda. Pode ter sido setado como `active` pelo webhook do Stripe, ou o campo não estava preenchido corretamente. Isso é um problema de dados, não de lógica — a lógica de seleção trial vs ativa está correta (linhas 37-39). Será preciso verificar manualmente no MongoDB o `subscription_status` atual do lojista.

### Correções necessárias

**1. `lib/services/pedidos/confirmarPagamento.js`** — Converter centavos para reais (BUG CRÍTICO)

Linha 41, alterar de:
```javascript
const valorTaxa = (pedido.total * taxaPercentual / 100) + (taxaFixa > 0 ? taxaFixa : 0);
```
Para:
```javascript
const totalReais = pedido.total / 100;
const valorTaxa = (totalReais * taxaPercentual / 100) + (taxaFixa > 0 ? taxaFixa : 0);
```

Resultado correto para R$130 com 2% trial: `130 * 2 / 100 = R$2,60`
Resultado correto para R$130 com 1.5%: `130 * 1.5 / 100 = R$1,95`

A taxa fixa (`taxa_transacao_fixa`) já é em reais, está correto como está — somada após o percentual.

**2. `src/pages/painel/LojaAssinatura.tsx`** — Melhorar UI para trial

No bloco de assinatura ativa, quando `isTrial === true`:

- Mostrar um banner informativo no BLOCO 1 (Mensalidade) explicando que o lojista está no **período trial de 7 dias** e que ao final será migrado automaticamente para o plano contratado (ex: "Starter")
- No BLOCO 2 (Taxas), o banner de taxa trial já existe (linhas 195-201) mas será aprimorado para deixar mais claro que:
  - A taxa atual é de X% (puxada do plano: `taxa_transacao_trial`)
  - Após o trial, a taxa será de Y% (puxada do plano: `taxa_transacao_percentual`)

Mudanças específicas no BLOCO 1:
- Quando `isTrial`, exibir badge "Trial Ativo" (já existe via STATUS_MAP)
- Adicionar banner azul informativo abaixo do preço: "Você está no período trial de 7 dias. Ao final, será cobrado automaticamente o plano {planoNome} de R$ {precoPromocional}/mês."

Mudanças no BLOCO 2:
- Expandir o banner azul de trial (já existente) para incluir: "Após o trial, a taxa será reduzida para {taxa_transacao_percentual}%."

Todos os valores puxados do `currentPlano` (dados do banco).

### Ação manual necessária (fora do código)
O saldo de `taxas_acumuladas` no MongoDB está incorreto (R$195). Será necessário corrigir manualmente para o valor correto.

