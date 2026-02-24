

# Plano: Conectar Botao "Verificar Propagacao" na UI

## Contexto

O botao "Verificar Propagacao" em `LojaConfiguracoes.tsx` (linha 150) nao possui `onClick`. O backend (`check-domain`) e o service (`lojasApi.checkDomain`) ja estao prontos. A tarefa e exclusivamente de frontend.

**Nota:** O erro de build exibido ("Permission denied") e um problema transitorio do ambiente de execucao, nao relacionado ao codigo. O `vite.config.mts` existe e esta correto.

## Alteracoes

**Arquivo unico:** `src/pages/painel/LojaConfiguracoes.tsx`

### 1. Novo state

Adicionar na linha 28 (junto aos outros states):

```text
const [isCheckingDomain, setIsCheckingDomain] = useState(false);
```

### 2. Import do service

Na linha 5, adicionar `lojasApi` ao import existente de `saas-api`:

```text
import { platformApi, lojasApi } from '@/services/saas-api';
```

### 3. Funcao handleCheckDomain

Adicionar apos o `handleSave` (apos linha 70):

- Valida se `dominioCustomizado` nao esta vazio
- Seta `isCheckingDomain = true`
- Chama `lojasApi.checkDomain(dominioCustomizado)`
- Se sucesso: toast verde "Dominio verificado e propagado com sucesso!"
- Se erro/pendente: toast destructive "Dominio ainda nao propagou. Verifique o apontamento CNAME e aguarde."
- Finally: `isCheckingDomain = false`

### 4. Conectar botao (linha 150)

Substituir o botao atual por:

```text
<Button
  variant="outline"
  size="sm"
  onClick={handleCheckDomain}
  disabled={isCheckingDomain || !dominioCustomizado.trim()}
>
  {isCheckingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
  {isCheckingDomain ? 'Verificando...' : 'Verificar Propagacao'}
</Button>
```

- Desabilitado quando o input de dominio esta vazio ou quando ja esta verificando
- Mostra spinner `Loader2` (ja importado) durante a verificacao

## Resumo

- 1 arquivo editado: `src/pages/painel/LojaConfiguracoes.tsx`
- 0 arquivos criados
- 0 arquivos na pasta `api/` tocados
- `vite.config.mts` intocavel

