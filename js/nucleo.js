'use strict';

/* Família Power · Núcleo: utilidades, datas, dinheiro, modelos, armazenamento, tema e interface base */


/* ---------- Utilitários ---------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const texto = (v, max = 300) => String(v ?? '').trim().slice(0, max);

const ICONE = {
  sino: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  whats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19Z"/><path d="M9 9.5c.3 2.4 2.1 4.2 4.5 4.6l1.2-1.1 1.8.8-.4 1.6c-3.7.3-7-2.9-6.8-6.8l1.6-.4.8 1.8Z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/></svg>',
  esq: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  dir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  imagem: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20 16-5-5-8 8"/></svg>',
};

/* Base64 com acentos (UTF-8), usado na troca de dados com o GitHub. */
function b64enc(txt) {
  const bytes = new TextEncoder().encode(txt);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/* Hash curto de texto (para saber se um item da lista mudou). */
function hashTexto(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

/* Atualiza uma lista reaproveitando os elementos que não mudaram (sem redesenhar tudo). */
function reconciliar(container, itens, chave, html) {
  const atuais = new Map([...container.children].map((el) => [el.dataset.chave, el]));
  let anterior = null;
  for (const item of itens) {
    const k = String(chave(item)), marcacao = html(item), h = hashTexto(marcacao);
    let el = atuais.get(k);
    atuais.delete(k);
    if (!el || el.dataset.hash !== h) {
      const t = document.createElement('template');
      t.innerHTML = marcacao.trim();
      const novo = t.content.firstElementChild;
      novo.dataset.chave = k;
      novo.dataset.hash = h;
      if (el) el.replaceWith(novo);
      el = novo;
    }
    const lugar = anterior ? anterior.nextElementSibling : container.firstElementChild;
    if (lugar !== el) container.insertBefore(el, lugar);
    anterior = el;
  }
  atuais.forEach((el) => el.remove());
}

function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- Datas (sempre 'AAAA-MM-DD' no horário local) ---------- */
const Datas = {
  MESES: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  SEMANA: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  pad: (n) => String(n).padStart(2, '0'),
  ymd(d) { return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`; },
  parse(s) { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); },
  hoje() { return this.ymd(new Date()); },
  agoraHM() { const d = new Date(); return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`; },
  somar(s, dias) { const d = this.parse(s); d.setDate(d.getDate() + dias); return this.ymd(d); },
  somarMeses(s, meses) { const d = this.parse(s); return this.ymd(new Date(d.getFullYear(), d.getMonth() + meses, 1)); },
  diff(a, b) {
    const pa = this.parse(a), pb = this.parse(b);
    return Math.round((Date.UTC(pb.getFullYear(), pb.getMonth(), pb.getDate()) - Date.UTC(pa.getFullYear(), pa.getMonth(), pa.getDate())) / 864e5);
  },
  diasNoMes: (ano, mes0) => new Date(ano, mes0 + 1, 0).getDate(),
  valida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const [a, m, d] = s.split('-').map(Number);
    return m >= 1 && m <= 12 && d >= 1 && d <= this.diasNoMes(a, m - 1);
  },
  br(s) { const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; },
  inicioSemana(s) { return this.somar(s, -this.parse(s).getDay()); },
  mesAno(s) { const d = this.parse(s); return `${this.MESES[d.getMonth()]} ${d.getFullYear()}`; },
  relativo(s) {
    const n = this.diff(this.hoje(), s);
    return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : null;
  },
  rotuloDia(s) {
    const d = this.parse(s);
    const ano = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : '';
    const pref = this.relativo(s) || this.SEMANA[d.getDay()];
    return `${pref} · ${d.getDate()} de ${this.MESES[d.getMonth()]}${ano}`;
  },
  curto(s) {
    const rel = this.relativo(s);
    if (rel) return rel[0].toUpperCase() + rel.slice(1);
    const d = this.parse(s);
    const sem = this.SEMANA[d.getDay()].slice(0, 3);
    return `${sem[0].toUpperCase() + sem.slice(1)}, ${this.pad(d.getDate())}/${this.pad(d.getMonth() + 1)}`;
  },
  minutos: (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; },
};

/* ---------- Dinheiro (valores guardados em centavos) ---------- */
const Dinheiro = {
  fmt: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  br(c) { return this.fmt.format(c / 100); },
  campo(c) { return c == null ? '' : (c / 100).toFixed(2).replace('.', ','); },
  parse(entrada) {
    let s = String(entrada ?? '').replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return null;
    const v = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (v > p) s = s.replace(/\./g, '').replace(',', '.');
    else if (v > -1) s = s.replace(/,/g, '');
    else if (p > -1) {
      const partes = s.split('.');
      if (!(partes.length === 2 && partes[1].length <= 2)) s = s.replace(/\./g, '');
    }
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) : null;
  },
};

