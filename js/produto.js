import { LOJA, PIX_DESCONTO, PRAZO_ECONOMICA, PRAZO_EXPRESSA } from './config.js';
import { VEREDITOS, brl, cart, h, loadCatalog, mountChrome, productVisual, toast } from './shared.js';

mountChrome();
const root = document.getElementById('root');
const slug = new URLSearchParams(location.search).get('p');

function notFound() {
  root.replaceChildren(h('div', { class: 'empty' },
    h('div', { class: 'big' }, '🫥'), h('h2', {}, 'Produto não encontrado'),
    h('a', { class: 'btn', href: 'index.html#produtos' }, 'Voltar à loja')));
}

function render(p) {
  document.title = `${p.nome} · Shot Apoquetílico`;
  const v = VEREDITOS[p.veredito] || VEREDITOS['em-teste'];
  let entrega = 'economica';
  let qtd = 1;

  const priceEl = h('span', { class: 'price' });
  const pixEl = h('span', { class: 'price-pix' });
  const qtyOut = h('output', {}, '1');
  const refresh = () => {
    const base = entrega === 'economica' ? p.preco : p.precoExpresso;
    priceEl.textContent = brl(base * qtd);
    pixEl.textContent = `${brl(base * qtd * (1 - PIX_DESCONTO))} no Pix (−10%)`;
    qtyOut.textContent = qtd;
  };

  const bigImg = h('div', { class: 'thumb' }, productVisual(p));
  const thumbs = (p.fotos || []).length > 1 && h('div', { class: 'gallery-thumbs' },
    p.fotos.map((src, i) => h('button', {
      type: 'button', 'aria-label': `Foto ${i + 1}`, 'aria-pressed': i === 0 ? 'true' : 'false',
      onclick: (e) => {
        bigImg.replaceChildren(h('img', { src, alt: p.nome, referrerpolicy: 'no-referrer' }));
        thumbs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        e.currentTarget.setAttribute('aria-pressed', 'true');
      },
    }, h('img', { src, alt: '', referrerpolicy: 'no-referrer' }))));

  const opt = (value, titulo, prazo, preco, checked) =>
    h('label', { class: 'opt' },
      h('input', { type: 'radio', name: 'entrega', value, checked, onchange: () => { entrega = value; refresh(); } }),
      h('span', { class: 't' }, titulo, h('small', {}, `Frete grátis · ${prazo}`)),
      h('span', { class: 'p' }, brl(preco)));

  const videos = [['instagram', 'Instagram', '📸'], ['youtube', 'YouTube', '▶️'], ['tiktok', 'TikTok', '🎵']]
    .filter(([k]) => p.videos && p.videos[k]);

  root.replaceChildren(h('div', { class: 'product' },
    h('div', {}, bigImg, thumbs),
    h('div', {},
      h('span', { class: 'muted' }, p.categoria),
      h('h1', {}, p.nome),
      h('p', {}, p.descricao),
      h('div', { class: 'panel' },
        h('h3', {}, 'Escolha a entrega'),
        opt('economica', 'Econômica', PRAZO_ECONOMICA, p.preco, true),
        opt('expressa', 'Expressa', PRAZO_EXPRESSA, p.precoExpresso, false),
        h('div', { class: 'price-row', style: null }, priceEl, pixEl),
        h('div', { style: null, class: 'hero-cta' },
          h('div', { class: 'qty' },
            h('button', { type: 'button', 'aria-label': 'Diminuir', onclick: () => { qtd = Math.max(1, qtd - 1); refresh(); } }, '−'),
            qtyOut,
            h('button', { type: 'button', 'aria-label': 'Aumentar', onclick: () => { qtd = Math.min(10, qtd + 1); refresh(); } }, '+')),
          h('button', { class: 'btn', type: 'button', onclick: () => {
            sessionStorage.setItem('sa_entrega', entrega);
            cart.add(p.slug, qtd);
            toast('Adicionado ao carrinho! 🛒');
          } }, 'Adicionar ao carrinho'),
          h('a', { class: 'btn pink', href: 'checkout.html', onclick: () => { sessionStorage.setItem('sa_entrega', entrega); cart.add(p.slug, qtd); } }, 'Comprar agora'))),
      h('div', { class: 'panel' },
        h('h3', {}, 'Veredito do canal'),
        h('div', { class: 'big-score' },
          p.nota != null && h('div', { class: 'n' }, `${String(p.nota).replace('.', ',')}`, h('small', { class: 'muted', style: null }, '/10')),
          h('div', {}, h('b', {}, `${v.icon} ${v.label}`), h('p', { class: 'muted' }, p.resumoVeredito || ''))),
        (p.pros?.length || p.contras?.length) && h('div', { class: 'pros-cons' },
          h('div', {}, h('b', {}, 'Pontos bons'), h('ul', {}, (p.pros || []).map((x) => h('li', {}, x)))),
          h('div', { class: 'cons' }, h('b', {}, 'Pontos ruins'), h('ul', {}, (p.contras || []).map((x) => h('li', {}, x))))),
        videos.length > 0 && h('div', { class: 'video-links', style: null },
          videos.map(([k, nome, ico]) => h('a', { class: 'btn ghost', href: p.videos[k], target: '_blank', rel: 'noopener noreferrer' }, `${ico} Ver no ${nome}`)))),
      h('p', { class: 'muted' }, '🔞 Venda para maiores de 18 anos. Produto não contém bebida alcoólica.'))));
  refresh();
}

loadCatalog().then((list) => {
  const p = list.find((x) => x.slug === slug);
  p ? render(p) : notFound();
}).catch(notFound);
