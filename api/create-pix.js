// ============================================
// 💰 /api/create-pix - ALIAS → /api/process-payment
// Mantido para compatibilidade com webhooks SealPay existentes
// ============================================

const processPayment = require('./process-payment.js');

module.exports = processPayment;