/* ---------- Modelo: validação e normalização dos registros ---------- */
const Modelo = {
  RECORRENCIAS: { nao: 'Não repete', diaria: 'Todo dia', semanal: 'Toda semana', mensal: 'Todo mês', anual: 'Todo ano' },
  CATEGORIAS: ['Alimentação', 'Casa', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Renda', 'Outros'],
  hora: (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? v : ''),
  datas: (a) => (Array.isArray(a) ? [...new Set(a.filter((d) => Datas.valida(d)))] : []),

  evento(o) {
    if (!o || typeof o !== 'object' || !Datas.valida(o.data)) return null;
    const titulo = texto(o.titulo, 120);
    if (!titulo) return null;
    return {
      id: texto(o.id, 40) || uid(),
      titulo,
      data: o.data,
      hora: this.hora(o.hora),
      responsavel: texto(o.responsavel, 60),
      local: texto(o.local, 120),
      aviso: this.hora(o.aviso),
      obs: texto(o.obs, 1000),
      recorrencia: o.recorrencia in this.RECORRENCIAS ? o.recorrencia : 'nao',
      feitos: this.datas(o.feitos),
      excecoes: this.datas(o.excecoes),
      por: texto(o.por, 40),
      atualizado: this.carimbo(o.atualizado),
    };
  },

  lancamento(o) {
    if (!o || typeof o !== 'object' || !Datas.valida(o.data)) return null;
    const valor = Number(o.valor);
    if (!Number.isInteger(valor) || valor <= 0) return null;
    return {
      id: texto(o.id, 40) || uid(),
      data: o.data,
      hora: this.hora(o.hora),
      descricao: texto(o.descricao, 120) || 'Sem descrição',
      categoria: texto(o.categoria, 40),
      pessoa: texto(o.pessoa, 60),
      tipo: o.tipo === 'receita' ? 'receita' : 'despesa',
      valor,
      pago: o.pago !== false,
      fixa: texto(o.fixa, 40),
      por: texto(o.por, 40),
      atualizado: this.carimbo(o.atualizado),
    };
  },

  fixa(o) {
    if (!o || typeof o !== 'object') return null;
    const valor = Number(o.valor), dia = Number(o.dia);
    if (!Number.isInteger(valor) || valor <= 0 || !Number.isInteger(dia) || dia < 1 || dia > 31) return null;
    if (!/^\d{4}-\d{2}$/.test(o.desde || '')) return null;
    return {
      id: texto(o.id, 30) || uid(),
      descricao: texto(o.descricao, 120) || 'Conta fixa',
      categoria: texto(o.categoria, 40),
      pessoa: texto(o.pessoa, 60),
      tipo: o.tipo === 'receita' ? 'receita' : 'despesa',
      valor, dia, desde: o.desde,
      ativo: o.ativo !== false,
      por: texto(o.por, 40),
      atualizado: this.carimbo(o.atualizado),
    };
  },

  carimbo: (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0),

  compra(o) {
    if (!o || typeof o !== 'object') return null;
    const nome = texto(o.nome, 80);
    if (!nome) return null;
    return {
      id: texto(o.id, 40) || uid(),
      nome,
      qtd: texto(o.qtd, 30),
      setor: o.setor in Cozinha.SETORES ? o.setor : 'Outros',
      feito: o.feito === true,
      arquivado: o.arquivado === true,
      vezes: Number.isInteger(o.vezes) && o.vezes > 0 ? o.vezes : 0,
      preco: Number.isInteger(o.preco) && o.preco > 0 ? o.preco : null,
      por: texto(o.por, 40),
      atualizado: this.carimbo(o.atualizado),
    };
  },

  almoco(o) {
    if (!o || typeof o !== 'object' || !Datas.valida(o.data)) return null;
    const prato = texto(o.prato, 100);
    if (!prato) return null;
    const refeicao = o.refeicao === 'jantar' ? 'jantar' : 'almoco';
    return { id: (refeicao === 'jantar' ? 'jan-' : 'alm-') + o.data, data: o.data, refeicao, prato, por: texto(o.por, 40), atualizado: this.carimbo(o.atualizado) };
  },

  dispositivo(o) {
    if (!o || typeof o !== 'object' || !o.sub || typeof o.sub !== 'object') return null;
    const endpoint = String(o.sub.endpoint || '');
    const keys = o.sub.keys || {};
    if (!/^https:\/\//.test(endpoint) || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;
    return { id: texto(o.id, 40) || uid(), nome: texto(o.nome, 40), sub: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, atualizado: this.carimbo(o.atualizado) };
  },

  prato(o) {
    if (!o || typeof o !== 'object') return null;
    const nome = texto(o.nome, 100);
    if (!nome) return null;
    const ingredientes = (Array.isArray(o.ingredientes) ? o.ingredientes : []).map((i) => texto(i, 60)).filter(Boolean).slice(0, 30);
    const tags = ['carne', 'frango', 'peixe', 'porco', 'vegetariano', 'massa', 'outro'];
    const refeicoes = Array.isArray(o.refeicoes) ? o.refeicoes.filter((r) => r === 'almoco' || r === 'jantar') : [];
    return { id: texto(o.id, 40) || uid(), nome, tag: tags.includes(o.tag) ? o.tag : 'outro', ingredientes, refeicoes: refeicoes.length ? refeicoes : ['almoco', 'jantar'], por: texto(o.por, 40), atualizado: this.carimbo(o.atualizado) };
  },

  pacote(obj) {
    if (!obj || !Array.isArray(obj.eventos) || !Array.isArray(obj.lancamentos)) return null;
    const removidos = {};
    if (obj.removidos && typeof obj.removidos === 'object') {
      for (const [id, t] of Object.entries(obj.removidos)) if (this.carimbo(t)) removidos[texto(id, 40)] = this.carimbo(t);
    }
    return {
      eventos: obj.eventos.map((e) => this.evento(e)).filter(Boolean),
      lancamentos: obj.lancamentos.map((l) => this.lancamento(l)).filter(Boolean),
      compras: (Array.isArray(obj.compras) ? obj.compras : []).map((c) => this.compra(c)).filter(Boolean),
      cardapio: (Array.isArray(obj.cardapio) ? obj.cardapio : []).map((a) => this.almoco(a)).filter(Boolean),
      pratos: (Array.isArray(obj.pratos) ? obj.pratos : []).map((p) => this.prato(p)).filter(Boolean),
      fixas: (Array.isArray(obj.fixas) ? obj.fixas : []).map((f) => this.fixa(f)).filter(Boolean),
      dispositivos: (Array.isArray(obj.dispositivos) ? obj.dispositivos : []).map((d) => this.dispositivo(d)).filter(Boolean),
      removidos,
    };
  },
};

/* ---------- Quem usa este aparelho (não sincroniza) ---------- */
const Perfil = {
  CHAVE: 'familia.eu',
  get nome() { try { return localStorage.getItem(this.CHAVE) || ''; } catch { return ''; } },
  set nome(v) { try { localStorage.setItem(this.CHAVE, texto(v, 40)); } catch { /* ignora */ } },
  /* "por Laís" só quando foi outra pessoa, para não poluir a tela */
  rotulo(item) { return item && item.por && item.por !== this.nome ? `por ${item.por}` : ''; },
  detalhe(item) {
    if (!item || !item.atualizado || item.atualizado < 1000) return '';
    const d = new Date(item.atualizado);
    const quando = `${Datas.br(Datas.ymd(d))} às ${Datas.pad(d.getHours())}:${Datas.pad(d.getMinutes())}`;
    return item.por ? `Alterado por ${item.por} em ${quando}` : `Alterado em ${quando}`;
  },
};

const COLECOES = ['eventos', 'lancamentos', 'compras', 'cardapio', 'pratos', 'fixas', 'dispositivos'];

/* ---------- Armazenamento local ---------- */
const Store = {
  CHAVE: 'familia.dados.v1',
  dados: { eventos: [], lancamentos: [], compras: [], cardapio: [], pratos: [], fixas: [], dispositivos: [], removidos: {} },
  aplicandoRemoto: false,

  carregar() {
    try {
      const bruto = localStorage.getItem(this.CHAVE);
      if (bruto) {
        const pacote = Modelo.pacote(JSON.parse(bruto));
        if (!pacote) throw new Error('formato inesperado');
        this.dados = pacote;
      }
    } catch (e) {
      console.error('Falha ao ler dados', e);
      /* Nunca sobrescreve dados ilegíveis: guarda uma cópia antes. */
      try { localStorage.setItem(`${this.CHAVE}.recuperacao-${Date.now()}`, localStorage.getItem(this.CHAVE)); } catch { /* ignora */ }
      this.falhou = true;
    }
  },
  salvar() {
    try {
      localStorage.setItem(this.CHAVE, JSON.stringify(this.dados));
      if (!this.aplicandoRemoto) Sync.agendar();
      return true;
    } catch (e) {
      UI.toast('Não foi possível salvar. O armazenamento do aparelho está cheio.');
      return false;
    }
  },
  /* Marca quando um registro mudou: é o que decide a versão mais nova ao sincronizar. */
  tocar(item) { item.atualizado = Date.now(); if (Perfil.nome) item.por = Perfil.nome; },
  gravar(colecao, item) {
    this.tocar(item);
    const lista = this.dados[colecao];
    const i = lista.findIndex((x) => x.id === item.id);
    if (i > -1) lista[i] = item; else lista.push(item);
    return this.salvar();
  },
  remover(colecao, id) {
    this.dados[colecao] = this.dados[colecao].filter((x) => x.id !== id);
    this.dados.removidos[id] = Date.now();
    this.salvar();
  },
  aplicarRemoto(dados) {
    this.aplicandoRemoto = true;
    this.dados = dados;
    this.salvar();
    this.aplicandoRemoto = false;
  },
  evento(id) { return this.dados.eventos.find((e) => e.id === id); },
  lancamento(id) { return this.dados.lancamentos.find((l) => l.id === id); },
  pessoas() {
    const nomes = [...this.dados.eventos.map((e) => e.responsavel), ...this.dados.lancamentos.map((l) => l.pessoa)];
    return [...new Set(nomes.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },
  categorias() {
    const usadas = this.dados.lancamentos.map((l) => l.categoria).filter(Boolean);
    return [...new Set([...Modelo.CATEGORIAS, ...usadas])];
  },
};

/* ---------- Cor de cada pessoa (estável e sem repetir entre pessoas atuais) ---------- */
const Cores = {
  PALETA: ['#7C3AED', '#F97316', '#0284C7', '#DB2777', '#059669', '#D97706', '#4F46E5', '#DC2626'],
  PADRAO: '#7C3AED',
  mapa: {},
  recalcular() {
    const n = this.PALETA.length, usados = new Set();
    this.mapa = {};
    for (const p of Store.pessoas()) {
      let h = 0;
      for (const c of normalizar(p)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      let i = h % n;
      for (let k = 0; k < n && usados.has(i); k++) i = (i + 1) % n;
      usados.add(i);
      this.mapa[p] = this.PALETA[i];
    }
  },
  pessoa(nome) {
    if (!nome) return this.PADRAO;
    if (!(nome in this.mapa)) this.recalcular();
    return this.mapa[nome] || this.PADRAO;
  },
};

/* ---------- Temas de cor (tokens definidos no style.css) ---------- */
const Tema = {
  CHAVE: 'familia.tema',
  OPCOES: {
    power: { nome: 'Power', desc: 'Roxo e laranja · segue o celular', cores: ['#6D28D9', '#F97316', '#ECEAF4'], barra: null },
    eletrico: { nome: 'Elétrico', desc: 'Noite roxa e neon lima', cores: ['#1E1A3A', '#CCFF00', '#5B4BC4'], barra: '#1E1A3A' },
    equilibrio: { nome: 'Equilíbrio', desc: 'Claro, teal e menta', cores: ['#0D2C2A', '#0AE596', '#F3F7F5'], barra: '#F3F7F5' },
    cooperacao: { nome: 'Cooperação', desc: 'Azul-marinho e coral', cores: ['#0A1931', '#FF6B35', '#2F66B3'], barra: '#0A1931' },
  },
  atual() {
    try { const t = localStorage.getItem(this.CHAVE); return t in this.OPCOES ? t : 'power'; } catch { return 'power'; }
  },
  aplicar(id, salvar = true) {
    if (!(id in this.OPCOES)) id = 'power';
    const html = document.documentElement;
    if (id === 'power') html.removeAttribute('data-tema'); else html.dataset.tema = id;
    const barra = this.OPCOES[id].barra;
    $$('meta[name="theme-color"]').forEach((m) => { m.content = barra || m.dataset.padrao; });
    if (salvar) { try { localStorage.setItem(this.CHAVE, id); } catch { /* ignora */ } }
  },
};

/* ---------- Preferências de tela ---------- */
const Prefs = {
  CHAVE: 'familia.tela',
  ui: { aba: 'agenda', cozModo: 'lista', refeicao: 'almoco', modo: 'lista', status: 'todos', pessoa: '', busca: '', semanaRef: '', mesRef: '', diaSel: '', finMes: '' },
  carregar() {
    try { Object.assign(this.ui, JSON.parse(localStorage.getItem(this.CHAVE) || '{}')); } catch { /* ignora */ }
    const hoje = Datas.hoje();
    Object.assign(this.ui, { busca: '', semanaRef: hoje, diaSel: hoje, mesRef: hoje.slice(0, 8) + '01', finMes: hoje.slice(0, 7) });
    if (!['agenda', 'fin', 'coz'].includes(this.ui.aba)) this.ui.aba = 'agenda';
    if (!['lista', 'cardapio'].includes(this.ui.cozModo)) this.ui.cozModo = 'lista';
    if (!['almoco', 'jantar'].includes(this.ui.refeicao)) this.ui.refeicao = 'almoco';
    if (!['lista', 'semana', 'mes'].includes(this.ui.modo)) this.ui.modo = 'lista';
  },
  salvar() {
    const { aba, modo, status, pessoa, cozModo, refeicao } = this.ui;
    try { localStorage.setItem(this.CHAVE, JSON.stringify({ aba, modo, status, pessoa, cozModo, refeicao })); } catch { /* ignora */ }
  },
};
const ui = Prefs.ui;

/* ---------- Interface: toast, folhas e escolhas ---------- */
const UI = {
  pilha: [],
  esperas: [],
  _toastTimer: 0,

  toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('visivel');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('visivel'), 2600);
  },

  /* Abre uma folha inferior. O botão "voltar" do Android fecha a folha. */
  abrir({ titulo = '', corpo = '', aoFechar = null }) {
    const wrap = document.createElement('div');
    wrap.className = 'folha-wrap';
    wrap.innerHTML = `<div class="folha-fundo"></div>
      <section class="folha" role="dialog" aria-modal="true" ${titulo ? `aria-label="${esc(titulo)}"` : ''}>
        <div class="folha-pegador"></div>
        ${titulo ? `<h2>${esc(titulo)}</h2>` : ''}
        <div class="folha-corpo">${corpo}</div>
      </section>`;
    document.body.appendChild(wrap);
    document.body.classList.add('travado');
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('aberta')));
    $('.folha-fundo', wrap).addEventListener('click', () => this.fechar());
    this.pilha.push({ wrap, aoFechar });
    history.pushState({ folha: this.pilha.length }, '');
    return $('.folha', wrap);
  },

  /* Fecha n folhas via histórico; resolve quando a remoção terminar. */
  fechar(n = 1) {
    return new Promise((resolve) => {
      if (!this.pilha.length) return resolve();
      this.esperas.push(resolve);
      history.go(-Math.min(n, this.pilha.length));
    });
  },
  fecharTodas() { return this.fechar(this.pilha.length); },

  sincronizar() {
    const alvo = (history.state && history.state.folha) || 0;
    while (this.pilha.length > alvo) {
      const { wrap, aoFechar } = this.pilha.pop();
      wrap.classList.remove('aberta');
      setTimeout(() => wrap.remove(), 280);
      if (aoFechar) aoFechar();
    }
    if (!this.pilha.length) document.body.classList.remove('travado');
    const esperas = this.esperas;
    this.esperas = [];
    esperas.forEach((f) => f());
  },

  /* Pergunta com opções. Retorna o id escolhido ou null. */
  escolher({ titulo, mensagem = '', opcoes }) {
    return new Promise((resolve) => {
      let resposta = null;
      const botoes = opcoes.map((o) => `<button type="button" class="btn bloco ${o.estilo || ''}" data-id="${o.id}">${esc(o.rotulo)}</button>`).join('');
      const folha = this.abrir({
        titulo,
        corpo: `${mensagem ? `<p>${mensagem}</p>` : ''}<div class="lista-opcoes">${botoes}<button type="button" class="btn bloco" data-id="">Cancelar</button></div>`,
        aoFechar: () => resolve(resposta),
      });
      folha.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]');
        if (!b) return;
        resposta = b.dataset.id || null;
        this.fechar();
      });
    });
  },

  atualizarListas() {
    const opt = (v) => `<option value="${esc(v)}"></option>`;
    $('#dl-pessoas').innerHTML = Store.pessoas().map(opt).join('');
    $('#dl-categorias').innerHTML = Store.categorias().map(opt).join('');
  },

  campo(rotulo, conteudo, extra = '') {
    return `<label class="campo ${extra}"><span>${rotulo}</span>${conteudo}</label>`;
  },
};
