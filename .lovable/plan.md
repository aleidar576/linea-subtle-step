
# Aviso de CEP Ausente na Integracao Melhor Envio

## Objetivo

Proteger o lojista contra falhas silenciosas no calculo de frete adicionando verificacao e avisos visuais quando o CEP de origem da loja nao esta cadastrado.

---

## Alteracoes no arquivo `src/pages/painel/LojaIntegracoes.tsx`

### 1. Variavel derivada

Adicionar apos a linha 57:

```text
const hasStoreCep = !!loja?.configuracoes?.endereco?.cep;
```

### 2. Import do AlertTitle

Adicionar `AlertTitle` ao import existente do `@/components/ui/alert` (linha 13), e adicionar um estado `showCepConfirm` para o dialog de confirmacao.

### 3. Interceptacao no handleSave

Modificar `handleSave` para verificar, antes de salvar, se o activeSheet e `melhor_envio`, `sheetData.ativo` e `true`, e `hasStoreCep` e `false`. Nesse caso, setar `showCepConfirm = true` e retornar (abortando o save). O save real sera chamado por uma funcao `confirmSave()` quando o usuario confirmar no AlertDialog.

Usar o componente `AlertDialog` do shadcn para a confirmacao, com:
- Titulo: "CEP de origem nao cadastrado"
- Descricao: "O CEP de origem da sua loja nao esta cadastrado em Perfil da Loja. Deseja ativar a integracao mesmo assim? O calculo automatico nao funcionara corretamente sem o CEP."
- Botao cancelar: "Cancelar" (fecha o dialog)
- Botao confirmar: "Ativar mesmo assim" (chama o save real)

### 4. Banner de aviso no Card (listagem)

Dentro do `.map` dos cards de integracao, apos o `CardContent`, adicionar condicao: se `integration.id === 'melhor_envio'` e `isActive` e `!hasStoreCep`, renderizar:

```text
<Alert variant="destructive" className="mx-6 mb-4">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Atencao</AlertTitle>
  <AlertDescription>Falta o CEP no cadastro da loja. Va em Perfil da Loja.</AlertDescription>
</Alert>
```

### 5. Banner de aviso no Sheet

Dentro do Sheet de configuracao do Melhor Envio, apos o switch "Ativar Integracao", adicionar a mesma condicao (`activeSheet === 'melhor_envio' && sheetData.ativo && !hasStoreCep`), renderizando o mesmo Alert destructive com mensagem completa.

---

## Imports adicionais necessarios

- `AlertTitle` de `@/components/ui/alert`
- `AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction` de `@/components/ui/alert-dialog`

## Resumo

| Local | Comportamento |
|---|---|
| Card Melhor Envio (listagem) | Banner vermelho se ativo + sem CEP |
| Sheet Melhor Envio (config) | Banner vermelho se ativo + sem CEP |
| Botao Salvar | Intercepta com AlertDialog se ativando sem CEP |
