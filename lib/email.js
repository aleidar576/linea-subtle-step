// ============================================
// 📧 Email Service - Resend API (via fetch)
// ============================================

const RESEND_API_URL = 'https://api.resend.com/emails';

function getFromAddress() {
  return process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
}

function getBaseUrl() {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
}

/**
 * Busca branding (nome + logo) das settings do MongoDB
 */
let _brandingCache = null;
let _brandingCacheTime = 0;
const BRANDING_CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getBranding() {
  if (_brandingCache && Date.now() - _brandingCacheTime < BRANDING_CACHE_TTL) {
    return _brandingCache;
  }
  try {
    const connectDB = require('../lib/mongodb.js');
    await connectDB();
    const Setting = require('../models/Setting.js');
    const settings = await Setting.find({ key: { $in: ['saas_name', 'saas_logo_url'] } }).lean();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    _brandingCache = {
      brandName: map.saas_name || 'Pandora',
      logoUrl: map.saas_logo_url || '',
    };
    _brandingCacheTime = Date.now();
  } catch (err) {
    console.warn('[EMAIL] Falha ao buscar branding:', err.message);
    if (!_brandingCache) {
      _brandingCache = { brandName: 'Pandora', logoUrl: '' };
    }
    _brandingCacheTime = Date.now();
  }
  return _brandingCache;
}

/**
 * Gera o header HTML do email com logo ou nome
 */
function _headerHtml(branding) {
  if (branding.logoUrl) {
    return `<img src="${branding.logoUrl}" alt="${branding.brandName}" style="max-height:40px;max-width:200px;" />`;
  }
  return `<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${branding.brandName.toUpperCase()}</h1>`;
}

/**
 * Envia um email via Resend API
 */
async function sendEmail({ to, subject, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY não configurada. Email não enviado.');
    return { success: false, error: 'API key não configurada' };
  }

  try {
    const payload = {
      from: getFromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
      }));
    }

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[EMAIL] Erro Resend:', data);
      return { success: false, error: data.message || 'Erro ao enviar email' };
    }

    console.log('[EMAIL] Enviado com sucesso:', data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[EMAIL] Exceção:', err.message);
    return { success: false, error: err.message };
  }
}

// === Templates HTML ===

