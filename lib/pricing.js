'use strict';

const PIX_DISCOUNT = 0.1;
const MAX_QTY = 10;
const MAX_ITEMS = 20;
const ENTREGAS = {
  economica: { nome: 'Econômica (até ~15 dias)', campo: 'preco' },
  expressa: { nome: 'Expressa', campo: 'precoExpresso' },
};

const round2 = (n) => Math.round(n * 100) / 100;

function fail(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

function str(v, max, field) {
  if (typeof v !== 'string') throw fail(`Campo inválido: ${field}`);
  const s = v.trim();
  if (!s || s.length > max) throw fail(`Campo inválido: ${field}`);
  return s;
}

function validateCustomer(body) {
  const c = body.cliente || {};
  const a = body.endereco || {};
  const cliente = {
    nome: str(c.nome, 100, 'nome'),
    email: str(c.email, 120, 'email'),
    telefone: str(c.telefone, 20, 'telefone').replace(/\D/g, ''),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) throw fail('E-mail inválido');
  if (cliente.telefone.length < 10 || cliente.telefone.length > 13) throw fail('Telefone inválido');
  const endereco = {
    cep: str(a.cep, 9, 'cep').replace(/\D/g, ''),
    rua: str(a.rua, 120, 'rua'),
    numero: str(a.numero, 10, 'numero'),
    complemento: typeof a.complemento === 'string' ? a.complemento.trim().slice(0, 60) : '',
    bairro: str(a.bairro, 80, 'bairro'),
    cidade: str(a.cidade, 80, 'cidade'),
    uf: str(a.uf, 2, 'uf').toUpperCase(),
  };
  if (endereco.cep.length !== 8) throw fail('CEP inválido');
  if (!/^[A-Z]{2}$/.test(endereco.uf)) throw fail('UF inválida');
  return { cliente, endereco };
}

/**
 * Monta o pedido usando SEMPRE os preços do catálogo (nunca os do navegador).
 * body: { itens:[{slug,qtd}], entrega:'economica'|'expressa', pagamento:'pix'|'cartao', cliente, endereco }
 */
function buildOrder(body, catalog) {
  if (!body || typeof body !== 'object') throw fail('Pedido inválido');
  const entrega = ENTREGAS[body.entrega];
  if (!entrega) throw fail('Opção de entrega inválida');
  if (body.pagamento !== 'pix' && body.pagamento !== 'cartao') throw fail('Forma de pagamento inválida');
  if (!Array.isArray(body.itens) || !body.itens.length || body.itens.length > MAX_ITEMS) {
    throw fail('Carrinho vazio ou inválido');
  }
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const merged = new Map();
  for (const it of body.itens) {
    const qtd = Number(it && it.qtd);
    if (!it || typeof it.slug !== 'string' || !Number.isInteger(qtd) || qtd < 1 || qtd > MAX_QTY) {
      throw fail('Item inválido');
    }
    merged.set(it.slug, Math.min(MAX_QTY, (merged.get(it.slug) || 0) + qtd));
  }
  const desconto = body.pagamento === 'pix' ? PIX_DISCOUNT : 0;
  const itens = [];
  for (const [slug, qtd] of merged) {
    const p = bySlug.get(slug);
    if (!p || p.disponivel === false) throw fail(`Produto indisponível: ${slug}`);
    const base = Number(p[entrega.campo]);
    if (!(base > 0)) throw fail(`Produto sem preço: ${slug}`);
    itens.push({ slug, nome: p.nome, qtd, precoBase: base, precoUnit: round2(base * (1 - desconto)) });
  }
  const subtotal = round2(itens.reduce((s, i) => s + i.precoBase * i.qtd, 0));
  const total = round2(itens.reduce((s, i) => s + i.precoUnit * i.qtd, 0));
  return { itens, entrega: body.entrega, pagamento: body.pagamento, subtotal, desconto: round2(subtotal - total), total, ...validateCustomer(body) };
}

module.exports = { buildOrder, PIX_DISCOUNT, ENTREGAS, round2 };
