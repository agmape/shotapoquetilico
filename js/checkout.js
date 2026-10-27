import { PIX_DESCONTO, PRAZO_ECONOMICA, PRAZO_EXPRESSA } from './config.js';
import { brl, cart, h, loadCatalog, mountChrome, productVisual } from './shared.js';

mountChrome();
const root = document.getElementById('root');

const state = {
  entrega: sessionStorage.getItem('sa_entrega') === 'expressa' ? 'expressa' : 'economica',
  pagamento: 'pix',
  maior: false,
  enviando: false,
};
let catalog = [];

const onlyDigits = (s) => s.replace(/\D/g, '');
const maskCep = (s) => { const d = onlyDigits(s).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
const maskTel = (s) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  return d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
};

function linhas() {
  return cart.get()
    .map((i) => ({ ...i, p: catalog.find((x) => x.slug === i.slug) }))
    .filter((i) => i.p);
}

function totais() {
  const campo = state.entrega === 'economica' ? 'preco' : 'precoExpresso';
  const subtotal = linhas().reduce((s, i) => s + i.p[campo] * i.qtd, 0);
  const desc = state.pagamento === 'pix' ? subtotal * PIX_DESCONTO : 0;
  return { campo, subtotal, desc, total: subtotal - desc };
}

function field(id, label, attrs = {}) {
  return h('div', { class: 'field' },
    h('label', { for: id }, label),
    h('input', { id, name: id, required: attrs.required !== false, ...attrs }));
}

function render(erro) {
  const itens = linhas();
  if (!itens.length) {
    root.replaceChildren(h('div', { class: 'empty' },
      h('div', { class: 'big' }, '🛒'), h('h2', {}, 'Seu carrinho está vazio'),
      h('p', { class: 'muted' }, 'Bora escolher o próximo caos?'),
      h('a', { class: 'btn', href: 'index.html#produtos' }, 'Ver produtos')));
    return;
  }
  const t = totais();

  const resumo = h('aside', { class: 'panel', 'aria-label': 'Resumo do pedido' },
    h('h3', {}, 'Seu pedido'),
    itens.map(({ p, qtd }) => h('div', { class: 'line' },
      h('div', { class: 'mini' }, productVisual(p)),
      h('div', { class: 'info' }, h('b', {}, p.nome),
        h('div', { class: 'qty' },
          h('button', { type: 'button', 'aria-label': `Diminuir ${p.nome}`, onclick: () => { cart.set(p.slug, qtd - 1); render(); } }, '−'),
          h('output', {}, qtd),
          h('button', { type: 'button', 'aria-label': `Aumentar ${p.nome}`, onclick: () => { cart.set(p.slug, qtd + 1); render(); } }, '+')),
        ' ', h('button', { type: 'button', class: 'link-btn', onclick: () => { cart.set(p.slug, 0); render(); } }, 'remover')),
      h('b', {}, brl(p[t.campo] * qtd)))),
    h('div', { class: 'totals' },
      h('div', {}, h('span', {}, 'Subtotal'), h('span', {}, brl(t.subtotal))),
      h('div', {}, h('span', {}, 'Frete'), h('span', { class: 'lime' }, 'Grátis')),
      t.desc > 0 && h('div', { class: 'disc' }, h('span', {}, 'Desconto Pix (−10%)'), h('span', {}, `− ${brl(t.desc)}`)),
      h('div', { class: 'grand' }, h('span', {}, 'Total'), h('span', {}, brl(t.total)))),
    h('p', { class: 'muted' }, '🔒 Você finaliza o pagamento no ambiente seguro do Mercado Pago.'));

  const radio = (name, value, titulo, sub, preco, checked, onchange) =>
    h('label', { class: 'opt' },
      h('input', { type: 'radio', name, value, checked, onchange }),
      h('span', { class: 't' }, titulo, h('small', {}, sub)),
      preco && h('span', { class: 'p' }, preco));

  const form = h('form', { id: 'form', novalidate: false, autocomplete: 'on', onsubmit: enviar },
    erro && h('div', { class: 'notice', role: 'alert' }, erro),
    h('div', { class: 'panel' },
      h('h3', {}, '1 · Entrega (frete grátis)'),
      radio('entrega', 'economica', 'Econômica', PRAZO_ECONOMICA, null, state.entrega === 'economica', () => { state.entrega = 'economica'; render(); }),
      radio('entrega', 'expressa', 'Expressa', PRAZO_EXPRESSA, null, state.entrega === 'expressa', () => { state.entrega = 'expressa'; render(); })),
    h('div', { class: 'panel' },
      h('h3', {}, '2 · Pagamento'),
      radio('pagamento', 'pix', 'Pix · 10% de desconto', 'Aprovação na hora', null, state.pagamento === 'pix', () => { state.pagamento = 'pix'; render(); }),
      radio('pagamento', 'cartao', 'Cartão de crédito ou débito', 'Em até 12x pelo Mercado Pago', null, state.pagamento === 'cartao', () => { state.pagamento = 'cartao'; render(); })),
    h('div', { class: 'panel' },
      h('h3', {}, '3 · Seus dados'),
      field('nome', 'Nome completo', { autocomplete: 'name', maxlength: 100 }),
      h('div', { class: 'row' },
        field('email', 'E-mail', { type: 'email', autocomplete: 'email', maxlength: 120 }),
        field('telefone', 'Telefone / WhatsApp', { type: 'tel', autocomplete: 'tel', inputmode: 'numeric', placeholder: '(11) 91234-5678', oninput: (e) => { e.target.value = maskTel(e.target.value); } })),
      h('label', { class: 'opt' },
        h('input', { type: 'checkbox', id: 'maior', required: true, checked: state.maior, onchange: (e) => { state.maior = e.target.checked; } }),
        h('span', { class: 't' }, 'Declaro ter 18 anos ou mais', h('small', {}, 'Venda proibida para menores. Não vendemos bebida alcoólica.')))),
    h('div', { class: 'panel' },
      h('h3', {}, '4 · Endereço de entrega'),
      h('div', { class: 'row' },
        field('cep', 'CEP', { autocomplete: 'postal-code', inputmode: 'numeric', placeholder: '00000-000', oninput: (e) => { e.target.value = maskCep(e.target.value); if (onlyDigits(e.target.value).length === 8) buscaCep(e.target.value); } }),
        field('uf', 'UF', { maxlength: 2, autocomplete: 'address-level1' })),
      field('rua', 'Rua', { autocomplete: 'address-line1', maxlength: 120 }),
      h('div', { class: 'row' },
        field('numero', 'Número', { maxlength: 10 }),
        field('complemento', 'Complemento', { required: false, maxlength: 60 })),
      h('div', { class: 'row' },
        field('bairro', 'Bairro', { maxlength: 80 }),
        field('cidade', 'Cidade', { autocomplete: 'address-level2', maxlength: 80 }))),
    h('button', { class: 'btn pink block', id: 'pagar', type: 'submit', disabled: state.enviando }, state.enviando ? 'Abrindo o Mercado Pago…' : `Pagar ${brl(t.total)}`));

  const memo = lerForm();
  root.replaceChildren(h('h1', { class: 'sec-head' }, 'Finalizar compra'), h('div', { class: 'checkout' }, form, resumo));
  restaurarForm(memo);
}

