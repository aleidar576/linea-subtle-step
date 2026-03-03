

## Correção: Bloquear lojista sem cartão no cron de taxas

**Problema:** Na função `processarCronTaxas`, quando `defaultPm` não é encontrado, o código faz `continue` e pula o lojista silenciosamente. Isso significa que lojistas sem cartão nunca são cobrados e nunca atingem o limite de 3 tentativas para bloqueio.

**Correção:** Substituir o bloco `if (!defaultPm) { console.warn(...); continue; }` por um `throw new Error(...)`, fazendo com que a ausência de cartão caia no `catch` existente, que já incrementa `tentativas_taxas` e aplica bloqueio após 3 falhas.

**Arquivo:** `lib/services/assinaturas/stripe.js`, função `processarCronTaxas`

Trocar:
```javascript
if (!defaultPm) {
  console.warn(`[CRON-TAXAS] ⚠️ Sem método de pagamento para ${lojista.email}, pulando`);
  continue;
}
```

Por:
```javascript
if (!defaultPm) {
  throw new Error('Nenhum método de pagamento cadastrado na Stripe. Impossível cobrar taxas automáticas.');
}
```

Nenhuma outra alteração necessária — o `catch` existente já trata incremento de tentativas e bloqueio.

