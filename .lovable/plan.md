

# Correção: Trava de Perfil Completo e Remoção de Fallbacks

## 1. Front-end: LojaIntegracoes.tsx

### Substituir `hasStoreCep` por `hasCompleteProfile`

**Linha 64**: Trocar a variável por uma validação completa:
```javascript
const config = loja?.configuracoes;
const hasCompleteProfile = !!(
  config?.empresa?.documento &&
  config?.empresa?.telefone &&
  config?.endereco?.cep &&
  config?.endereco?.logradouro &&
  config?.endereco?.numero &&
  config?.endereco?.bairro &&
  config?.endereco?.cidade &&
  config?.endereco?.estado
);
```

### Atualizar todas as referências (4 locais)

- **Linha 96** (`handleSave`): `!hasStoreCep` -> `!hasCompleteProfile`
- **Linha 170** (Banner no card): `!hasStoreCep` -> `!hasCompleteProfile`
- **Linha 232** (Banner no sheet): `!hasStoreCep` -> `!hasCompleteProfile`

### Renomear estado e dialog

- Renomear `showCepConfirm` para `showProfileConfirm` (linhas 62, 96-97, e no AlertDialog)

### Atualizar textos dos alertas

Todos os banners e o AlertDialog passam a exibir:
> "O Perfil da sua loja esta incompleto (Faltam dados como CNPJ/CPF, Telefone ou Endereco completo). Va em Configuracoes > Perfil da Loja para preencher. A integracao de fretes falhara sem essas informacoes."

---

## 2. Back-end: api/pedidos.js (scope gerar-etiqueta)

### Remover fallbacks do payload `from` (linhas 584-594)

Substituir:
```javascript
from: {
  name: empresa.razao_social || loja.nome || 'Loja',
  document: onlyDigits(empresa.documento),
  address: endereco.logradouro || '',
  number: endereco.numero || 'S/N',
  complement: endereco.complemento || '',
  district: endereco.bairro || '',
  city: endereco.cidade || '',
  state_abbr: endereco.estado || '',
  postal_code: onlyDigits(endereco.cep),
  phone: onlyDigits(empresa.telefone || '11999999999'),
  email: empresa.email_suporte || 'suporte@dusking.com.br',
},
```

Por (sem fallbacks de dados da plataforma):
```javascript
from: {
  name: empresa.razao_social || loja.nome,
  document: onlyDigits(empresa.documento),
  address: endereco.logradouro,
  number: endereco.numero || 'S/N',
  complement: endereco.complemento || '',
  district: endereco.bairro,
  city: endereco.cidade,
  state_abbr: endereco.estado,
  postal_code: onlyDigits(endereco.cep),
  phone: onlyDigits(empresa.telefone),
  email: empresa.email_suporte || '',
},
```

Campos obrigatorios sem fallback: `document`, `address`, `district`, `city`, `state_abbr`, `postal_code`, `phone`. Se vazios, a API do Melhor Envio retornara 422 naturalmente.

### Arquivos alterados
- `src/pages/painel/LojaIntegracoes.tsx`
- `api/pedidos.js`
