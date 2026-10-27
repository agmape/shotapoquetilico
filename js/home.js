import { h, loadCatalog, mountChrome, productCard, socialLinks } from './shared.js';

mountChrome();
document.getElementById('socials').append(...socialLinks());

const palavras = ['7 dias', 'Dissolveu', 'Virou shot', 'Sem álcool', 'Pix −10%', 'Frete grátis', 'Vídeo novo toda semana', 'Testado e avaliado'];
document.getElementById('marquee').append(...[...palavras, ...palavras].map((p) => h('span', {}, `✦ ${p}`)));

const grid = document.getElementById('grid');
loadCatalog()
  .then((produtos) => {
    grid.replaceChildren(...(produtos.length ? produtos.map(productCard) : [h('p', { class: 'muted' }, 'Novos produtos chegando em breve.')]));
  })
  .catch(() => grid.replaceChildren(h('p', { class: 'notice' }, 'Não conseguimos carregar os produtos agora. Recarregue a página.')));
