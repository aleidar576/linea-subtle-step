
## Correcao: Extracao de Dados do Boleto no Backend

### Problema Raiz
O codigo de extracao do PDF e linha digitavel do boleto (linhas 384-391 de `lib/services/pagamentos/appmax.js`) esta **dentro do bloco `if (method === 'pix')`**. Quando o metodo e `boleto`, esse codigo nunca executa, resultando em `pdf_url: ""` e `digitable_line: ""`.

### Correcao (arquivo: `lib/services/pagamentos/appmax.js`)

1. **Mover a logica de extracao do boleto** para um bloco proprio `else if (method === 'boleto')` (apos o bloco de PIX, antes do bloco de credit_card).

2. **Adicionar o log de debug** dentro do bloco correto do boleto:
   ```
   console.log('[APPMAX RAW BOLETO RESPONSE]:', JSON.stringify(payResult.data));
   ```

3. **Injetar `raw_appmax`** no retorno normalizado para inspecao no Network do navegador:
   ```
   normalized.raw_appmax = payResult.data;
   ```

4. **Remover o codigo de boleto** que esta erroneamente dentro do bloco PIX (linhas 384-391).

### Resultado Esperado
- O bloco PIX fica limpo, apenas com logica de QR code
- O bloco boleto recebe sua propria logica de extracao com fallbacks agressivos
- O campo `raw_appmax` chega no frontend para inspecao da estrutura real da resposta
- Apos confirmar a estrutura, o `raw_appmax` pode ser removido em uma proxima iteracao
