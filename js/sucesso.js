import { LOJA } from './config.js';
import { cart, h, mountChrome, socialLinks } from './shared.js';

mountChrome();
const q = new URLSearchParams(location.search);
const pedido = (q.get('pedido') || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 30);
const pendente = q.get('status') === 'pendente';

// Só limpa o carrinho depois que o Mercado Pago devolve o cliente para cá.
cart.clear();

document.getElementById('root').append(h('div', { class: 'empty' },
  h('div', { class: 'big' }, pendente ? '⏳' : '🎉'),
  h('h1', {}, pendente ? 'Pagamento em análise' : 'Pedido recebido!'),
  pedido && h('p', {}, 'Número do pedido: ', h('b', { class: 'lime' }, pedido)),
  h('p', { class: 'muted' }, pendente
    ? 'Assim que o Mercado Pago confirmar o pagamento, seu pedido entra em preparação. Pix costuma confirmar em segundos.'
    : 'Pagamento confirmado pelo Mercado Pago. Vamos preparar seu pedido e te avisar por e-mail/WhatsApp com o acompanhamento.'),
  h('div', { class: 'hero-cta center' },
    h('a', { class: 'btn', href: 'index.html#produtos' }, 'Continuar comprando')),
  h('p', { class: 'muted mt' }, `Dúvidas? Fale com a gente${LOJA.email ? ` em ${LOJA.email}` : ' pelo Instagram'}.`),
  h('div', { class: 'socials center' }, socialLinks())));
