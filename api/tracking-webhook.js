// ============================================
// 📊 /api/tracking-webhook - Webhook de Pagamento
// POST: recebe webhook do gateway, salva log, dispara FB CAPI + TT Events API
// GET: retorna últimos 50 logs (sem proteção de admin)
// ============================================

const crypto = require('crypto');
const connectDB = require('../lib/mongodb');
const WebhookLog = require('../models/WebhookLog');
const TrackingPixel = require('../models/TrackingPixel');

const sha256 = (val) => {
  if (!val) return '';
  return crypto.createHash('sha256').update(String(val).toLowerCase().trim()).digest('hex');
};

const cleanPhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
};

const cleanCpf = (cpf) => {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
};

// ==================
// Facebook CAPI
// ==================
async function dispatchFacebookPurchase(pixel, { email, telefone, cpf, valor, txid }) {
  const eventTime = Math.floor(Date.now() / 1000);
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: txid || `evt_${Date.now()}`,
      action_source: 'website',
      user_data: {
        em: [sha256(email)],
        ph: [sha256(cleanPhone(telefone))],
        external_id: [sha256(cleanCpf(cpf))],
      },
      custom_data: {
        value: (valor || 0) / 100,
        currency: 'BRL',
      },
    }],
  };

  try {
    const url = `https://graph.facebook.com/v18.0/${pixel.pixel_id}/events?access_token=${pixel.access_token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { platform: 'facebook', pixel_id: pixel.pixel_id, success: res.ok, status: res.status, response: data };
  } catch (err) {
    return { platform: 'facebook', pixel_id: pixel.pixel_id, success: false, error: err.message };
  }
}

// ==================
// TikTok Events API
// ==================
async function dispatchTikTokPurchase(pixel, { email, telefone, valor, txid }) {
  const eventTime = Math.floor(Date.now() / 1000);
  const payload = {
    pixel_code: pixel.pixel_id,
    event: 'CompletePayment',
    event_id: txid || `evt_${Date.now()}`,
    timestamp: new Date().toISOString(),
    context: {
      user: {
        email: sha256(email),
        phone_number: sha256(cleanPhone(telefone)),
      },
    },
    properties: {
      value: (valor || 0) / 100,
      currency: 'BRL',
    },
  };

  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': pixel.access_token,
      },
      body: JSON.stringify({ data: [payload] }),
    });
    const data = await res.json();
    return { platform: 'tiktok', pixel_id: pixel.pixel_id, success: res.ok, status: res.status, response: data };
  } catch (err) {
    return { platform: 'tiktok', pixel_id: pixel.pixel_id, success: false, error: err.message };
  }
}

// ==================
// Google Ads Enhanced Conversions (Server-Side via gtag Measurement Protocol)
// ==================
async function dispatchGoogleAdsPurchase(pixel, { email, telefone, valor, txid }) {
  // Google Ads server-side enhanced conversions require the Measurement Protocol
  // which needs an api_secret (access_token in our model) and measurement_id
  // For Google Ads, we use the conversion linker approach
  if (!pixel.access_token || !pixel.conversion_label) {
    return { platform: 'google_ads', pixel_id: pixel.pixel_id, success: false, error: 'Missing api_secret or conversion_label' };
  }

  const payload = {
    client_id: txid || `server_${Date.now()}`,
    events: [{
      name: 'purchase',
      params: {
        currency: 'BRL',
        value: (valor || 0) / 100,
        transaction_id: txid || `evt_${Date.now()}`,
        send_to: `${pixel.pixel_id}/${pixel.conversion_label}`,
      },
    }],
    user_data: {
      sha256_email_address: [sha256(email)],
      sha256_phone_number: [sha256(cleanPhone(telefone))],
    },
  };

  try {
    // Using Google Analytics Measurement Protocol v2
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${pixel.pixel_id}&api_secret=${pixel.access_token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { platform: 'google_ads', pixel_id: pixel.pixel_id, success: res.ok, status: res.status };
  } catch (err) {
    return { platform: 'google_ads', pixel_id: pixel.pixel_id, success: false, error: err.message };
  }
}

// ==================
// HANDLER
// ==================
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  // ===== GET: retornar logs =====
  if (req.method === 'GET') {
    try {
      const logs = await WebhookLog.find({}).sort({ created_at: -1 }).limit(50).lean();
      return res.status(200).json(logs);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar logs', details: err.message });
    }
  }

  // ===== POST: processar webhook =====
  if (req.method === 'POST') {
    const body = req.body || {};
    const { evento, txid, valor, nome, email, telefone, cpf, status, data } = body;

    console.log('📊 Webhook received:', JSON.stringify(body, null, 2));

    // Salvar log (sempre, independente do status)
    let log;
    try {
      log = await WebhookLog.create({
        txid: txid || '',
        evento: evento || '',
        status: status || '',
        valor: valor || 0,
        nome: nome || '',
        email: email || '',
        telefone: telefone || '',
        cpf: cpf || '',
        raw_body: body,
        pixel_dispatches: [],
      });
    } catch (err) {
      console.error('Erro ao salvar log:', err.message);
    }

    // Se status === 'paid', disparar pixels
    const dispatches = [];
    if (status === 'paid') {
      try {
        const activePixels = await TrackingPixel.find({
          is_active: true,
          access_token: { $nin: [null, ''] },
        }).lean();

        for (const pixel of activePixels) {
          let result;
          if (pixel.platform === 'facebook') {
            result = await dispatchFacebookPurchase(pixel, { email, telefone, cpf, valor, txid });
          } else if (pixel.platform === 'tiktok') {
            result = await dispatchTikTokPurchase(pixel, { email, telefone, valor, txid });
          } else if (pixel.platform === 'google_ads' && pixel.conversion_label) {
            result = await dispatchGoogleAdsPurchase(pixel, { email, telefone, valor, txid });
          }
          if (result) dispatches.push(result);
        }

        // Atualizar log com resultado dos disparos
        if (log && dispatches.length > 0) {
          await WebhookLog.findByIdAndUpdate(log._id, { pixel_dispatches: dispatches });
        }
      } catch (err) {
        console.error('Erro ao disparar pixels:', err.message);
        dispatches.push({ error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      txid: txid || null,
      status: status || null,
      dispatches,
      received_at: new Date().toISOString(),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
