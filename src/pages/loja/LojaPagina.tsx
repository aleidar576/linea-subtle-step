import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLoja } from '@/contexts/LojaContext';
import { useQuery } from '@tanstack/react-query';
import { lojaPublicaApi } from '@/services/saas-api';
import { Loader2, ArrowLeft } from 'lucide-react';

const LojaPagina = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lojaId, nomeExibicao, slogan } = useLoja();

  const { data: pagina, isLoading, isError } = useQuery({
    queryKey: ['loja-publica-pagina', lojaId, slug],
    queryFn: () => lojaPublicaApi.getPagina(lojaId, slug!),
    enabled: !!lojaId && !!slug,
  });

  // Dynamic title: {paginaTitulo} · {nomeExibicao} · {slogan}
  useEffect(() => {
    if (pagina) {
      const parts = [pagina.titulo, nomeExibicao];
      if (slogan) parts.push(slogan);
      document.title = parts.join(' · ');
    }
  }, [pagina, nomeExibicao, slogan]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !pagina) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h1 className="text-xl font-bold text-foreground">Página não encontrada</h1>
        <Link to="/" className="text-primary hover:underline">Voltar à loja</Link>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-6">{pagina.titulo}</h1>
      <div
        className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: pagina.conteudo || '' }}
      />
    </div>
  );
};

export default LojaPagina;
