import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // dados ficam "frescos" por 30s
      refetchOnWindowFocus: false, // não refetch ao focar a aba
      retry: 1,
    },
  },
});