function emailVerificacaoHtml({ nome, link, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Olá, ${nome}! 👋</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Obrigado por se registar na <strong>${brand}</strong>. Para ativar a sua conta, clique no botão abaixo:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${link}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
              Verificar Email
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Se não criou esta conta, pode ignorar este email. O link expira em 24 horas.
          </p>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
            Caso o botão não funcione, copie e cole este link no navegador:<br/>
            <a href="${link}" style="color:#18181b;">${link}</a>
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailRedefinicaoSenhaHtml({ nome, link, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Redefinição de Senha 🔒</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${link}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
              Redefinir Senha
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Se não solicitou esta alteração, ignore este email. O link expira em 1 hora.
          </p>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
            Link direto:<br/>
            <a href="${link}" style="color:#18181b;">${link}</a>
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailRastreioHtml({ nome, numero_pedido, codigo_rastreio, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Seu pedido foi enviado! 📦</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} O seu pedido <strong>#${numero_pedido}</strong> está a caminho!
          </p>
          <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Código de Rastreio</p>
            <p style="margin:0;color:#18181b;font-size:20px;font-weight:700;letter-spacing:2px;">${codigo_rastreio}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="https://www.linkcorreios.com.br/?id=${codigo_rastreio}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
              Rastrear Pedido
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Você pode acompanhar a entrega pelo site dos Correios ou pela transportadora usando o código acima.
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Alerta de alteração de senha com botão "Não fui eu"
 */
function emailAlteracaoSenhaHtml({ nome, link, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Alerta de Segurança 🔐</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} A senha da sua conta foi alterada com sucesso.
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Se foi você quem fez essa alteração, pode ignorar este email com segurança.
          </p>
          <p style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.6;font-weight:600;">
            Se você NÃO alterou sua senha, clique imediatamente no botão abaixo:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 0;">
            <a href="${link}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
              ⚠️ NÃO FUI EU QUE ALTEREI
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Ao clicar no botão acima, sua conta será bloqueada temporariamente por segurança e nossa equipe será notificada.
          </p>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
            Link direto:<br/>
            <a href="${link}" style="color:#dc2626;">${link}</a>
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia alerta de alteração de senha
 */
async function sendPasswordChangeAlert({ nome, email, securityToken }) {
  const branding = await getBranding();
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/api/admins?scope=security-report&token=${securityToken}`;
  const html = emailAlteracaoSenhaHtml({ nome, link, branding });

  console.log('[EMAIL] Alerta de alteração de senha preparado para:', email);
  console.log('[EMAIL] Link de segurança:', link);

  return sendEmail({
    to: email,
    subject: `⚠️ Alerta de Segurança - Senha Alterada | ${branding.brandName}`,
    html,
  });
}

/**
 * E-mail com relatório em anexo
 */
async function sendReportEmail({ to, nomeRelatorio, html, csvBuffer, xlsxBuffer }) {
  const branding = await getBranding();
  console.log('[EMAIL] Relatório com anexos para:', to);

  const attachments = [];
  if (csvBuffer) {
    attachments.push({ filename: `${nomeRelatorio}.csv`, content: csvBuffer });
  }
  if (xlsxBuffer) {
    attachments.push({ filename: `${nomeRelatorio}.xlsx`, content: xlsxBuffer });
  }

  return sendEmail({
    to,
    subject: `📊 Relatório: ${nomeRelatorio} | ${branding.brandName}`,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}

function emailRelatorioHtml({ nome, nomeRelatorio, periodo, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Seu relatório está pronto! 📊</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} O relatório <strong>${nomeRelatorio}</strong> do período <strong>${periodo}</strong> foi gerado com sucesso.
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Os arquivos em formato CSV e Excel (.xlsx) estão disponíveis no seu painel de relatórios.
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Gera buffers CSV e XLSX a partir de dados tabulares
 */
function generateReportFiles(data, headers) {
  const XLSX = require('xlsx');

  // CSV
  const csvLines = [headers.map(h => h.label).join(',')];
  data.forEach(row => {
    csvLines.push(headers.map(h => `"${row[h.key] ?? ''}"`).join(','));
  });
  const csvBuffer = Buffer.from(csvLines.join('\n'), 'utf-8');

  // XLSX
  const wsData = [headers.map(h => h.label)];
  data.forEach(row => {
    wsData.push(headers.map(h => row[h.key] ?? ''));
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Format monetary columns
  headers.forEach((h, idx) => {
    if (h.format === 'currency') {
      for (let r = 1; r <= data.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: idx })];
        if (cell && typeof cell.v === 'number') {
          cell.z = 'R$ #,##0.00';
        }
      }
    }
  });

  // Column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.label.length + 2, 15) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  const xlsxBuffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  return { csvBuffer, xlsxBuffer };
}

/**
 * Email de boas-vindas ao trial
 */
function emailAssinaturaTrialHtml({ nome, plano_nome, data_cobranca, branding = {} }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#18181b;font-size:20px;">Bem-vindo ao plano ${plano_nome}! 🎉</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} Você assinou o plano <strong>${plano_nome}</strong>. Agradecemos a confiança!
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Sua primeira cobrança será realizada automaticamente no dia <strong>${data_cobranca}</strong>. Garanta saldo no cartão para evitar bloqueios.
          </p>
          <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Você pode gerenciar sua assinatura a qualquer momento pelo painel.
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Email de falha no pagamento
 */
function emailFalhaPagamentoHtml({ nome, branding = {}, painelUrl = '' }) {
  const brand = branding.brandName || 'Pandora';
  const header = _headerHtml({ brandName: brand, logoUrl: branding.logoUrl || '' });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="margin:0 0 8px;color:#dc2626;font-size:20px;">⚠️ Falha no Pagamento</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            ${nome ? `Olá, <strong>${nome}</strong>.` : 'Olá.'} Não conseguimos processar o pagamento da sua assinatura.
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Para evitar o bloqueio da sua loja, regularize sua assinatura o mais rápido possível.
          </p>
          ${painelUrl ? `
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${painelUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
              Regularizar Assinatura
            </a>
          </td></tr></table>` : ''}
          <p style="margin:28px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Se precisar de ajuda, entre em contato com nosso suporte.
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = {
  sendEmail,
  getBaseUrl,
  getBranding,
  emailVerificacaoHtml,
  emailRedefinicaoSenhaHtml,
  emailRastreioHtml,
  emailAlteracaoSenhaHtml,
  sendPasswordChangeAlert,
  sendReportEmail,
  emailRelatorioHtml,
  generateReportFiles,
  emailAssinaturaTrialHtml,
  emailFalhaPagamentoHtml,
};
