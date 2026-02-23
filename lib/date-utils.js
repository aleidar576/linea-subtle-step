// ============================================
// 🕐 Date Utils - GMT-3 (Brasília)
// ============================================

function nowGMT3() {
  const now = new Date();
  const offset = now.getTime() + (now.getTimezoneOffset() * 60000) - (3 * 3600000);
  return new Date(offset);
}

module.exports = { nowGMT3 };
