
## Injecao de raw_appmax no bloco PIX

### Alteracao (arquivo: `lib/services/pagamentos/appmax.js`, linha 383)

Adicionar `normalized.raw_appmax = payResult.data;` no final do bloco PIX, logo apos a logica do prefixo base64, para expor o payload cru da Appmax na aba Network do navegador.

### Detalhes tecnicos

No bloco `if (method === 'pix')` (linhas 374-383), apos a linha do prefixo base64:

```javascript
// Adicionar apos linha 383:
normalized.raw_appmax = payResult.data;
```

Isso permitira inspecionar a estrutura real da resposta PIX da Appmax e identificar o caminho correto para o QR code, da mesma forma que foi feito com sucesso para o Boleto.

Apos a inspecao, o campo `raw_appmax` sera removido e a extracao sera corrigida com os caminhos reais.