/* mantém o que a pessoa já digitou ao re-renderizar (troca de entrega/pagamento) */
function lerForm() {
  const f = document.getElementById('form');
  if (!f) return {};
  return Object.fromEntries([...f.querySelectorAll('input[type=text],input[type=email],input[type=tel],input:not([type])')].map((i) => [i.id, i.value]));
}
function restaurarForm(memo) {
  for (const [id, v] of Object.entries(memo)) { const el = document.getElementById(id); if (el && v) el.value = v; }
}

async function buscaCep(valor) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${onlyDigits(valor)}/json/`);
    const d = await r.json();
    if (d.erro) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) el.value = v; };
    set('rua', d.logradouro); set('bairro', d.bairro); set('cidade', d.localidade); set('uf', d.uf);
    document.getElementById('numero')?.focus();
  } catch { /* preenche à mão */ }
}

async function enviar(e) {
  e.preventDefault();
  if (state.enviando) return;
  const v = (id) => document.getElementById(id).value.trim();
  const body = {
    itens: cart.get(),
    entrega: state.entrega,
    pagamento: state.pagamento,
    cliente: { nome: v('nome'), email: v('email'), telefone: v('telefone') },
    endereco: { cep: v('cep'), rua: v('rua'), numero: v('numero'), complemento: v('complemento'), bairro: v('bairro'), cidade: v('cidade'), uf: v('uf') },
  };
  state.enviando = true;
  document.getElementById('pagar').disabled = true;
  document.getElementById('pagar').textContent = 'Abrindo o Mercado Pago…';
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) throw new Error(d.erro || 'Não foi possível iniciar o pagamento.');
    const u = new URL(d.url);
    if (u.protocol !== 'https:' || !/(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(u.hostname)) throw new Error('Resposta de pagamento inesperada.');
    location.assign(u.href);
  } catch (err) {
    state.enviando = false;
    render(err.message);
  }
}

loadCatalog().then((c) => {
  catalog = c;
  const erro = new URLSearchParams(location.search).get('erro') === 'pagamento' ? 'O pagamento não foi concluído. Você pode tentar de novo.' : '';
  render(erro);
}).catch(() => root.replaceChildren(h('div', { class: 'notice' }, 'Erro ao carregar o carrinho. Recarregue a página.')));
