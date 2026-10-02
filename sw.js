'use strict';

/* Suba a versão ao publicar mudanças no app. */
const VERSAO = 'familia-v16';
const CACHE_OCR = 'familia-ocr-v1';

const ARQUIVOS = [
  './',
  'index.html',
  'style.css',
  'js/nucleo.js',
  'js/agenda.js',
  'js/financeiro.js',
  'js/cozinha.js',
  'js/ocr.js',
  'js/sincronizacao.js',
  'js/avisos.js',
  'js/configuracoes.js',
  'js/efeitos.js',
  'js/bloqueio.js',
  'js/app.js',
  'manifest.json',
  'fonts/figtree.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
];

/* 'reload' ignora o cache HTTP da hospedagem e baixa a versão nova de verdade. */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO && k !== CACHE_OCR && k !== CACHE_COMPARTILHADO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Leitor de notas (arquivos grandes): baixa uma vez e guarda. */
async function primeiroCache(req) {
  const cache = await caches.open(CACHE_OCR);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

/* App: busca a versão mais nova na internet; sem conexão, usa a cópia guardada. */
async function primeiroRede(req) {
  const cache = await caches.open(VERSAO);
  const chave = req.mode === 'navigate' ? 'index.html' : req;
  try {
    const resp = await fetch(req, { cache: 'no-cache' });
    if (resp.ok && resp.type === 'basic') cache.put(chave, resp.clone());
    return resp;
  } catch {
    return (await cache.match(chave, { ignoreSearch: true })) || Response.error();
  }
}

/* Foto compartilhada da galeria ("Compartilhar → Família Power"): guarda e abre a leitura da nota. */
const CACHE_COMPARTILHADO = 'familia-compartilhado';
async function receberCompartilhamento(req) {
  try {
    const dados = await req.formData();
    const arquivo = dados.get('imagem');
    if (arquivo && arquivo.size) {
      const cache = await caches.open(CACHE_COMPARTILHADO);
      await cache.put('imagem', new Response(arquivo, { headers: { 'Content-Type': arquivo.type || 'image/jpeg' } }));
      return Response.redirect('./index.html?acao=nota-compartilhada', 303);
    }
  } catch { /* segue para o app */ }
  return Response.redirect('./index.html', 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/compartilhar')) {
    e.respondWith(receberCompartilhamento(req));
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(url.pathname.includes('/vendor/') ? primeiroCache(req) : primeiroRede(req));
});

/* Aviso vindo do GitHub (app fechado) */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Família Power', {
    body: d.corpo || '', tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', vibrate: [120, 60, 120],
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const janela = janelas.find((j) => 'focus' in j);
      return janela ? janela.focus() : self.clients.openWindow('./');
    })
  );
});
