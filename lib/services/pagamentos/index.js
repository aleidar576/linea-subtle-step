// ============================================
// 🏭 Payment Services Factory (Strategy Pattern)
// ============================================

const sealpay = require('./sealpay.js');
const appmax = require('./appmax.js');

/**
 * Retorna o serviço de pagamento correspondente ao gateway ativo.
 * @param {string} gatewayId - ID do gateway ('sealpay', 'appmax', etc.)
 * @returns {{ getStatus, handleWebhook, createPayment }}
 */
function getPaymentService(gatewayId) {
  switch (gatewayId) {
    case 'appmax':
      return appmax;
    case 'sealpay':
    default:
      return sealpay;
  }
}

module.exports = { getPaymentService };
