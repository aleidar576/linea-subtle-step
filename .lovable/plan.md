

## Hero Section — Correção de Layout Premium

### Arquivo: `src/pages/LandingPage.tsx` (linhas 92–144)

### Mudanças

**1. Grid container (linha 95)**
Substituir `grid md:grid-cols-2 gap-12 items-center` por:
- Mobile: `flex flex-col-reverse gap-8`
- Desktop: `md:grid md:grid-cols-2 items-center gap-16`

**2. Bloco de texto (linha 97)**
Adicionar `max-w-xl` na div do motion.

**3. Tipografia**
- Título (linha 99): `text-4xl md:text-5xl font-extrabold leading-tight text-zinc-900` (reduzir de `text-6xl`)
- Subtítulo (linha 104): `text-lg md:text-xl text-zinc-600 font-medium mt-5 mb-8`

**4. CTA — layout empilhado (linhas 110–124)**
Substituir o input-group inline (flex horizontal com rounded-full) por layout vertical:
- Input email: `w-full` com borda sutil, fundo branco, placeholder "Seu melhor email", `rounded-xl h-12`
- Botão abaixo com `mt-4 w-full rounded-xl h-12` cor primária
- `hero.bottomTexto` abaixo com `mt-3`

**5. Imagem (linhas 132–141)**
Envolver em `<div className="flex justify-center md:justify-end">`, e na `<img>`:
`w-full h-auto object-contain max-w-[500px] max-h-[500px] rounded-3xl shadow-2xl`

### Nenhum outro arquivo é alterado.

