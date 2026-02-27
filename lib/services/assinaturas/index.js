// ============================================
// 🏭 Subscription Services Factory (Strategy Pattern)
// ============================================

const stripe = require('./stripe.js');

/**
 * Retorna o serviço de assinaturas.
 * @param {string} provider - ID do provider ('stripe')
 * @returns {{ createCheckoutSession, handleWebhookEvent, createPortalSession, processarCronTaxas, pagarTaxasManual }}
 */
function getSubscriptionService(provider) {
  switch (provider) {
    case 'stripe':
    default:
      return stripe;
  }
}

module.exports = { getSubscriptionService };
