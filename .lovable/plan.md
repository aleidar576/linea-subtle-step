

## Correcao da Extracao do Boleto com Payload Real da Appmax

### Contexto
O `raw_appmax` revelou que a Appmax retorna os dados do boleto em `data.data.payment` com campos `boleto_link_pdf` e `boleto_digitable_line`, nomes completamente diferentes dos que estavamos tentando extrair.

### Alteracao (arquivo: `lib/services/pagamentos/appmax.js`, linhas 384-393)

Substituir o bloco atual de extracao do boleto:

**De:**
```javascript
} else if (method === 'boleto') {
  console.log('[APPMAX RAW BOLETO RESPONSE]:', JSON.stringify(payResult.data));
  const boletoData = payData.boleto || payData.payment || payData;
  normalized.pdf_url = boletoData.pdf || boletoData.url || ...
  normalized.digitable_line = boletoData.digitable_line || ...
  normalized.raw_appmax = payResult.data;
```

**Para:**
```javascript
} else if (method === 'boleto') {
  console.log('[APPMAX RAW BOLETO RESPONSE]:', JSON.stringify(payResult.data));
  const paymentData = payResult?.data?.data?.payment || payResult?.data?.payment || {};
  normalized.pdf_url = paymentData.boleto_link_pdf || '';
  normalized.digitable_line = paymentData.boleto_digitable_line || paymentData.boleto_payment_code || '';
```

### Resumo
- Usa o caminho exato confirmado pelo payload real: `data.data.payment`
- Extrai `boleto_link_pdf` e `boleto_digitable_line` pelos nomes corretos
- Remove `raw_appmax` do retorno (nao e mais necessario)
- Mantem o log de debug para rastreabilidade

