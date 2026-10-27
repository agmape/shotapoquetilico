'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildOrder, ENTREGAS } = require('../lib/pricing');

const MP_API = 'https://api.mercadopago.com/checkout/preferences';

// Pix no Mercado Pago é do tipo "bank_transfer".
const EXCLUDE_PIX_ONLY = ['credit_card', 'debit_card', 'ticket', 'atm', 'prepaid_card', 'digital_currency', 'digital_wallet'];
const EXCLUDE_CARD_ONLY = ['bank_transfer', 'ticket', 'atm', 'digital_currency'];

// Limite simples por IP (por instância; barra abuso básico sem banco de dados).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
}

function loadCatalog() {
  const file = path.join(process.cwd(), 'data', 'products.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).produtos;
}

function siteUrl() {
  return (process.env.SITE_URL || '').replace(/\/+$/, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const token = process.env.MP_ACCESS_TOKEN;
  const base = siteUrl();
  if (!token || !base) return res.status(500).json({ erro: 'Loja ainda não configurada para pagamentos.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (rateLimited(ip)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const order = buildOrder(body, loadCatalog());
    const ref = `SA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const preference = {
      items: order.itens.map((i) => ({
        id: i.slug,
        title: `${i.nome} · entrega ${order.entrega}`.slice(0, 250),
        quantity: i.qtd,
        unit_price: i.precoUnit,
        currency_id: 'BRL',
      })),
      payer: { name: order.cliente.nome, email: order.cliente.email },
      payment_methods: {
        excluded_payment_types: (order.pagamento === 'pix' ? EXCLUDE_PIX_ONLY : EXCLUDE_CARD_ONLY).map((id) => ({ id })),
        installments: order.pagamento === 'pix' ? 1 : 12,
      },
      back_urls: {
        success: `${base}/sucesso.html?pedido=${ref}`,
        pending: `${base}/sucesso.html?pedido=${ref}&status=pendente`,
        failure: `${base}/checkout.html?erro=pagamento`,
      },
      auto_return: 'approved',
      notification_url: `${base}/api/webhook`,
      external_reference: ref,
      statement_descriptor: 'SHOT APOQUETILICO',
      metadata: {
        pedido: ref,
        entrega: ENTREGAS[order.entrega].nome,
        pagamento: order.pagamento,
        cliente: order.cliente,
        endereco: order.endereco,
        itens: order.itens.map((i) => ({ slug: i.slug, qtd: i.qtd })),
      },
    };

    const mp = await fetch(MP_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': ref },
      body: JSON.stringify(preference),
    });
    const data = await mp.json().catch(() => ({}));
    if (!mp.ok || !data.init_point) {
      console.error('Mercado Pago recusou a preferência', mp.status, JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ erro: 'Não foi possível iniciar o pagamento. Tente novamente.' });
    }
    return res.status(200).json({ pedido: ref, total: order.total, url: data.init_point });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ erro: err.message });
    console.error('Erro no checkout', err);
    return res.status(500).json({ erro: 'Erro inesperado. Tente novamente.' });
  }
};
