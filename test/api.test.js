'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.MP_ACCESS_TOKEN = 'TEST-token';
process.env.SITE_URL = 'https://loja.exemplo.com.br';
process.env.MP_WEBHOOK_SECRET = 'segredo';
const checkout = require('../api/checkout');
const webhook = require('../api/webhook');

const mkRes = () => {
  const r = { code: 200, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
};
const order = (over = {}) => ({
  itens: [{ slug: 'jogo-tiro-de-tampinha', qtd: 1 }], entrega: 'economica', pagamento: 'pix',
  cliente: { nome: 'Ana', email: 'ana@exemplo.com', telefone: '11912345678' },
  endereco: { cep: '09015520', rua: 'Rua A', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP' }, ...over,
});

test('checkout cria preferência só-Pix com 10% off e preço do servidor', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return { ok: true, json: async () => ({ init_point: 'https://www.mercadopago.com.br/x' }) }; };
  const res = mkRes();
  await checkout({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' }, body: order() }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.url, 'https://www.mercadopago.com.br/x');
  assert.equal(sent.init.headers.Authorization, 'Bearer TEST-token');
  assert.equal(sent.body.items[0].unit_price, 53.91);
  assert.ok(sent.body.payment_methods.excluded_payment_types.some((t) => t.id === 'credit_card'));
  assert.ok(!sent.body.payment_methods.excluded_payment_types.some((t) => t.id === 'bank_transfer'));
});

test('checkout cartão bloqueia Pix e cobra preço cheio', async () => {
  let sent;
  global.fetch = async (u, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ init_point: 'https://www.mercadopago.com.br/x' }) }; };
  const res = mkRes();
  await checkout({ method: 'POST', headers: { 'x-forwarded-for': '2.2.2.2' }, body: order({ pagamento: 'cartao' }) }, res);
  assert.equal(sent.items[0].unit_price, 59.9);
  assert.ok(sent.payment_methods.excluded_payment_types.some((t) => t.id === 'bank_transfer'));
});

test('checkout rejeita pedido inválido e método errado', async () => {
  const r1 = mkRes();
  await checkout({ method: 'POST', headers: { 'x-forwarded-for': '3.3.3.3' }, body: order({ entrega: 'x' }) }, r1);
  assert.equal(r1.code, 400);
  const r2 = mkRes();
  await checkout({ method: 'GET', headers: {} }, r2);
  assert.equal(r2.code, 405);
});

test('webhook: assinatura inválida é recusada; válida consulta o pagamento', async () => {
  const bad = mkRes();
  await webhook({ method: 'POST', query: { 'data.id': '123' }, headers: { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'r' } }, bad);
  assert.equal(bad.code, 401);

  const ts = '1700000000';
  const v1 = crypto.createHmac('sha256', 'segredo').update(`id:123;request-id:r;ts:${ts};`).digest('hex');
  let called;
  global.fetch = async (url) => { called = url; return { ok: true, json: async () => ({ status: 'pending' }) }; };
  const ok = mkRes();
  await webhook({ method: 'POST', query: { 'data.id': '123' }, headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'r' } }, ok);
  assert.equal(ok.code, 200);
  assert.match(called, /v1\/payments\/123$/);
});
