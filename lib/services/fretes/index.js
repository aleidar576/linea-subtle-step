// ============================================
// 🏭 Shipping Services Factory (Strategy Pattern)
// ============================================

const melhorEnvio = require('./melhorEnvio.js');

/**
 * Retorna o serviço de frete correspondente à integração ativa.
 * @param {object} integracoes - Objeto de integrações da loja
 * @returns {{ gerarEtiqueta, cancelarEtiqueta, calcularFrete }}
 */
function getShippingService(integracoes) {
  // Futuros serviços:
  // if (integracoes?.kangu?.ativo) return require('./kangu.js');

  // Default: Melhor Envio
  return melhorEnvio;
}

module.exports = { getShippingService };
