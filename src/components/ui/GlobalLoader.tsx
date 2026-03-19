import { Loader2 } from 'lucide-react';

const GlobalLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

export default GlobalLoader;
