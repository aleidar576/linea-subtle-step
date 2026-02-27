

# Correção dos Headers da API Melhor Envio

## Problema
A API do Melhor Envio retorna HTML (Status 200) porque falta o header `Accept: application/json`. Sem ele, o Laravel do Melhor Envio serve a View do SPA em vez de JSON.

## Alterações em `api/pedidos.js`

### 1. Adicionar `Accept` header nos dois blocos de `meHeaders`

**Bloco `gerar-etiqueta` (linha ~499)** e **Bloco `cancelar-etiqueta` (linha ~677)**:
Adicionar `'Accept': 'application/json'` ao objeto `meHeaders` em ambos os locais.

### 2. Remover debug temporário

**Linha 513**: Substituir `throw new Error("ME " + response.status + " Text: " + text.substring(0, 250))` pelo texto de erro definitivo:
`throw new Error("A API do Melhor Envio falhou e retornou um formato inválido (Status: " + response.status + "). Tente novamente em instantes.");`

### 3. Verificação de URLs
As URLs ja estao corretas: `${meBase}/api/v2/me/cart`, `/checkout`, `/generate`, `/print`, `/cancel` -- nenhuma alteração necessária.

### Resumo
- 2 objetos `meHeaders` atualizados com `Accept: application/json`
- 1 linha de debug removida e substituída pela mensagem de erro definitiva
- URLs já estão corretas, sem alteração

