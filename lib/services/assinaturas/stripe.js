// ============================================
// 💳 Stripe Subscription Service (Strategy Pattern)
// ============================================

const Lojista = require('../../../models/Lojista.js');
const Plano = require('../../../models/Plano.js');

/**
 * Cria sessão de checkout Stripe para assinatura.
 */
async function createCheckoutSession({ user, plano_id }) {
  if (!plano_id) return { error: 'plano_id é obrigatório', httpStatus: 400 };

  const plano = await Plano.findById(plano_id);
  if (!plano) return { error: 'Plano não encontrado', httpStatus: 404 };

  const lojista = await Lojista.findById(user.lojista_id);
  if (!lojista) return { error: 'Lojista não encontrado', httpStatus: 404 };

  if (!lojista.cpf_cnpj || !lojista.telefone) {
    return { error: 'Complete seus dados pessoais (CPF/CNPJ e Telefone) antes de assinar.', httpStatus: 400 };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { error: 'Stripe não configurado', httpStatus: 500 };

  const stripe = require('stripe')(STRIPE_SECRET_KEY);

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';

  const sessionParams = {
    mode: 'subscription',
    line_items: [{ price: plano.stripe_price_id, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    client_reference_id: lojista._id.toString(),
    customer_email: lojista.email,
    success_url: `${baseUrl}/painel/assinatura?success=true`,
    cancel_url: `${baseUrl}/painel/assinatura?canceled=true`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { data: { url: session.url }, httpStatus: 200 };
}

/**
 * Processa eventos do webhook Stripe.
 */
async function handleWebhookEvent({ event, rawBody, sig }) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  const { sendEmail, getBranding, getBaseUrl } = require('../../email.js');
  // Note: path is relative to lib/services/assinaturas/ → ../../email.js = lib/email.js ✓

  try {
    // === checkout.session.completed ===
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const lojistaId = session.client_reference_id;
      const subscriptionId = session.subscription;
      const customerId = session.customer;
      console.log(`[STRIPE-WEBHOOK] 📋 checkout.session.completed — lojistaId=${lojistaId}, customerId=${customerId}, subscriptionId=${subscriptionId}`);

      const lojista = await Lojista.findById(lojistaId);
      if (!lojista) {
        console.error(`[STRIPE-WEBHOOK] ❌ Lojista não encontrado: ${lojistaId}`);
      } else {
        console.log(`[STRIPE-WEBHOOK] ✅ Lojista encontrado: ${lojista.email} (id: ${lojista._id})`);

        lojista.stripe_customer_id = customerId;
        lojista.stripe_subscription_id = subscriptionId;
        lojista.subscription_status = 'trialing';

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items?.data?.[0]?.price?.id;
        console.log(`[STRIPE-WEBHOOK] 🔍 Price ID da subscription: ${priceId}`);

        if (priceId) {
          const plano = await Plano.findOne({ stripe_price_id: priceId });
          if (plano) {
            lojista.plano_id = plano._id;
            lojista.plano = plano.nome.toLowerCase();
            console.log(`[STRIPE-WEBHOOK] ✅ Plano encontrado: ${plano.nome} (id: ${plano._id})`);
          } else {
            console.warn(`[STRIPE-WEBHOOK] ⚠️ Nenhum plano encontrado com stripe_price_id=${priceId}`);
          }
        }

        if (sub.trial_end) {
          lojista.data_vencimento = new Date(sub.trial_end * 1000);
        }

        if (!lojista.data_vencimento_taxas) {
          lojista.data_vencimento_taxas = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }

        lojista.historico_assinatura.push({
          evento: 'checkout.session.completed',
          data: new Date(),
          detalhes: 'Assinatura ativada (Checkout concluído).',
        });

        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ✅ Lojista atualizado no banco: status=${lojista.subscription_status}, plano=${lojista.plano}`);

        const branding = await getBranding();
        const dataCobranca = lojista.data_vencimento
          ? new Date(lojista.data_vencimento).toLocaleDateString('pt-BR')
          : '7 dias';
        const planoNome = lojista.plano_id ? (await Plano.findById(lojista.plano_id))?.nome || 'Seu plano' : 'Seu plano';

        const { emailAssinaturaTrialHtml } = require('../../email.js');
        await sendEmail({
          to: lojista.email,
          subject: `🎉 Bem-vindo ao plano ${planoNome}! | ${branding.brandName}`,
          html: emailAssinaturaTrialHtml({ nome: lojista.nome, plano_nome: planoNome, data_cobranca: dataCobranca, branding }),
        });
        console.log(`[STRIPE-WEBHOOK] ✅ Email de trial enviado para ${lojista.email}`);
      }
    }

    // === invoice.payment_succeeded ===
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      console.log(`[STRIPE-WEBHOOK] 📋 invoice.payment_succeeded — customerId=${customerId}`);
      const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
      if (lojista) {
        lojista.subscription_status = 'active';
        if (invoice.lines?.data?.[0]?.period?.end) {
          lojista.data_vencimento = new Date(invoice.lines.data[0].period.end * 1000);
        }
        lojista.historico_assinatura.push({
          evento: 'invoice.payment_succeeded',
          data: new Date(),
          detalhes: 'Mensalidade do plano renovada com sucesso.',
        });
        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ✅ Lojista ${lojista.email} atualizado para active`);
      } else {
        console.warn(`[STRIPE-WEBHOOK] ⚠️ Nenhum lojista com stripe_customer_id=${customerId}`);
      }
    }

    // === invoice.payment_failed ===
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      console.log(`[STRIPE-WEBHOOK] 📋 invoice.payment_failed — customerId=${customerId}`);
      const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
      if (lojista) {
        lojista.subscription_status = 'past_due';
        lojista.historico_assinatura.push({
          evento: 'invoice.payment_failed',
          data: new Date(),
          detalhes: 'Falha no pagamento da fatura (Mensalidade ou Taxas).',
        });
        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ⚠️ Lojista ${lojista.email} marcado como past_due`);

        const branding = await getBranding();
        const baseUrl = getBaseUrl();
        const { emailFalhaPagamentoHtml } = require('../../email.js');
        await sendEmail({
          to: lojista.email,
          subject: `⚠️ Falha no pagamento | ${branding.brandName}`,
          html: emailFalhaPagamentoHtml({ nome: lojista.nome, branding, painelUrl: baseUrl + '/painel/assinatura' }),
        });
      } else {
        console.warn(`[STRIPE-WEBHOOK] ⚠️ Nenhum lojista com stripe_customer_id=${customerId}`);
      }
    }

    // === customer.subscription.deleted ===
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      console.log(`[STRIPE-WEBHOOK] 📋 customer.subscription.deleted — customerId=${customerId}`);
      const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
      if (lojista) {
        lojista.subscription_status = 'canceled';
        lojista.plano = 'free';
        lojista.plano_id = null;
        lojista.stripe_subscription_id = null;
        lojista.cancel_at_period_end = false;
        lojista.cancel_at = null;
        lojista.historico_assinatura.push({
          evento: 'customer.subscription.deleted',
          data: new Date(),
          detalhes: 'Assinatura cancelada definitivamente.',
        });
        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ✅ Lojista ${lojista.email} cancelado, revertido para free`);
      }
    }

    // === charge.refunded ===
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const customerId = charge.customer;
      console.log(`[STRIPE-WEBHOOK] 📋 charge.refunded — customerId=${customerId}`);
      const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
      if (lojista) {
        lojista.subscription_status = 'canceled';
        lojista.plano = 'free';
        lojista.plano_id = null;
        lojista.stripe_subscription_id = null;
        lojista.data_vencimento = null;
        lojista.cancel_at_period_end = false;
        lojista.cancel_at = null;
        lojista.historico_assinatura.push({
          evento: 'charge.refunded',
          data: new Date(),
          detalhes: 'Estorno processado. Acesso premium revogado imediatamente.',
        });
        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ✅ Estorno processado. Acesso premium revogado para customer: ${customerId} (${lojista.email})`);
      } else {
        console.warn(`[STRIPE-WEBHOOK] ⚠️ Nenhum lojista com stripe_customer_id=${customerId}`);
      }
    }

    // === customer.subscription.updated ===
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const newPriceId = sub.items?.data?.[0]?.price?.id || null;
      console.log(`[STRIPE-WEBHOOK] 📋 customer.subscription.updated — customerId=${customerId}, status=${sub.status}, priceId=${newPriceId}`);
      const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
      if (lojista) {
        lojista.subscription_status = sub.status;
        if (sub.current_period_end) {
          lojista.data_vencimento = new Date(sub.current_period_end * 1000);
        }

        if (newPriceId) {
          const planoEncontrado = await Plano.findOne({ stripe_price_id: newPriceId, is_active: true });
          if (planoEncontrado) {
            lojista.plano_id = planoEncontrado._id;
            lojista.plano = planoEncontrado.nome.toLowerCase();
            console.log(`[STRIPE-WEBHOOK] 🔄 Plano atualizado para "${planoEncontrado.nome}" (${planoEncontrado._id}) via upgrade/downgrade`);
          } else {
            console.warn(`[STRIPE-WEBHOOK] ⚠️ Nenhum plano encontrado com stripe_price_id=${newPriceId}`);
          }
        }

        lojista.cancel_at_period_end = sub.cancel_at_period_end || false;
        lojista.cancel_at = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;
        console.log(`[STRIPE-WEBHOOK] 📋 cancel_at_period_end=${lojista.cancel_at_period_end}, cancel_at=${lojista.cancel_at}`);

        lojista.historico_assinatura.push({
          evento: 'customer.subscription.updated',
          data: new Date(),
          detalhes: `Assinatura atualizada (Alteração de plano ou status). Status: ${sub.status}`,
        });

        await lojista.save();
        console.log(`[STRIPE-WEBHOOK] ✅ Lojista ${lojista.email} atualizado para ${sub.status}`);
      }
    }
  } catch (err) {
    console.error(`[STRIPE-WEBHOOK] ❌ Erro ao processar evento ${event.type}:`, err);
  }

  return { received: true };
}

/**
 * Cria sessão do Stripe Billing Portal.
 */
async function createPortalSession({ user }) {
  const lojista = await Lojista.findById(user.lojista_id);
  if (!lojista || !lojista.stripe_customer_id) {
    return { error: 'Nenhuma assinatura ativa encontrada', httpStatus: 400 };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { error: 'Stripe não configurado', httpStatus: 500 };

  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: lojista.stripe_customer_id,
    return_url: `${baseUrl}/painel/assinatura`,
  });

  return { data: { url: portalSession.url }, httpStatus: 200 };
}

/**
 * Processa cobrança cron de taxas semanais.
 */
async function processarCronTaxas() {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { error: 'Stripe não configurado', httpStatus: 500 };
  const stripe = require('stripe')(STRIPE_SECRET_KEY);

  const now = new Date();
  const lojistas = await Lojista.find({
    taxas_acumuladas: { $gt: 0 },
    data_vencimento_taxas: { $lte: now },
    stripe_customer_id: { $ne: null },
    status_taxas: { $ne: 'bloqueado' },
    modo_amigo: { $ne: true },
  });

  console.log(`[CRON-TAXAS] Processando ${lojistas.length} lojistas com taxas pendentes`);

  let sucesso = 0, falha = 0;
  for (const lojista of lojistas) {
    try {
      const amountCents = Math.round(lojista.taxas_acumuladas * 100);
      if (amountCents <= 0) continue;

      await stripe.invoiceItems.create({
        customer: lojista.stripe_customer_id,
        amount: amountCents,
        currency: 'brl',
        description: `Taxas de transação acumuladas — R$ ${lojista.taxas_acumuladas.toFixed(2)}`,
      });

      const invoice = await stripe.invoices.create({
        customer: lojista.stripe_customer_id,
        auto_advance: true,
      });
      await stripe.invoices.pay(invoice.id);

      const valorCobrado = lojista.taxas_acumuladas;
      lojista.taxas_acumuladas = 0;
      lojista.tentativas_taxas = 0;
      lojista.status_taxas = 'ok';
      lojista.data_vencimento_taxas = new Date(lojista.data_vencimento_taxas.getTime() + 7 * 24 * 60 * 60 * 1000);
      lojista.historico_assinatura.push({
        evento: 'cobranca_taxas_sucesso',
        data: new Date(),
        detalhes: `Cobrança semanal de taxas processada e paga: R$ ${valorCobrado.toFixed(2)}`,
      });
      await lojista.save();
      sucesso++;
      console.log(`[CRON-TAXAS] ✅ Cobrado R$ ${valorCobrado.toFixed(2)} de ${lojista.email}`);
    } catch (err) {
      lojista.tentativas_taxas = (lojista.tentativas_taxas || 0) + 1;

      if (lojista.tentativas_taxas >= 3) {
        lojista.status_taxas = 'bloqueado';
        lojista.historico_assinatura.push({
          evento: 'cobranca_taxas_falha',
          data: new Date(),
          detalhes: `Falha na cobrança de R$ ${lojista.taxas_acumuladas.toFixed(2)}. Limite de tentativas atingido. Aguardando pagamento manual.`,
        });
      } else {
        lojista.status_taxas = 'falha';
        lojista.data_vencimento_taxas = new Date(Date.now() + 24 * 60 * 60 * 1000);
        lojista.historico_assinatura.push({
          evento: 'cobranca_taxas_falha',
          data: new Date(),
          detalhes: `Falha na cobrança de R$ ${lojista.taxas_acumuladas.toFixed(2)}. Tentativa ${lojista.tentativas_taxas}/3. Nova tentativa agendada para amanhã.`,
        });
      }

      await lojista.save();
      falha++;
      console.error(`[CRON-TAXAS] ❌ Falha para ${lojista.email} (tentativa ${lojista.tentativas_taxas}/3):`, err.message);
    }
  }

  return { data: { processados: lojistas.length, sucesso, falha }, httpStatus: 200 };
}

/**
 * Pagamento manual de taxas pelo lojista.
 */
async function pagarTaxasManual({ user }) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { error: 'Stripe não configurado', httpStatus: 500 };
  const stripe = require('stripe')(STRIPE_SECRET_KEY);

  const lojista = await Lojista.findById(user.lojista_id);
  if (!lojista) return { error: 'Lojista não encontrado', httpStatus: 404 };
  if (!lojista.stripe_customer_id) return { error: 'Sem cliente Stripe vinculado', httpStatus: 400 };
  if (lojista.taxas_acumuladas <= 0) return { error: 'Nenhuma taxa pendente', httpStatus: 400 };

  const amountCents = Math.round(lojista.taxas_acumuladas * 100);

  await stripe.invoiceItems.create({
    customer: lojista.stripe_customer_id,
    amount: amountCents,
    currency: 'brl',
    description: `Regularização manual de taxas — R$ ${lojista.taxas_acumuladas.toFixed(2)}`,
  });

  const invoice = await stripe.invoices.create({
    customer: lojista.stripe_customer_id,
    auto_advance: true,
  });
  await stripe.invoices.pay(invoice.id);

  const valorCobrado = lojista.taxas_acumuladas;
  lojista.taxas_acumuladas = 0;
  lojista.tentativas_taxas = 0;
  lojista.status_taxas = 'ok';
  lojista.data_vencimento_taxas = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  lojista.historico_assinatura.push({
    evento: 'cobranca_taxas_manual_sucesso',
    data: new Date(),
    detalhes: `Pagamento manual de taxas realizado com sucesso: R$ ${valorCobrado.toFixed(2)}`,
  });
  await lojista.save();

  return { data: { success: true, message: `Pagamento de R$ ${valorCobrado.toFixed(2)} processado com sucesso` }, httpStatus: 200 };
}

module.exports = { createCheckoutSession, handleWebhookEvent, createPortalSession, processarCronTaxas, pagarTaxasManual };
