
## Correcao da Extracao do PIX com Payload Real da Appmax

### Contexto
O `raw_appmax` revelou que a Appmax retorna os dados do PIX em `data.data.payment` com campos `pix_qrcode` (base64 puro) e `pix_emv` (copia e cola).

### Alteracao (arquivo: `lib/services/pagamentos/appmax.js`, linhas 375-384)

Substituir o bloco atual:

```javascript
      // Extrair QR code e código copia-e-cola
      const pixData = payData.pix || payData.payment || payData;
      normalized.pix_qr_code = pixData.qr_code || pixData.qr_code_url || pixData.qrcode || '';
      normalized.pix_code = pixData.pix_code || pixData.emv || pixData.code || pixData.pix_emv || '';

      // Garantir prefixo base64 se for imagem
      if (normalized.pix_qr_code && !normalized.pix_qr_code.startsWith('data:image') && !normalized.pix_qr_code.startsWith('http')) {
      normalized.pix_qr_code = `data:image/png;base64,${normalized.pix_qr_code}`;
      }
      normalized.raw_appmax = payResult.data;
```

Por:

```javascript
      const paymentData = payResult?.data?.data?.payment || payResult?.data?.payment || {};
      const qrCodeRaw = paymentData.pix_qrcode || '';
      const emvCode = paymentData.pix_emv || '';
      normalized.pix_qr_code = qrCodeRaw
        ? (qrCodeRaw.startsWith('data:image') ? qrCodeRaw : `data:image/png;base64,${qrCodeRaw}`)
        : '';
      normalized.pix_code = emvCode;
```

### Resumo
- Usa o caminho real confirmado: `data.data.payment`
- Extrai `pix_qrcode` e `pix_emv` pelos nomes corretos da Appmax
- Adiciona prefixo base64 apenas quando necessario
- Remove `raw_appmax` (debug concluido)
