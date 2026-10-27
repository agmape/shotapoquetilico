'use strict';
const crypto = require('node:crypto');

const MP_PAYMENTS = 'https://api.mercadopago.com/v1/payments/';

function validSignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false; // sem segredo configurado, não confiamos em nada
  const header = String(req.headers['x-signature'] || '');
  const requestId = String(req.headers['x-request-id'] || '');
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function notifyOwner(payment) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const m = payment.metadata || {};
  const c = m.cliente || {};
  const e = m.endereco || {};
  const itens = (m.itens || []).map((i) => `${i.qtd}x ${i.slug}`).join('\n');
  const text = [
    `PAGAMENTO APROVADO · pedido ${m.pedido || payment.external_reference}`,
    `Valor: R$ ${payment.transaction_amount} (${m.pagamento})`,
    `Entrega: ${m.entrega}`,
    '',
    itens,
    '',
    `${c.nome} · ${c.email} · ${c.telefone}`,
    `${e.rua}, ${e.numero} ${e.complemento || ''} · ${e.bairro} · ${e.cidade}/${e.uf} · CEP ${e.cep}`,
  ].join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || 'Loja <onboarding@resend.dev>',
      to: [to],
      subject: `💰 Venda aprovada ${m.pedido || ''}`,
      text,
    }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const dataId = (req.query && req.query['data.id']) || (req.body && req.body.data && req.body.data.id);
  if (!dataId || !/^\d+$/.test(String(dataId))) return res.status(400).end();
  if (!validSignature(req, dataId)) return res.status(401).end();

  try {
    // Nunca confiamos no corpo do aviso: consultamos o pagamento direto no Mercado Pago.
    const r = await fetch(MP_PAYMENTS + dataId, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } });
    if (!r.ok) return res.status(502).end();
    const payment = await r.json();
    if (payment.status === 'approved') await notifyOwner(payment);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook', err);
    return res.status(500).end();
  }
};
