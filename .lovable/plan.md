

# Correção: Documento Dinâmico (CPF vs CNPJ) no Payload do Melhor Envio

## Problema
O Melhor Envio exige CPF no campo `document` e CNPJ no campo `company_document`. O código atual envia qualquer documento no campo `document`, causando erro 422 para lojistas PJ.

## Alteração em `api/pedidos.js` (linhas 581-612)

Substituir os objetos literais `from` e `to` dentro de `cartPayload` pela lógica dinâmica abaixo:

```javascript
// --- Remetente (from) ---
const fromDoc = onlyDigits(empresa.documento);
const fromPayload = {
  name: empresa.razao_social || loja.nome,
  address: endereco.logradouro,
  number: endereco.numero || 'S/N',
  complement: endereco.complemento || '',
  district: endereco.bairro,
  city: endereco.cidade,
  state_abbr: endereco.estado,
  postal_code: onlyDigits(endereco.cep),
  phone: onlyDigits(empresa.telefone),
  email: empresa.email_suporte || '',
};
if (fromDoc.length > 11) {
  fromPayload.company_document = fromDoc;
  fromPayload.state_register = '';
} else {
  fromPayload.document = fromDoc;
}

// --- Destinatario (to) ---
const toDoc = onlyDigits(pedido.cliente?.cpf || pedido.cliente?.documento || '');
const toPayload = {
  name: pedido.cliente?.nome || '',
  address: pedido.endereco?.rua || pedido.endereco?.logradouro || '',
  number: pedido.endereco?.numero || 'S/N',
  complement: pedido.endereco?.complemento || '',
  district: pedido.endereco?.bairro || '',
  city: pedido.endereco?.cidade || '',
  state_abbr: pedido.endereco?.estado || '',
  postal_code: onlyDigits(pedido.endereco?.cep),
  phone: onlyDigits(pedido.cliente?.telefone || ''),
  email: pedido.cliente?.email || '',
};
if (toDoc.length > 11) {
  toPayload.company_document = toDoc;
  toPayload.state_register = '';
} else {
  toPayload.document = toDoc;
}

const cartPayload = {
  service: Number(serviceId),
  from: fromPayload,
  to: toPayload,
  products: itemsWithDims,
  volumes: [volume],
  options: { non_commercial: true, receipt: false, own_hand: false },
};
```

### Resumo
- CPF (<=11 digitos) vai em `document`
- CNPJ (>11 digitos) vai em `company_document` + `state_register: ''`
- Aplica-se tanto ao remetente (from) quanto ao destinatario (to)
- Arquivo alterado: `api/pedidos.js` (linhas 581-612)

