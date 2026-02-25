

## Plano: Adicionar dependência `stripe` ao package.json

### Problema
O backend (`api/loja-extras.js`) faz `require('stripe')`, mas o pacote `stripe` não está listado no `package.json`. Na Vercel, isso causa `Cannot find module 'stripe'`.

### Solução
Adicionar uma única linha no `package.json`, na seção `dependencies`:

```json
"stripe": "^17.7.0"
```

### O que NÃO será alterado
- Nenhum arquivo de código (nenhuma API, nenhum componente, nenhum config)
- Apenas o `package.json` recebe a nova entrada de dependência

### Detalhes técnicos
- Pacote: `stripe` (SDK oficial Node.js para backend)
- Isso garante que o `npm install` da Vercel baixe o módulo antes de executar as Serverless Functions

