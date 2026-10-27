'use strict';
// Servidor local para testar o site: arquivos estáticos + /api/*, com os mesmos headers do vercel.json.
// Uso: npm run dev  (porta 3000). Para testar o pagamento de verdade, defina MP_ACCESS_TOKEN e SITE_URL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const SEC = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers[0].headers.map((h) => [h.key, h.value]));

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  for (const [k, v] of Object.entries(SEC)) if (k !== 'Strict-Transport-Security') res.setHeader(k, v);

  if (url.pathname.startsWith('/api/')) {
    const name = path.basename(url.pathname);
    const file = path.join(ROOT, 'api', `${name}.js`);
    if (!/^[a-z]+$/.test(name) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    let raw = '';
    for await (const c of req) raw += c;
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return require(file)(req, res);
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  const blocked = /^(api|lib|test|node_modules|\.git)(\/|$)/.test(path.relative(ROOT, file)) || path.basename(file).startsWith('.');
  if (!file.startsWith(ROOT + path.sep) || blocked || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
