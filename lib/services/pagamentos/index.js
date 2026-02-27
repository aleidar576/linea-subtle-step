// ============================================
// 🏭 Payment Services Factory (Strategy Pattern)
// ============================================

const sealpay = require('./sealpay.js');

/**
 * Retorna o serviço de pagamento correspondente ao gateway ativo.
 * @param {string} gatewayId - ID do gateway ('sealpay', 'appmax', etc.)
 * @returns {{ getStatus, handleWebhook, createPayment }}
 */
function getPaymentService(gatewayId) {
  switch (gatewayId) {
    case 'sealpay':
    default:
      return sealpay;
    // Futuros gateways:
    // case 'appmax':
    //   return require('./appmax.js');
  }
}

module.exports = { getPaymentService };
