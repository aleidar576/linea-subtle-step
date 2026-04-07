const crypto = require('crypto');
const connectDB = require('../lib/mongodb.js');
const Loja = require('../models/Loja.js');
const LojaVisitanteDiario = require('../models/LojaVisitanteDiario.js');
const LojaMetricaDiaria = require('../models/LojaMetricaDiaria.js');
const { resolveStoreTimezone, getDateKeyInTimezone } = require('../lib/timezone.js');
const { nowUtc } = require('../lib/utc.js');

function sha256(value) {
  if (!value) return '';
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

function isLikelyBot(userAgent = '') {
  return /bot|crawler|spider|crawling|headless|facebookexternalhit|whatsapp|preview|slurp/i.test(userAgent);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  await connectDB();

  const body = req.body || {};
  const { loja_id, visitor_id, path_inicial, referrer } = body;

  if (!loja_id || !visitor_id || typeof visitor_id !== 'string') {
    return res.status(400).json({ error: 'loja_id e visitor_id são obrigatórios' });
  }

  const loja = await Loja.findById(loja_id).select('_id timezone').lean();
  if (!loja) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }

  const userAgent = String(req.headers['user-agent'] || '');
  if (isLikelyBot(userAgent)) {
    return res.status(202).json({ ignored: true, reason: 'bot_detected' });
  }

  const now = nowUtc();
  const timezone = resolveStoreTimezone(loja);
  const date_key = getDateKeyInTimezone(now, timezone);
  const referrer_host = (() => {
    try {
      if (!referrer) return '';
      return new URL(referrer).hostname || '';
    } catch {
      return '';
    }
  })();

  const result = await LojaVisitanteDiario.updateOne(
    { loja_id, visitor_id: visitor_id.trim(), date_key },
    {
      $setOnInsert: {
        loja_id,
        visitor_id: visitor_id.trim(),
        date_key,
        first_seen_at: now,
        landing_path: typeof path_inicial === 'string' ? path_inicial.slice(0, 500) : '/',
        referrer_host,
        user_agent_hash: sha256(userAgent),
        ip_hash: sha256(getClientIp(req)),
        timezone,
      },
      $set: { last_seen_at: now },
    },
    { upsert: true }
  );

  const inserted = Boolean(result.upsertedCount);

  await LojaMetricaDiaria.updateOne(
    { loja_id, date_key },
    {
      $inc: {
        visitantes_unicos: inserted ? 1 : 0,
        pageviews: 1,
      },
      $set: { updated_at: now },
      $setOnInsert: { loja_id, date_key },
    },
    { upsert: true }
  );

  return res.status(200).json({ success: true, inserted, date_key });
};
