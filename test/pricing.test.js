'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrder } = require('../lib/pricing');
const catalog = require('../data/products.json').produtos;

const base = () => ({
  itens: [{ slug: 'taca-gigante-shot-tower', qtd: 2 }],
  entrega: 'economica',
  pagamento: 'cartao',
  cliente: { nome: 'Ana Souza', email: 'ana@exemplo.com', telefone: '(11) 91234-5678' },
  endereco: { cep: '09015-520', rua: 'Rua Onze de Junho', numero: '17', bairro: 'Casa Branca', cidade: 'Santo André', uf: 'sp' },
});

test('cartão: sem desconto, preço do catálogo', () => {
  const o = buildOrder(base(), catalog);
  assert.equal(o.total, 179.8);
  assert.equal(o.desconto, 0);
});

test('pix: 10% de desconto', () => {
  const o = buildOrder({ ...base(), pagamento: 'pix' }, catalog);
  assert.equal(o.subtotal, 179.8);
  assert.equal(o.total, 161.82);
  assert.equal(o.desconto, 17.98);
});

test('entrega expressa usa preço expresso', () => {
  const o = buildOrder({ ...base(), entrega: 'expressa' }, catalog);
  assert.equal(o.total, 259.8);
});

test('ignora preço enviado pelo navegador', () => {
  const b = base();
  b.itens[0].preco = 0.01;
  assert.equal(buildOrder(b, catalog).total, 179.8);
});

test('rejeita produto inexistente, qtd inválida e entrega inválida', () => {
  assert.throws(() => buildOrder({ ...base(), itens: [{ slug: 'nada', qtd: 1 }] }, catalog), /indisponível/);
  assert.throws(() => buildOrder({ ...base(), itens: [{ slug: 'taca-gigante-shot-tower', qtd: -1 }] }, catalog), /Item inválido/);
  assert.throws(() => buildOrder({ ...base(), entrega: 'gratis' }, catalog), /entrega/);
});

test('rejeita dados do cliente inválidos', () => {
  const b = base();
  b.cliente.email = 'xxx';
  assert.throws(() => buildOrder(b, catalog), /E-mail/);
});
