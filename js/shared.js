import { LOJA, PIX_DESCONTO } from './config.js';

/* ---------- utilidades ---------- */
export const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const VEREDITOS = {
  aprovadao: { label: 'Aprovadão', icon: '🔥' },
  vale: { label: 'Vale a pena', icon: '👍' },
  meh: { label: 'Meh', icon: '😐' },
  lixo: { label: 'Lixo', icon: '🗑️' },
  'em-teste': { label: 'Em teste', icon: '🧪' },
};

/* ---------- catálogo ---------- */
let _catalog;
export async function loadCatalog() {
  if (!_catalog) {
    const r = await fetch('data/products.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('Não foi possível carregar os produtos');
    _catalog = (await r.json()).produtos.filter((p) => p.disponivel !== false);
  }
  return _catalog;
}

/* ---------- carrinho (só slug + quantidade; preço vem sempre do catálogo) ---------- */
const KEY = 'sa_cart_v1';
export const cart = {
  get() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw)
        ? raw.filter((i) => i && typeof i.slug === 'string' && Number.isInteger(i.qtd) && i.qtd > 0 && i.qtd <= 10)
        : [];
    } catch { return []; }
  },
  save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* modo privado */ }
    updateBadge();
  },
  add(slug, qtd = 1) {
    const items = this.get();
    const found = items.find((i) => i.slug === slug);
    if (found) found.qtd = Math.min(10, found.qtd + qtd);
    else items.push({ slug, qtd: Math.min(10, qtd) });
    this.save(items);
  },
  set(slug, qtd) {
    const items = this.get().filter((i) => i.slug !== slug);
    if (qtd > 0) items.push({ slug, qtd: Math.min(10, qtd) });
    this.save(items);
  },
  clear() { this.save([]); },
  count() { return this.get().reduce((s, i) => s + i.qtd, 0); },
};

function updateBadge() {
  const el = document.querySelector('.cart-count');
  if (el) { const n = cart.count(); el.textContent = n; el.dataset.n = n; }
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div', { class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- cartão de produto ---------- */
export function productVisual(p) {
  return p.fotos && p.fotos[0]
    ? h('img', { src: p.fotos[0], alt: p.nome, loading: 'lazy', width: 600, height: 600, referrerpolicy: 'no-referrer' })
    : h('span', { class: 'emoji', 'aria-hidden': 'true' }, p.emoji || '🎉');
}

export function productCard(p) {
  const v = VEREDITOS[p.veredito] || VEREDITOS['em-teste'];
  return h('a', { class: 'card', href: `produto.html?p=${encodeURIComponent(p.slug)}` },
    h('div', { class: 'thumb' },
      productVisual(p),
      h('span', { class: `verdict ${p.veredito}` }, `${v.icon} ${v.label}`),
      p.nota != null && h('span', { class: `score ${p.veredito}`, 'aria-label': `Nota ${p.nota} de 10` }, String(p.nota).replace('.', ','))),
    h('div', { class: 'card-body' },
      h('span', { class: 'cat' }, p.categoria),
      h('h3', {}, p.nome),
      h('p', { class: 'muted', style: null }, p.resumo),
      h('div', { class: 'price-row' },
        h('span', { class: 'price' }, brl(p.preco)),
        h('span', { class: 'price-pix' }, `${brl(p.preco * (1 - PIX_DESCONTO))} no Pix`))));
}

/* ---------- cabeçalho e rodapé ---------- */
const REDES = [['instagram', 'Instagram', '📸'], ['youtube', 'YouTube', '▶️'], ['tiktok', 'TikTok', '🎵'], ['facebook', 'Facebook', '👍']];

export function socialLinks() {
  return REDES.filter(([k]) => LOJA.redes[k]).map(([k, nome, ico]) =>
    h('a', { class: 'social', href: LOJA.redes[k], target: '_blank', rel: 'noopener noreferrer' }, `${ico} ${nome}`));
}

export function mountChrome(current = '') {
  const header = h('header', { class: 'site-header' },
    h('div', { class: 'wrap' },
      h('a', { class: 'brand', href: './', 'aria-label': `${LOJA.nome} – início` },
        h('img', { src: 'assets/logo.webp', alt: '', width: 52, height: 52 }),
        h('span', {}, 'Shot', h('small', {}, 'Apoquetílico'))),
      h('nav', { class: 'nav', 'aria-label': 'Principal' },
        h('a', { href: 'index.html#produtos', class: 'hide-sm' }, 'Produtos'),
        h('a', { href: 'index.html#ranking', class: 'hide-sm' }, 'Ranking'),
        h('a', { href: 'index.html#canais', class: 'hide-sm' }, 'Canais'),
        h('a', { href: 'checkout.html', class: 'cart-btn', 'aria-label': 'Carrinho' },
          '🛒 ', h('span', { class: 'hide-sm' }, 'Carrinho'), h('span', { class: 'cart-count', 'data-n': cart.count() }, cart.count())))));
  const bar = h('div', { class: 'age-bar' }, '🔞 +18 · Aqui NÃO vendemos bebida alcoólica — só acessórios de bar e diversão.');
  document.body.prepend(header);
  document.body.prepend(bar);

  const contato = [
    LOJA.email && h('li', {}, h('a', { href: `mailto:${LOJA.email}` }, LOJA.email)),
    LOJA.whatsapp && h('li', {}, h('a', { href: `https://wa.me/55${LOJA.whatsapp}`, target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp')),
    h('li', {}, h('a', { href: LOJA.redes.instagram, target: '_blank', rel: 'noopener noreferrer' }, 'Direct no Instagram')),
  ];
  const footer = h('footer', { class: 'site-footer' },
    h('div', { class: 'wrap' },
      h('div', { class: 'footer-grid' },
        h('div', {},
          h('h4', {}, LOJA.nome),
          h('p', { class: 'muted' }, 'Acessórios de bar, taças e jogos testados no canal. Se funciona, a gente mostra. Se é lixo, a gente também.'),
          h('div', { class: 'pay-badges', 'aria-label': 'Formas de pagamento' },
            h('span', {}, '🔒 Mercado Pago'), h('span', {}, 'Pix −10%'), h('span', {}, 'Cartão em até 12x'))),
        h('div', {}, h('h4', {}, 'Loja'),
          h('ul', {},
            h('li', {}, h('a', { href: 'index.html#produtos' }, 'Produtos')),
            h('li', {}, h('a', { href: 'index.html#ranking' }, 'Como funciona o ranking')),
            h('li', {}, h('a', { href: 'politicas.html#entrega' }, 'Entrega e prazos')),
            h('li', {}, h('a', { href: 'politicas.html#trocas' }, 'Trocas e devoluções')),
            h('li', {}, h('a', { href: 'politicas.html#privacidade' }, 'Privacidade')))),
        h('div', {}, h('h4', {}, 'Contato'), h('ul', {}, contato))),
      h('p', { class: 'legal' },
        `© ${new Date().getFullYear()} ${LOJA.nome}${LOJA.cnpj ? ` · CNPJ ${LOJA.cnpj}` : ''}${LOJA.endereco ? ` · ${LOJA.endereco}` : ''}. `,
        'Venda proibida para menores de 18 anos. Não comercializamos bebidas alcoólicas. Pagamentos processados pelo Mercado Pago; não armazenamos dados de cartão.')));
  document.body.append(footer);
  if (current) document.querySelector(`.nav a[href*="${current}"]`)?.setAttribute('aria-current', 'page');
}
