'use strict';

/* Suba a versão ao publicar mudanças no app. */
const VERSAO = 'familia-v7';
const CACHE_OCR = 'familia-ocr-v1';

const ARQUIVOS = [
  './',
  'index.html',
  'style.css',
  'app.js',
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
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO && k !== CACHE_OCR).map((k) => caches.delete(k))))
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(url.pathname.includes('/vendor/') ? primeiroCache(req) : primeiroRede(req));
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
