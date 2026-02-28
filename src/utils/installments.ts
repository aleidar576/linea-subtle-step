// ============================================
// 💳 Calculadora de Parcelamento P.P (Por Parcela) — Appmax
// Taxa Total = parcela * taxa_pp (ex: 3x * 2.49% = 7.47%)
// ============================================

export interface InstallmentConfig {
  max_installments: number;   // ex: 12
  free_installments: number;  // ex: 1 (1x sem juros)
  interest_rate_pp: number;   // ex: 2.49 (%)
}

export interface InstallmentOption {
  installment: number;        // 1, 2, 3...
  installmentPrice: number;   // valor da parcela em centavos
  totalPrice: number;         // valor total em centavos
  isFree: boolean;            // true = sem juros
}

const DEFAULT_CONFIG: InstallmentConfig = {
  max_installments: 12,
  free_installments: 1,
  interest_rate_pp: 0,
};

/**
 * Calcula as opções de parcelamento usando o modelo P.P da Appmax.
 * @param cashPriceCents - Preço à vista em centavos
 * @param config - Configuração de parcelamento (parcelas máx, sem juros, taxa P.P)
 * @returns Array de opções de parcelamento
 */
export function calculateAppmaxInstallments(
  cashPriceCents: number,
  config?: Partial<InstallmentConfig> | null,
): InstallmentOption[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { max_installments, free_installments, interest_rate_pp } = cfg;

  const options: InstallmentOption[] = [];

  for (let n = 1; n <= max_installments; n++) {
    const isFree = n <= free_installments || interest_rate_pp <= 0;
    const taxRate = isFree ? 0 : (n * interest_rate_pp) / 100;
    const totalPrice = Math.round(cashPriceCents * (1 + taxRate));
    const installmentPrice = Math.ceil(totalPrice / n);

    options.push({ installment: n, installmentPrice, totalPrice, isFree });
  }

  return options;
}

/**
 * Retorna a opção de parcelamento máxima (para exibir "em até Xx de R$ Y").
 */
export function getMaxInstallmentDisplay(
  cashPriceCents: number,
  config?: Partial<InstallmentConfig> | null,
): InstallmentOption | null {
  const options = calculateAppmaxInstallments(cashPriceCents, config);
  return options.length > 0 ? options[options.length - 1] : null;
}
