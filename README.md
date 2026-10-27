# Shot Apoquetílico · Loja

Loja do canal: site estático + 2 funções de servidor (pagamento e aviso de venda) integradas ao **Mercado Pago** (Pix e cartão). Pix tem **10% de desconto** automático. Frete grátis, com entrega **Econômica** (~15 dias) ou **Expressa** (preço maior).

## Como lançar um produto novo (toda semana)

1. Abra `data/products.json` aqui no GitHub (ícone de lápis ✏️).
2. Copie um bloco de produto, cole logo abaixo e troque os campos:
   - `slug`: nome sem acento e com hífen (vira o endereço da página)
   - `preco`: preço da entrega **econômica** · `precoExpresso`: preço da **expressa** (já inclui o frete)
   - `fotos`: links de imagem (pode deixar `[]` para usar o emoji)
   - `nota` (0 a 10) e `veredito`: `aprovadao`, `vale`, `meh`, `lixo` ou `em-teste`
   - `videos`: links do Instagram/YouTube/TikTok (vazio some o botão)
3. Salve (Commit). Em ~1 minuto o site atualiza sozinho.

Dica: lance o produto como `em-teste` (nota `null`) antes do vídeo e depois troque pelo veredito.

## Publicar (Vercel, grátis)

1. Entre em vercel.com com o GitHub e importe este repositório (sem build, sem configuração).
2. Em **Settings → Environment Variables** adicione:

| Variável | Para quê |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token **de produção** do Mercado Pago (Seu negócio → Configurações → Credenciais) |
| `SITE_URL` | Endereço final do site, sem barra no fim. Ex.: `https://shotapoquetilico.com.br` |
| `MP_WEBHOOK_SECRET` | Chave secreta do webhook (veja abaixo) |
| `RESEND_API_KEY` *(opcional)* | Para receber e-mail a cada venda aprovada (resend.com) |
| `NOTIFY_EMAIL` *(opcional)* | E-mail que recebe os avisos de venda |
| `NOTIFY_FROM` *(opcional)* | Remetente verificado no Resend |

3. No Mercado Pago (Seu negócio → Configurações → Webhooks/Notificações) cadastre `https://SEU-SITE/api/webhook`, evento **Pagamentos**, e copie a **chave secreta** para `MP_WEBHOOK_SECRET`.
4. Faça uma compra de teste com credenciais de teste antes de divulgar. Depois troque para as de produção.
5. Preencha `js/config.js` (e-mail, WhatsApp, CNPJ, links do YouTube/TikTok/Facebook). Campos vazios somem do site.

## Fluxo de um pedido

Cliente escolhe produto e entrega → preenche dados e endereço → o servidor recalcula tudo com os preços do `products.json` → cria o pagamento no Mercado Pago → cliente paga no ambiente do Mercado Pago → dinheiro cai na sua conta → você recebe o aviso (e-mail e/ou painel do Mercado Pago, onde o endereço fica nos detalhes do pagamento) → **você compra o produto** no AliExpress/Mercado Livre/Shopee e envia para o endereço do cliente.

## Segurança já incluída

- Cartão e Pix nunca passam pelo site; tudo no Mercado Pago.
- Token secreto só no servidor (variável de ambiente), nunca no navegador.
- Preço, desconto Pix e frete são recalculados no servidor; o navegador não consegue alterar valores.
- Avisos de pagamento (webhook) com assinatura HMAC validada e confirmação direta na API do Mercado Pago.
- HTTPS forçado (HSTS), Content-Security-Policy restrita, sem scripts de terceiros, proteção contra clickjacking, limite de tentativas no checkout.
- Não existe painel de admin público: produtos mudam só por quem tem acesso ao repositório.
- Nunca coloque o Access Token no código nem no chat.

## Desenvolvimento

```
npm test      # 10 testes (preços, Pix, validações, webhook)
npm run dev   # http://localhost:3000
```
