// ============================================
// 🏦 Gateways Estáticos - Fonte única de verdade
// ============================================

export interface GatewayDefinition {
  id: string;
  nome: string;
  logo_url: string;
  metodos: string[];
  tag: string | null;
  descricao: string;
}

export const GATEWAYS: GatewayDefinition[] = [
  {
    id: 'sealpay',
    nome: 'SealPay',
    logo_url: 'https://sealpay.com.br/favicon.ico',
    metodos: ['pix'],
    tag: null,
    descricao: 'Receba pagamentos via PIX com taxa competitiva.',
  },
  {
    id: 'appmax',
    nome: 'Appmax',
    logo_url: 'https://appmax.com.br/favicon.ico',
    metodos: ['pix', 'cartao', 'boleto'],
    tag: 'HOT',
    descricao: 'PIX, Cartão de Crédito e Boleto em um só gateway.',
  },
];

export function getGatewayById(id: string): GatewayDefinition | undefined {
  return GATEWAYS.find(g => g.id === id);
}
