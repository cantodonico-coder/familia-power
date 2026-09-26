'use strict';

/* =========================================================
   Família Power — Gestão de Compromissos e Despesas
   Módulos: Util · Datas · Dinheiro · Modelo · Store · Prefs
            UI · Agenda · AgendaUI · WhatsApp · Calendario
            Lembretes · Financeiro · FinUI · OCR · Nota
            Leitura · Backup · Config · Nav · App
   ========================================================= */

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
      atualizado: this.carimbo(o.atualizado),
    };
  },

  carimbo: (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0),

  pacote(obj) {
    if (!obj || !Array.isArray(obj.eventos) || !Array.isArray(obj.lancamentos)) return null;
    const removidos = {};
    if (obj.removidos && typeof obj.removidos === 'object') {
      for (const [id, t] of Object.entries(obj.removidos)) if (this.carimbo(t)) removidos[texto(id, 40)] = this.carimbo(t);
    }
    return {
      eventos: obj.eventos.map((e) => this.evento(e)).filter(Boolean),
      lancamentos: obj.lancamentos.map((l) => this.lancamento(l)).filter(Boolean),
      removidos,
    };
  },
};

/* ---------- Armazenamento local ---------- */
const Store = {
  CHAVE: 'familia.dados.v1',
  dados: { eventos: [], lancamentos: [], removidos: {} },
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
  tocar(item) { item.atualizado = Date.now(); },
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
  ui: { aba: 'agenda', modo: 'lista', status: 'todos', pessoa: '', busca: '', semanaRef: '', mesRef: '', diaSel: '', finMes: '' },
  carregar() {
    try { Object.assign(this.ui, JSON.parse(localStorage.getItem(this.CHAVE) || '{}')); } catch { /* ignora */ }
    const hoje = Datas.hoje();
    Object.assign(this.ui, { busca: '', semanaRef: hoje, diaSel: hoje, mesRef: hoje.slice(0, 8) + '01', finMes: hoje.slice(0, 7) });
    if (!['agenda', 'fin'].includes(this.ui.aba)) this.ui.aba = 'agenda';
    if (!['lista', 'semana', 'mes'].includes(this.ui.modo)) this.ui.modo = 'lista';
  },
  salvar() {
    const { aba, modo, status, pessoa } = this.ui;
    try { localStorage.setItem(this.CHAVE, JSON.stringify({ aba, modo, status, pessoa })); } catch { /* ignora */ }
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

/* =========================================================
   AGENDA
   ========================================================= */
const Agenda = {
  /* Datas em que o evento ocorre dentro de [de, ate]. */
  ocorrencias(ev, de, ate) {
    const saida = [];
    const add = (d) => { if (d >= de && d <= ate && !ev.excecoes.includes(d)) saida.push(d); };
    if (ev.recorrencia === 'nao') { add(ev.data); return saida; }
    if (ev.data > ate) return saida;

    if (ev.recorrencia === 'diaria' || ev.recorrencia === 'semanal') {
      const passo = ev.recorrencia === 'diaria' ? 1 : 7;
      let n = Math.max(0, Math.floor(Datas.diff(ev.data, de) / passo));
      for (let d = Datas.somar(ev.data, n * passo); d <= ate; n++, d = Datas.somar(ev.data, n * passo)) add(d);
      return saida;
    }

    const base = Datas.parse(ev.data), ini = Datas.parse(de);
    const dia = base.getDate();
    const mensal = ev.recorrencia === 'mensal';
    let n = mensal
      ? Math.max(0, (ini.getFullYear() - base.getFullYear()) * 12 + ini.getMonth() - base.getMonth() - 1)
      : Math.max(0, ini.getFullYear() - base.getFullYear() - 1);
    for (; ; n++) {
      const total = base.getMonth() + (mensal ? n : 0);
      const ano = base.getFullYear() + (mensal ? Math.floor(total / 12) : n);
      const mes0 = mensal ? total % 12 : base.getMonth();
      if (`${ano}-${Datas.pad(mes0 + 1)}-01` > ate) break;
      if (dia <= Datas.diasNoMes(ano, mes0)) add(`${ano}-${Datas.pad(mes0 + 1)}-${Datas.pad(dia)}`);
    }
    return saida;
  },

  combina(ev, termo) {
    if (!termo) return true;
    return normalizar([ev.titulo, ev.responsavel, ev.local, ev.obs].join(' ')).includes(termo);
  },

  /* Lista de ocorrências já filtradas e ordenadas. */
  listar(de, ate, { status = 'todos', pessoa = '', busca = '' } = {}) {
    const termo = normalizar(busca.trim());
    const itens = [];
    for (const ev of Store.dados.eventos) {
      if (pessoa && ev.responsavel !== pessoa) continue;
      if (!this.combina(ev, termo)) continue;
      for (const data of this.ocorrencias(ev, de, ate)) {
        const feito = ev.feitos.includes(data);
        if ((status === 'pendentes' && feito) || (status === 'concluidos' && !feito)) continue;
        itens.push({ ev, data, feito });
      }
    }
    return itens.sort((a, b) => a.data.localeCompare(b.data) || a.ev.hora.localeCompare(b.ev.hora) || a.ev.titulo.localeCompare(b.ev.titulo, 'pt-BR'));
  },

  alternarFeito(id, data) {
    const ev = Store.evento(id);
    if (!ev) return false;
    const i = ev.feitos.indexOf(data);
    if (i > -1) ev.feitos.splice(i, 1); else ev.feitos.push(data);
    Store.tocar(ev);
    Store.salvar();
    return i === -1;
  },

  /* Se o aviso for depois do horário do compromisso, ele acontece na véspera. */
  diaDoAviso(ev, data) {
    return ev.hora && ev.aviso && ev.aviso > ev.hora ? Datas.somar(data, -1) : data;
  },
  rotuloAviso(ev) {
    return `Avisar às ${ev.aviso}${ev.hora && ev.aviso > ev.hora ? ' (véspera)' : ''}`;
  },

  excluirOcorrencia(id, data) {
    const ev = Store.evento(id);
    if (!ev) return;
    ev.excecoes.push(data);
    ev.feitos = ev.feitos.filter((d) => d !== data);
    Store.tocar(ev);
    Store.salvar();
  },
};

const AgendaUI = {
  get el() { return $('#agendaConteudo'); },
  filtros() { return { status: ui.status, pessoa: ui.pessoa, busca: ui.busca }; },

  render() {
    Cores.recalcular();
    this.renderModo();
    this.renderFiltros();
    this[ui.modo]();
  },

  renderModo() {
    $$('#agendaModo button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modo === ui.modo)));
  },

  renderFiltros() {
    const pessoas = Store.pessoas();
    if (ui.pessoa && !pessoas.includes(ui.pessoa)) ui.pessoa = '';
    const chip = (tipo, valor, rotulo, ativo) => `<button type="button" class="chip" data-${tipo}="${esc(valor)}" aria-pressed="${ativo}">${esc(rotulo)}</button>`;
    $('#agendaFiltros').innerHTML =
      chip('status', 'todos', 'Todos', ui.status === 'todos') +
      chip('status', 'pendentes', 'Pendentes', ui.status === 'pendentes') +
      chip('status', 'concluidos', 'Concluídos', ui.status === 'concluidos') +
      (pessoas.length ? '<span class="sep"></span>' + pessoas.map((p) =>
        `<button type="button" class="chip chip-pessoa" data-pessoa="${esc(p)}" aria-pressed="${ui.pessoa === p}" style="--cor:${Cores.pessoa(p)}"><i></i>${esc(p)}</button>`).join('') : '');
  },

  item({ ev, data, feito }) {
    const meta = [ev.responsavel, ev.local].filter(Boolean).map(esc).join(' · ');
    return `<div class="ev${feito ? ' feito' : ''}" data-id="${esc(ev.id)}" data-data="${data}" role="button" tabindex="0" style="--cor:${Cores.pessoa(ev.responsavel)}">
      <div class="ev-hora">${ev.hora || '<small>dia</small>'}</div>
      <div>
        <div class="ev-titulo">${esc(ev.titulo)}${ev.recorrencia !== 'nao' ? ' <span class="rec" title="Repete">↻</span>' : ''}</div>
        ${meta ? `<div class="ev-meta">${meta}</div>` : ''}
        ${ev.aviso && !feito ? `<div class="ev-aviso">${ICONE.sino}${Agenda.rotuloAviso(ev)}</div>` : ''}
      </div>
      <button type="button" class="check" aria-label="${feito ? 'Marcar como pendente' : 'Marcar como concluído'}" aria-pressed="${feito}"></button>
    </div>`;
  },

  grupo(data, itens, vazio = '') {
    const hoje = Datas.hoje();
    const classe = data === hoje ? ' hoje' : '';
    const corpo = itens.length ? itens.map((o) => this.item(o)).join('') : `<p class="dia-vazio">${vazio}</p>`;
    return `<section class="dia"><h3 class="dia-tit${classe}">${Datas.rotuloDia(data)}</h3><div class="painel">${corpo}</div></section>`;
  },

  agrupar(itens) {
    const dias = new Map();
    itens.forEach((o) => { if (!dias.has(o.data)) dias.set(o.data, []); dias.get(o.data).push(o); });
    return [...dias].map(([d, lista]) => this.grupo(d, lista)).join('');
  },

  vazio(titulo, texto) {
    return `<div class="vazio"><strong>${titulo}</strong>${texto}</div>`;
  },

  navegador(titulo, rotuloAnt, rotuloProx) {
    return `<div class="nav-per">
      <button type="button" class="seta" data-nav="-1" aria-label="${rotuloAnt}">${ICONE.esq}</button>
      <button type="button" class="nav-tit" data-nav="0" title="Voltar para hoje">${titulo}</button>
      <button type="button" class="seta" data-nav="1" aria-label="${rotuloProx}">${ICONE.dir}</button>
    </div>`;
  },

  DIAS_LISTA: 60,

  /* Na pesquisa, um compromisso repetido aparece uma vez: a próxima ocorrência (ou a última). */
  umaPorSerie(itens, hoje) {
    const escolhido = new Map();
    for (const o of itens) {
      const atual = escolhido.get(o.ev.id);
      if (!atual || (atual.data < hoje && o.data >= hoje) || (atual.data < hoje && o.data > atual.data)) escolhido.set(o.ev.id, o);
    }
    return itens.filter((o) => escolhido.get(o.ev.id) === o);
  },

  lista() {
    const hoje = Datas.hoje();
    const f = this.filtros();
    let html = '';

    if (!Store.dados.eventos.length) {
      this.el.innerHTML = this.vazio('Nenhum compromisso ainda', 'Toque em Novo para adicionar o primeiro.');
      return;
    }
    if (f.busca.trim()) {
      const achados = this.umaPorSerie(Agenda.listar(Datas.somar(hoje, -365), Datas.somar(hoje, 365), f), hoje);
      this.el.innerHTML = achados.length ? this.agrupar(achados) : this.vazio('Nada encontrado', `Nenhum compromisso com “${esc(f.busca)}”.`);
      return;
    }
    if (f.status === 'concluidos') {
      const feitos = Agenda.listar(Datas.somar(hoje, -60), Datas.somar(hoje, 120), f);
      this.el.innerHTML = feitos.length ? this.agrupar(feitos) : this.vazio('Nada concluído', 'Os compromissos concluídos aparecem aqui.');
      return;
    }

    const atrasados = Agenda.listar(Datas.somar(hoje, -30), Datas.somar(hoje, -1), { ...f, status: 'pendentes' });
    if (atrasados.length) {
      html += '<p class="secao-alerta">Ficaram pendentes</p>' + this.agrupar(atrasados).replaceAll('class="dia-tit"', 'class="dia-tit passado"');
    }
    const proximos = Agenda.listar(hoje, Datas.somar(hoje, this.DIAS_LISTA), f);
    if (!proximos.some((o) => o.data === hoje)) html += this.grupo(hoje, [], 'Nada marcado para hoje.');
    html += this.agrupar(proximos);
    html += `<p class="rodape-nota">Próximos ${this.DIAS_LISTA} dias. Para ver além, use Mês.</p>`;
    this.el.innerHTML = html;
  },

  semana() {
    const ini = Datas.inicioSemana(ui.semanaRef);
    const fim = Datas.somar(ini, 6);
    const a = Datas.parse(ini), b = Datas.parse(fim);
    const mesA = Datas.MESES[a.getMonth()].slice(0, 3), mesB = Datas.MESES[b.getMonth()].slice(0, 3);
    const titulo = mesA === mesB ? `${a.getDate()} – ${b.getDate()} de ${mesB}` : `${a.getDate()} ${mesA} – ${b.getDate()} ${mesB}`;
    const itens = Agenda.listar(ini, fim, this.filtros());
    let html = this.navegador(titulo, 'Semana anterior', 'Próxima semana');
    for (let i = 0; i < 7; i++) {
      const d = Datas.somar(ini, i);
      html += this.grupo(d, itens.filter((o) => o.data === d), 'Livre');
    }
    this.el.innerHTML = html;
  },

  mes() {
    const ref = Datas.parse(ui.mesRef);
    const ano = ref.getFullYear(), mes0 = ref.getMonth();
    const primeiro = ui.mesRef;
    const ultimo = `${ano}-${Datas.pad(mes0 + 1)}-${Datas.pad(Datas.diasNoMes(ano, mes0))}`;
    if (ui.diaSel < primeiro || ui.diaSel > ultimo) ui.diaSel = primeiro;

    const itens = Agenda.listar(primeiro, ultimo, this.filtros());
    this.porDia = {};
    itens.forEach((o) => (this.porDia[o.data] ||= []).push(o));

    const hoje = Datas.hoje();
    const fora = (n) => `<div class="cal-dia fora" aria-hidden="true"><span class="n">${n}</span></div>`;
    let grade = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l) => `<div class="cal-sem" aria-hidden="true">${l}</div>`).join('');
    const antes = ref.getDay(), diasAnt = Datas.diasNoMes(ano, mes0 - 1), diasMes = Datas.diasNoMes(ano, mes0);
    for (let i = antes; i > 0; i--) grade += fora(diasAnt - i + 1);
    for (let dia = 1; dia <= diasMes; dia++) {
      const d = `${ano}-${Datas.pad(mes0 + 1)}-${Datas.pad(dia)}`;
      const lista = this.porDia[d] || [];
      const cls = `cal-dia${lista.length ? ' tem' : ''}${d === hoje ? ' hoje' : ''}${d === ui.diaSel ? ' sel' : ''}`;
      const mini = lista.slice(0, 2).map((o) => `<b>${esc(o.ev.titulo)}</b>`).join('');
      const pontos = lista.slice(0, 3).map((o) => `<i style="background:${Cores.pessoa(o.ev.responsavel)}"></i>`).join('');
      grade += `<button type="button" class="${cls}" data-dia="${d}" aria-label="${Datas.rotuloDia(d)}${lista.length ? `, ${lista.length} compromisso(s)` : ''}">
        <span class="n">${dia}</span><span class="mini">${mini}</span><span class="pontos">${pontos}</span></button>`;
    }
    for (let i = 1; i <= (7 - ((antes + diasMes) % 7)) % 7; i++) grade += fora(i);

    this.el.innerHTML = this.navegador(Datas.mesAno(primeiro), 'Mês anterior', 'Próximo mês') +
      `<div class="cal">${grade}<div class="balao" hidden></div></div>` +
      this.grupo(ui.diaSel, itens.filter((o) => o.data === ui.diaSel), 'Nada marcado.');
  },

  selecionarDia(d) {
    ui.diaSel = d;
    this.mes();
    $('.cal-dia.sel', this.el)?.classList.add('pulso');
  },

  /* Balão com o resumo do dia sob o dedo ou o mouse. */
  balao(el) {
    const cal = $('.cal', this.el);
    const b = cal && $('.balao', cal);
    if (!b) return;
    if (!el || !el.dataset.dia || !cal.contains(el)) { b.hidden = true; return; }
    const d = el.dataset.dia;
    const lista = this.porDia[d] || [];
    const linhas = lista.slice(0, 3).map((o) => `<span><em style="background:${Cores.pessoa(o.ev.responsavel)}"></em>${o.ev.hora || 'dia'} · ${esc(o.ev.titulo)}</span>`).join('');
    const extra = lista.length > 3 ? `<span class="mais">+${lista.length - 3}</span>` : '';
    b.innerHTML = `<b>${Datas.curto(d)}</b>${linhas || '<span class="livre">Dia livre</span>'}${extra}`;
    b.hidden = false;
    const rc = cal.getBoundingClientRect(), re = el.getBoundingClientRect();
    const meia = b.offsetWidth / 2;
    const x = Math.max(meia, Math.min(rc.width - meia, re.left - rc.left + re.width / 2));
    b.style.left = `${x}px`;
    b.style.top = `${re.top - rc.top}px`;
  },

  navegar(passo) {
    const hoje = Datas.hoje();
    if (ui.modo === 'semana') ui.semanaRef = passo ? Datas.somar(ui.semanaRef, passo * 7) : hoje;
    if (ui.modo === 'mes') {
      ui.mesRef = passo ? Datas.somarMeses(ui.mesRef, passo) : hoje.slice(0, 8) + '01';
      ui.diaSel = ui.mesRef.slice(0, 7) === hoje.slice(0, 7) ? hoje : ui.mesRef;
    }
    this.render();
  },

  ligar() {
    $('#agendaModo').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-modo]');
      if (!b) return;
      ui.modo = b.dataset.modo;
      Prefs.salvar();
      this.render();
    });

    let atraso;
    $('#busca').addEventListener('input', (e) => {
      clearTimeout(atraso);
      atraso = setTimeout(() => {
        ui.busca = e.target.value;
        if (ui.busca.trim() && ui.modo !== 'lista') ui.modo = 'lista';
        this.render();
      }, 150);
    });

    $('#agendaFiltros').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      if (b.dataset.status) ui.status = b.dataset.status;
      if (b.dataset.pessoa !== undefined) ui.pessoa = ui.pessoa === b.dataset.pessoa ? '' : b.dataset.pessoa;
      Prefs.salvar();
      this.render();
    });

    this.el.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) return this.navegar(Number(nav.dataset.nav));
      const dia = e.target.closest('[data-dia]');
      if (dia) {
        if (Date.now() - this.escolhidoEm < 600) return;
        return this.selecionarDia(dia.dataset.dia);
      }
      const ev = e.target.closest('.ev');
      if (!ev) return;
      if (e.target.closest('.check')) {
        const { id, data } = ev.dataset;
        const feito = Agenda.alternarFeito(id, data);
        if (navigator.vibrate) navigator.vibrate(12);
        UI.toast(feito ? 'Marcado como concluído' : 'Marcado como pendente');
        this.render();
        return $(`.ev[data-id="${CSS.escape(id)}"][data-data="${data}"]`, this.el)?.classList.add('pulso');
      }
      EventoForm.abrir(ev.dataset.id, ev.dataset.data);
    });

    this.escolhidoEm = 0;
    this.el.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' || !e.target.closest('.cal')) return;
      const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-dia[data-dia]');
      if (!alvo) return;
      this.escolhidoEm = Date.now();
      setTimeout(() => this.selecionarDia(alvo.dataset.dia), 140);
    });
    document.addEventListener('luz', (e) => { if (ui.modo === 'mes' && ui.aba === 'agenda') this.balao(e.detail); });

    this.el.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('ev')) {
        e.preventDefault();
        EventoForm.abrir(e.target.dataset.id, e.target.dataset.data);
      }
    });

    $('#btnNovoEvento').addEventListener('click', () => EventoForm.abrir(null, ui.modo === 'mes' ? ui.diaSel : Datas.hoje()));
  },
};

/* ---------- Formulário de compromisso ---------- */
const EventoForm = {
  abrir(id, dataOcorrencia) {
    UI.atualizarListas();
    const ev = id ? Store.evento(id) : null;
    const d = ev || { titulo: '', data: dataOcorrencia || Datas.hoje(), hora: '', responsavel: '', local: '', aviso: '', obs: '', recorrencia: 'nao' };
    const oc = ev ? dataOcorrencia || ev.data : null;
    const repete = ev && ev.recorrencia !== 'nao';
    const opcoesRec = Object.entries(Modelo.RECORRENCIAS).map(([v, r]) => `<option value="${v}"${d.recorrencia === v ? ' selected' : ''}>${r}</option>`).join('');

    const corpo = `<form class="form" novalidate>
      ${ev ? `<div class="acoes-rapidas">
        <button type="button" class="btn-leve" data-acao="whats">${ICONE.whats}Avisar pelo WhatsApp</button>
        <button type="button" class="btn-leve" data-acao="ics">${ICONE.cal}Salvar no calendário</button>
      </div>` : ''}
      ${UI.campo('Compromisso', `<input name="titulo" value="${esc(d.titulo)}" placeholder="Ex.: Consulta médica" maxlength="120" required>`)}
      <div class="duas">
        ${UI.campo(repete ? 'Começa em' : 'Data', `<input type="date" name="data" value="${d.data}" required>`)}
        ${UI.campo('Horário', `<input type="time" name="hora" value="${d.hora}">`)}
      </div>
      ${UI.campo('Responsável', `<input name="responsavel" value="${esc(d.responsavel)}" list="dl-pessoas" placeholder="Quem vai" maxlength="60" autocomplete="off">`)}
      ${UI.campo('Local', `<input name="local" value="${esc(d.local)}" placeholder="Onde" maxlength="120">`)}
      <div class="duas">
        ${UI.campo('Avisar às', `<input type="time" name="aviso" value="${d.aviso}">`)}
        ${UI.campo('Repetir', `<select name="recorrencia">${opcoesRec}</select>`)}
      </div>
      ${UI.campo('Observação', `<textarea name="obs" maxlength="1000" placeholder="Opcional">${esc(d.obs)}</textarea>`)}
      ${ev ? `<label class="interruptor">${repete ? `Concluído em ${Datas.br(oc)}` : 'Concluído'}<input type="checkbox" name="feito" ${ev.feitos.includes(oc) ? 'checked' : ''}></label>` : ''}
      <div class="botoes">
        ${ev ? '<button type="button" class="btn perigo" data-acao="excluir">Excluir</button>' : ''}
        <span class="cresce"></span>
        <button type="button" class="btn" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="btn prim">Salvar</button>
      </div>
    </form>`;

    const folha = UI.abrir({ titulo: ev ? 'Editar compromisso' : 'Novo compromisso', corpo });
    const form = $('form', folha);
    if (!ev) setTimeout(() => form.titulo.focus(), 300);

    form.addEventListener('submit', (e) => { e.preventDefault(); this.salvar(form, ev, oc); });
    form.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'cancelar') UI.fechar();
      if (acao === 'excluir') this.excluir(ev, oc);
      if (acao === 'whats') WhatsApp.enviar(this.coletar(form, ev), oc);
      if (acao === 'ics') Calendario.exportar(this.coletar(form, ev), oc);
    });
  },

  coletar(form, ev) {
    return Modelo.evento({
      ...(ev || {}),
      id: ev ? ev.id : uid(),
      titulo: form.titulo.value,
      data: form.data.value,
      hora: form.hora.value,
      responsavel: form.responsavel.value,
      local: form.local.value,
      aviso: form.aviso.value,
      recorrencia: form.recorrencia.value,
      obs: form.obs.value,
    });
  },

  async salvar(form, ev, oc) {
    const novo = this.coletar(form, ev);
    $$('.campo', form).forEach((c) => c.classList.remove('erro'));
    if (!novo) {
      const faltando = !form.titulo.value.trim() ? form.titulo : form.data;
      faltando.closest('.campo').classList.add('erro');
      faltando.focus();
      UI.toast(!form.titulo.value.trim() ? 'Escreva o compromisso.' : 'Escolha uma data válida.');
      return;
    }
    if (ev && form.feito) {
      novo.feitos = novo.feitos.filter((d) => d !== oc);
      if (form.feito.checked) novo.feitos.push(oc);
    }
    if (!Store.gravar('eventos', novo)) return;
    await UI.fechar();
    AgendaUI.render();
    UI.toast('Compromisso salvo');
    if (novo.aviso) Lembretes.pedirPermissao();
  },

  async excluir(ev, oc) {
    const repete = ev.recorrencia !== 'nao';
    const opcoes = repete
      ? [{ id: 'uma', rotulo: `Só a de ${Datas.br(oc)}` }, { id: 'serie', rotulo: 'Todas as repetições', estilo: 'perigo' }]
      : [{ id: 'serie', rotulo: 'Excluir', estilo: 'perigo-forte' }];
    const r = await UI.escolher({
      titulo: 'Excluir compromisso?',
      mensagem: repete ? `“${esc(ev.titulo)}” se repete. O que deseja excluir?` : `“${esc(ev.titulo)}” será removido.`,
      opcoes,
    });
    if (!r) return;
    if (r === 'uma') Agenda.excluirOcorrencia(ev.id, oc);
    else Store.remover('eventos', ev.id);
    await UI.fechar();
    AgendaUI.render();
    UI.toast('Compromisso excluído');
  },
};

/* ---------- WhatsApp (link de compartilhamento, sem API paga) ---------- */
const WhatsApp = {
  mensagem(ev, data) {
    const quando = Datas.curto(data) + (ev.hora ? ` às ${ev.hora}` : '');
    return ['🔔 Lembrete · Família Power', '', ev.titulo, quando, ev.responsavel, ev.local, ev.obs].filter(Boolean).join('\n');
  },
  enviar(ev, data) {
    if (!ev) return UI.toast('Preencha o compromisso e a data.');
    const dataMsg = ev.recorrencia === 'nao' ? ev.data : data;
    window.open(`https://wa.me/?text=${encodeURIComponent(this.mensagem(ev, dataMsg))}`, '_blank', 'noopener');
  },
};

/* ---------- Exportação .ics (lembrete garantido pelo calendário do celular) ---------- */
const Calendario = {
  escapar: (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c),
  exportar(ev, data) {
    if (!ev) return UI.toast('Preencha o compromisso e a data.');
    const inicio = ev.recorrencia === 'nao' ? ev.data : data;
    const dia = inicio.replace(/-/g, '');
    const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Familia//Agenda//PT', 'BEGIN:VEVENT',
      `UID:${ev.id}-${dia}@familia`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`];
    if (ev.hora) {
      const fim = Datas.minutos(ev.hora) + 60;
      const fimHM = fim >= 1440 ? '2359' : Datas.pad(Math.floor(fim / 60)) + Datas.pad(fim % 60);
      linhas.push(`DTSTART:${dia}T${ev.hora.replace(':', '')}00`, `DTEND:${dia}T${fimHM}00`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${dia}`, `DTEND;VALUE=DATE:${Datas.somar(inicio, 1).replace(/-/g, '')}`);
    }
    const freq = { diaria: 'DAILY', semanal: 'WEEKLY', mensal: 'MONTHLY', anual: 'YEARLY' }[ev.recorrencia];
    if (freq) linhas.push(`RRULE:FREQ=${freq}`);
    linhas.push(`SUMMARY:${this.escapar(ev.titulo)}`);
    if (ev.local) linhas.push(`LOCATION:${this.escapar(ev.local)}`);
    const desc = [ev.responsavel, ev.obs].filter(Boolean).join('\n');
    if (desc) linhas.push(`DESCRIPTION:${this.escapar(desc)}`);
    if (ev.aviso) {
      const aviso = Datas.minutos(ev.aviso);
      const gatilho = ev.hora
        ? `-PT${(Datas.minutos(ev.hora) - aviso + 1440) % 1440 || 0}M`
        : `PT${aviso}M`;
      linhas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${this.escapar(ev.titulo)}`, `TRIGGER:${gatilho}`, 'END:VALARM');
    }
    linhas.push('END:VEVENT', 'END:VCALENDAR');
    const nome = normalizar(ev.titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'compromisso';
    baixarArquivo(linhas.join('\r\n'), `${nome}.ics`, 'text/calendar');
    UI.toast('Arquivo criado. Abra-o para adicionar ao calendário.');
  },
};

/* ---------- Lembretes (notificações locais) ---------- */
const Lembretes = {
  CHAVE: 'familia.avisados',
  suportado: 'Notification' in window,

  async pedirPermissao() {
    if (!this.suportado || Notification.permission !== 'default') return;
    try { await Notification.requestPermission(); } catch { /* ignora */ }
  },

  lerAvisados() {
    try { return JSON.parse(localStorage.getItem(this.CHAVE) || '{}'); } catch { return {}; }
  },

  verificar() {
    const hoje = Datas.hoje(), agora = Datas.agoraHM();
    const avisados = this.lerAvisados();
    let mudou = false;
    for (const { ev, data } of Agenda.listar(hoje, Datas.somar(hoje, 1), { status: 'pendentes' })) {
      if (!ev.aviso || Agenda.diaDoAviso(ev, data) !== hoje || ev.aviso > agora) continue;
      if (data === hoje && ev.hora && ev.hora <= agora) continue;
      const chave = `${ev.id}|${data}`;
      if (avisados[chave]) continue;
      avisados[chave] = hoje;
      mudou = true;
      this.mostrar(ev, data, chave);
    }
    const limite = Datas.somar(hoje, -7);
    Object.keys(avisados).forEach((k) => { if (avisados[k] < limite) { delete avisados[k]; mudou = true; } });
    if (mudou) localStorage.setItem(this.CHAVE, JSON.stringify(avisados));
  },

  mostrar(ev, data, tag) {
    const quando = Datas.curto(data) + (ev.hora ? ` às ${ev.hora}` : '');
    const corpo = [quando, ev.responsavel, ev.local].filter(Boolean).join(' · ');
    UI.toast(`🔔 ${ev.titulo} — ${quando}`);
    if (!this.suportado || Notification.permission !== 'granted') return;
    const opcoes = { body: corpo, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', vibrate: [120, 60, 120] };
    const reserva = () => { try { new Notification(ev.titulo, opcoes); } catch { /* Android exige service worker */ } };
    if (!navigator.serviceWorker) return reserva();
    navigator.serviceWorker.getRegistration()
      .then((reg) => (reg ? reg.showNotification(ev.titulo, opcoes) : reserva()))
      .catch(reserva);
  },

  iniciar() {
    this.verificar();
    setInterval(() => this.verificar(), 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.verificar(); });
  },
};

/* =========================================================
   FINANCEIRO
   ========================================================= */
const Financeiro = {
  doMes(mes) {
    return Store.dados.lancamentos
      .filter((l) => l.data.startsWith(mes))
      .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  },
  resumo(lista) {
    const r = { entradas: 0, saidas: 0, aPagar: 0, aReceber: 0 };
    for (const l of lista) {
      if (l.tipo === 'receita') { r.entradas += l.valor; if (!l.pago) r.aReceber += l.valor; }
      else { r.saidas += l.valor; if (!l.pago) r.aPagar += l.valor; }
    }
    r.saldo = r.entradas - r.saidas;
    return r;
  },
};

const FinUI = {
  render() {
    const mes = ui.finMes;
    const lista = Financeiro.doMes(mes);
    $('#finNav').innerHTML = AgendaUI.navegador(Datas.mesAno(mes + '-01'), 'Mês anterior', 'Próximo mês');
    this.renderResumo(lista);
    this.renderGastos(lista);
    this.renderLista(lista, mes);
  },

  renderResumo(lista = Financeiro.doMes(ui.finMes)) {
    const r = Financeiro.resumo(lista);
    $('#finResumo').innerHTML = `
      <dt>Entradas</dt><dd>${Dinheiro.br(r.entradas)}</dd>
      <dt>Saídas</dt><dd>${Dinheiro.br(r.saidas)}</dd>
      ${r.aPagar ? `<dt class="obs">Ainda a pagar</dt><dd class="obs pend-resumo">${Dinheiro.br(r.aPagar)}</dd>` : ''}
      ${r.aReceber ? `<dt class="obs">Ainda a receber</dt><dd class="obs">${Dinheiro.br(r.aReceber)}</dd>` : ''}
      <dt class="saldo">Saldo</dt><dd class="saldo${r.saldo < 0 ? ' neg' : ''}">${Dinheiro.br(r.saldo)}</dd>`;
  },

  /* Despesas por categoria: barras em CSS puro com as cores do tema. */
  renderGastos(lista) {
    const porCat = {};
    lista.filter((l) => l.tipo === 'despesa').forEach((l) => {
      const c = l.categoria || 'Sem categoria';
      porCat[c] = (porCat[c] || 0) + l.valor;
    });
    const itens = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const el = $('#finGastos');
    if (itens.length < 2) { el.innerHTML = ''; return; }
    const aberto = el.querySelector('details')?.open ? ' open' : '';
    const max = itens[0][1], total = itens.reduce((t, [, v]) => t + v, 0);
    const linhas = itens.slice(0, 6).map(([cat, v]) => {
      const pct = Math.round((v / total) * 100);
      return `<li><b>${esc(cat)}</b><span>${Dinheiro.br(v)}</span>
        <div class="barra" role="img" aria-label="${esc(cat)}: ${pct}% das despesas"><i style="--p:${Math.max(3, (v / max) * 100)}%"></i></div></li>`;
    }).join('');
    el.innerHTML = `<details class="gastos"${aberto}><summary>Para onde foi o dinheiro <small>${itens.length} categorias</small></summary><ol>${linhas}</ol></details>`;
  },

  renderLista(lista, mes) {
    const alvo = $('#finLista');
    if (!lista.length) {
      alvo.innerHTML = `<div class="vazio"><strong>Nada lançado em ${Datas.MESES[Number(mes.slice(5)) - 1]}</strong>Registre uma despesa ou leia uma nota.
        <div class="acoes-vazio"><button type="button" class="btn-leve" data-vazio="nota">${ICONE.camera}Ler nota</button><button type="button" class="btn-leve" data-vazio="novo">Novo lançamento</button></div></div>`;
      return;
    }
    let painel = $('.painel', alvo);
    if (!painel) { alvo.innerHTML = '<div class="painel"></div>'; painel = $('.painel', alvo); }
    reconciliar(painel, lista, (l) => l.id, (l) => this.linha(l));
  },

  rotuloEstado(l) {
    if (l.tipo === 'receita') return l.pago ? 'Recebido' : 'A receber';
    return l.pago ? 'Pago' : 'A pagar';
  },

  linha(l) {
    const meta = [l.categoria, l.pessoa].filter(Boolean).map(esc).join(' · ');
    const sinal = l.tipo === 'receita' ? '+' : '−';
    return `<div class="lc ${l.tipo}" data-id="${esc(l.id)}" role="button" tabindex="0" aria-label="${esc(l.descricao)}, ${sinal === '+' ? 'receita' : 'despesa'} de ${Dinheiro.br(l.valor)}, ${this.rotuloEstado(l)}">
      <div class="lc-dia" aria-hidden="true">${Number(l.data.slice(8))}</div>
      <div><div class="lc-desc">${esc(l.descricao)}</div>${meta ? `<div class="lc-meta">${meta}</div>` : ''}
        <button type="button" class="estado${l.pago ? ' ok' : ''}" data-estado aria-pressed="${l.pago}" aria-label="${this.rotuloEstado(l)}. Toque para alternar">${this.rotuloEstado(l)}</button></div>
      <div class="lc-valor">${sinal} ${Dinheiro.br(l.valor)}</div>
    </div>`;
  },

  /* Alterna Pendente ↔ Pago no próprio elemento, para a transição de cor acontecer. */
  alternarPago(linhaEl) {
    const l = Store.lancamento(linhaEl.dataset.id);
    if (!l) return;
    l.pago = !l.pago;
    Store.tocar(l);
    if (!Store.salvar()) return;
    const botao = $('.estado', linhaEl);
    botao.classList.toggle('ok', l.pago);
    botao.classList.remove('mudou');
    void botao.offsetWidth;
    botao.classList.add('mudou');
    botao.textContent = this.rotuloEstado(l);
    botao.setAttribute('aria-pressed', String(l.pago));
    botao.setAttribute('aria-label', `${this.rotuloEstado(l)}. Toque para alternar`);
    linhaEl.dataset.hash = hashTexto(this.linha(l));
    if (navigator.vibrate) navigator.vibrate(10);
    this.renderResumo();
    UI.toast(`${l.descricao}: ${l.pago ? this.rotuloEstado(l).toLowerCase() : 'pendente'}`);
  },

  ligar() {
    $('#finNav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav]');
      if (!b) return;
      const passo = Number(b.dataset.nav);
      ui.finMes = passo ? Datas.somarMeses(ui.finMes + '-01', passo).slice(0, 7) : Datas.hoje().slice(0, 7);
      App.seguro(() => this.render(), '#finLista');
    });
    $('#finLista').addEventListener('click', (e) => {
      const vazio = e.target.closest('[data-vazio]');
      if (vazio) return vazio.dataset.vazio === 'nota' ? Leitura.iniciar() : LancamentoForm.abrir();
      const linha = e.target.closest('.lc');
      if (!linha) return;
      if (e.target.closest('[data-estado]')) return this.alternarPago(linha);
      LancamentoForm.abrir(linha.dataset.id);
    });
    $('#finLista').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('lc')) LancamentoForm.abrir(e.target.dataset.id);
    });
    $('#btnNovoLanc').addEventListener('click', () => LancamentoForm.abrir());
    $('#btnLerNota').addEventListener('click', () => Leitura.iniciar());
  },
};

/* ---------- Formulário de lançamento (também usado pelo OCR) ---------- */
const LancamentoForm = {
  dataPadrao() {
    const hoje = Datas.hoje();
    return ui.finMes === hoje.slice(0, 7) ? hoje : ui.finMes + '-01';
  },

  /* sugestao: dados vindos da nota; nota: { url, texto } para conferência */
  abrir(id = null, sugestao = null, nota = null) {
    UI.atualizarListas();
    const l = id ? Store.lancamento(id) : null;
    const d = l || {
      descricao: '', categoria: '', pessoa: '', tipo: 'despesa', pago: true, valor: null,
      data: sugestao ? '' : this.dataPadrao(), hora: '', ...(sugestao || {}),
    };
    const lido = (campo) => (sugestao && sugestao[campo] ? 'lido' : '');

    const corpo = `<form class="form" novalidate>
      ${nota ? `<div class="nota-previa"><img src="${nota.url}" alt="Foto da nota"><span>Confira os dados. Campos em azul foram lidos da nota; os vazios não foram encontrados.</span></div>` : ''}
      <div class="tipo" role="radiogroup" aria-label="Tipo">
        <label><input type="radio" name="tipo" value="despesa" ${d.tipo !== 'receita' ? 'checked' : ''}><span>Despesa</span></label>
        <label><input type="radio" name="tipo" value="receita" ${d.tipo === 'receita' ? 'checked' : ''}><span>Receita</span></label>
      </div>
      ${UI.campo('Descrição', `<input name="descricao" value="${esc(d.descricao)}" placeholder="Ex.: Mercado" maxlength="120">`, lido('descricao'))}
      ${UI.campo('Valor', `<input name="valor" value="${Dinheiro.campo(d.valor)}" inputmode="decimal" placeholder="0,00" autocomplete="off">`, lido('valor'))}
      <div class="duas">
        ${UI.campo('Data', `<input type="date" name="data" value="${d.data}">`, lido('data'))}
        ${UI.campo('Hora', `<input type="time" name="hora" value="${d.hora}">`, lido('hora'))}
      </div>
      <div class="duas">
        ${UI.campo('Categoria', `<input name="categoria" value="${esc(d.categoria)}" list="dl-categorias" placeholder="Escolha" maxlength="40" autocomplete="off">`, lido('categoria'))}
        ${UI.campo('Pessoa', `<input name="pessoa" value="${esc(d.pessoa)}" list="dl-pessoas" placeholder="Quem" maxlength="60" autocomplete="off">`)}
      </div>
      <label class="interruptor"><span class="rotulo-pago">${d.tipo === 'receita' ? 'Recebido' : 'Pago'}</span><input type="checkbox" name="pago" ${d.pago ? 'checked' : ''}></label>
      ${nota && nota.texto ? `<details class="texto-lido"><summary>Ver texto reconhecido</summary><pre>${esc(nota.texto)}</pre></details>` : ''}
      <div class="botoes">
        ${l ? '<button type="button" class="btn perigo" data-acao="excluir">Excluir</button>' : ''}
        <span class="cresce"></span>
        <button type="button" class="btn" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="btn prim">Salvar</button>
      </div>
    </form>`;

    const folha = UI.abrir({
      titulo: l ? 'Editar lançamento' : 'Novo lançamento',
      corpo,
      aoFechar: () => { if (nota) URL.revokeObjectURL(nota.url); },
    });
    const form = $('form', folha);
    if (!l && !sugestao) setTimeout(() => form.descricao.focus(), 300);

    form.addEventListener('change', (e) => {
      if (e.target.name === 'tipo') $('.rotulo-pago', form).textContent = e.target.value === 'receita' ? 'Recebido' : 'Pago';
    });
    form.addEventListener('input', (e) => e.target.closest('.campo')?.classList.remove('lido', 'erro'));
    form.addEventListener('submit', (e) => { e.preventDefault(); this.salvar(form, l); });
    form.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'cancelar') UI.fechar();
      if (acao === 'excluir') this.excluir(l);
    });
  },

  async salvar(form, atual) {
    const valor = Dinheiro.parse(form.valor.value);
    const erros = [];
    if (!valor) erros.push([form.valor, 'Informe um valor maior que zero.']);
    if (!Datas.valida(form.data.value)) erros.push([form.data, 'Escolha a data.']);
    $$('.campo', form).forEach((c) => c.classList.remove('erro'));
    if (erros.length) {
      erros.forEach(([campo]) => campo.closest('.campo').classList.add('erro'));
      erros[0][0].focus();
      return UI.toast(erros[0][1]);
    }
    const item = Modelo.lancamento({
      id: atual ? atual.id : uid(),
      tipo: form.tipo.value,
      descricao: form.descricao.value,
      valor,
      data: form.data.value,
      hora: form.hora.value,
      categoria: form.categoria.value,
      pessoa: form.pessoa.value,
      pago: form.pago.checked,
    });
    if (!Store.gravar('lancamentos', item)) return;
    await UI.fecharTodas();
    ui.finMes = item.data.slice(0, 7);
    FinUI.render();
    UI.toast('Lançamento salvo');
  },

  async excluir(l) {
    const r = await UI.escolher({
      titulo: 'Excluir lançamento?',
      mensagem: `“${esc(l.descricao)}” de ${Dinheiro.br(l.valor)} será removido.`,
      opcoes: [{ id: 'sim', rotulo: 'Excluir', estilo: 'perigo-forte' }],
    });
    if (!r) return;
    Store.remover('lancamentos', l.id);
    await UI.fechar();
    FinUI.render();
    UI.toast('Lançamento excluído');
  },
};

/* =========================================================
   OCR LOCAL (Tesseract.js servido pelo próprio app)
   ========================================================= */
const OCR = {
  BASE: 'vendor/tesseract/',
  worker: null,
  progresso: null,

  carregarBiblioteca() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = this.BASE + 'tesseract.min.js';
      s.onload = ok;
      s.onerror = () => falha(new Error('Não foi possível carregar o leitor de notas.'));
      document.head.appendChild(s);
    });
  },

  async obterWorker() {
    if (this.worker) return this.worker;
    await this.carregarBiblioteca();
    const worker = await Tesseract.createWorker('por', 1, {
      workerPath: this.BASE + 'worker.min.js',
      corePath: this.BASE + 'core',
      langPath: this.BASE + 'lang',
      workerBlobURL: false,
      logger: (m) => this.progresso && this.progresso(m),
    });
    await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
    this.worker = worker;
    return worker;
  },

  /* Reduz, converte para tons de cinza e aumenta o contraste. */
  async preparar(arquivo) {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala), h = Math.round(bitmap.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const img = ctx.getImageData(0, 0, w, h);
    const px = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 4) {
      const y = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000 | 0;
      px[i] = y;
      hist[y]++;
    }
    const corte = (w * h) * 0.01;
    let baixo = 0, alto = 255, soma = 0;
    while (baixo < 255 && (soma += hist[baixo]) < corte) baixo++;
    soma = 0;
    while (alto > 0 && (soma += hist[alto]) < corte) alto--;
    const faixa = Math.max(1, alto - baixo);
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.max(0, Math.min(255, ((px[i] - baixo) * 255) / faixa));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  },

  async ler(arquivo, aoProgredir) {
    this.progresso = aoProgredir;
    const [canvas, worker] = await Promise.all([this.preparar(arquivo), this.obterWorker()]);
    const { data } = await worker.recognize(canvas);
    this.progresso = null;
    return data.text || '';
  },

  async cancelar() {
    this.progresso = null;
    if (this.worker) {
      const w = this.worker;
      this.worker = null;
      await w.terminate();
    }
  },
};

/* ---------- Interpretação do texto da nota: só valor, data, hora e descrição ---------- */
const Nota = {
  RE_VALOR: /(\d{1,3}(?:\.\d{3})+|\d+)\s?[,.]\s?(\d{2})(?!\d)/g,
  CHAVES_TOTAL: [/valor\s*(a|à)\s*pagar/i, /valor\s*total|vl\.?\s*total|total\s*(r\$|geral|a\s*pagar)/i, /\btotal\b/i],
  IGNORAR_TOTAL: /sub\s*-?\s*total|tribut|impost|qtd|quant|itens|desconto|acr[eé]sc|troco|lei\s*\d/i,
  CATEGORIAS: [
    ['Alimentação', /supermerc|mercado|atacad|padaria|panifica|a[çc]ougue|hortifr|restaurante|lanchonete|pizzar|sorveteria|arroz|feij[aã]o|leite|caf[eé]\b/i],
    ['Saúde', /farm[aá]cia|drogaria|drogas|cl[ií]nica|hospital|laborat[oó]rio|[oó]tica/i],
    ['Transporte', /posto|combust|gasolina|etanol|diesel|estacionamento|ped[aá]gio/i],
    ['Casa', /material de constru|materiais de constru|ferragens|eletrodom|m[oó]veis|utilidades dom/i],
    ['Vestuário', /cal[çc]ados|confec[çc]|roupas|vestu[aá]rio/i],
    ['Educação', /livraria|papelaria|escola|col[eé]gio/i],
  ],

  valores(linha) {
    return [...linha.matchAll(this.RE_VALOR)].map((m) => Dinheiro.parse(`${m[1].replace(/\./g, '')},${m[2]}`)).filter((v) => v > 0);
  },

  total(linhas) {
    for (const chave of this.CHAVES_TOTAL) {
      for (let i = 0; i < linhas.length; i++) {
        if (!chave.test(linhas[i]) || this.IGNORAR_TOTAL.test(linhas[i])) continue;
        let v = this.valores(linhas[i]).pop();
        if (!v && linhas[i + 1] && !/[a-z]{3}/i.test(linhas[i + 1])) v = this.valores(linhas[i + 1]).pop();
        if (v) return v;
      }
    }
    return null;
  },

  data(txt) {
    const anoAtual = new Date().getFullYear();
    for (const m of txt.matchAll(/(?<!\d)(\d{2})[/.\-](\d{2})[/.\-](\d{4}|\d{2})(?!\d)/g)) {
      const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const d = `${ano}-${m[2]}-${m[1]}`;
      if (ano >= 2000 && ano <= anoAtual + 1 && Datas.valida(d)) return d;
    }
    return '';
  },

  hora(txt) {
    const m = txt.match(/(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?!\d)/);
    return m ? `${m[1]}:${m[2]}` : '';
  },

  bonito(s) {
    return s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|\s)(\S)/g, (_, e, c) => e + c.toUpperCase());
  },

  /* Uma nota de um item só vira a descrição; com vários itens, usa o nome do estabelecimento. */
  descricao(linhas) {
    const itens = [];
    for (const l of linhas) {
      const m = l.match(/^\s*\d{1,3}\s+[\dA-Z]{4,14}\s+(.*?[A-Za-zÀ-ú]{2}.*?)\s+\d+(?:[.,]\d+)?\s*(?:UN|KG|LT|L|PC|PCT|CX|G|ML|FD|DZ)\s*[xX*×]/i);
      if (m) itens.push(m[1].replace(/[^\wÀ-ú%.,/\s-]/g, '').trim());
    }
    if (itens.length === 1 && itens[0].length >= 3) return this.bonito(itens[0]);
    const cabecalho = linhas.slice(0, 5).find((l) => {
      const letras = (l.match(/[A-Za-zÀ-ú]/g) || []).length;
      return letras >= 5 && letras / l.replace(/\s/g, '').length > 0.7 &&
        !/cnpj|cpf|\bie\b|inscri|cupom|nota|documento|extrato|danfe|sat|endere|rua|av\.?\s/i.test(l);
    });
    return cabecalho ? this.bonito(cabecalho.replace(/\b(ltda|eireli|me|epp|s\/?a)\b\.?/gi, '')) : '';
  },

  categoria(txt) {
    const achada = this.CATEGORIAS.find(([, re]) => re.test(txt));
    return achada ? achada[0] : '';
  },

  extrair(txt) {
    const linhas = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return {
      valor: this.total(linhas),
      data: this.data(txt),
      hora: this.hora(txt),
      descricao: this.descricao(linhas),
      categoria: this.categoria(txt),
    };
  },
};

/* ---------- Fluxo "Ler nota": escolher imagem → ler → conferir ---------- */
const Leitura = {
  iniciar() {
    const folha = UI.abrir({
      titulo: 'Ler nota',
      corpo: `<p>A foto é lida aqui no celular e não é guardada.</p>
        <div class="lista-opcoes">
          <button type="button" class="opcao" data-origem="camera">${ICONE.camera}<span><b>Tirar foto</b><small>Deixe a nota reta e bem iluminada</small></span></button>
          <button type="button" class="opcao" data-origem="galeria">${ICONE.imagem}<span><b>Escolher imagem</b><small>Uma foto que já está no aparelho</small></span></button>
        </div>`,
    });
    folha.addEventListener('click', (e) => {
      const b = e.target.closest('[data-origem]');
      if (b) $(b.dataset.origem === 'camera' ? '#fileCamera' : '#fileGaleria').click();
    });
  },

  async processar(arquivo) {
    if (!arquivo || !arquivo.type.startsWith('image/')) return UI.toast('Escolha uma imagem.');
    let cancelado = false;
    const topo = UI.pilha.at(-1);
    const folha = topo ? $('.folha', topo.wrap) : UI.abrir({ titulo: 'Ler nota' });
    $('h2', folha).textContent = 'Lendo a nota…';
    $('.folha-corpo', folha).innerHTML = `<div class="progresso"><i></i></div><p class="progresso-txt" aria-live="polite">Preparando…</p>
      <div class="esqueleto" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <button type="button" class="btn bloco" data-acao="parar">Cancelar</button>`;
    const barra = $('.progresso i', folha), status = $('.progresso-txt', folha);
    $('[data-acao="parar"]', folha).addEventListener('click', async () => {
      cancelado = true;
      await OCR.cancelar();
      UI.fechar();
    });

    const etapas = {
      'loading tesseract core': 'Preparando o leitor (só na primeira vez)…',
      'initializing tesseract': 'Preparando o leitor…',
      'loading language traineddata': 'Carregando português…',
      'initializing api': 'Quase pronto…',
      'recognizing text': 'Reconhecendo o texto…',
    };
    try {
      const txt = await OCR.ler(arquivo, (m) => {
        if (etapas[m.status]) status.textContent = etapas[m.status];
        const base = m.status === 'recognizing text' ? 0.3 : 0;
        barra.style.width = `${Math.round((base + (m.progress || 0) * (m.status === 'recognizing text' ? 0.7 : 0.3)) * 100)}%`;
      });
      if (cancelado) return;
      const sugestao = Nota.extrair(txt);
      const url = URL.createObjectURL(arquivo);
      await UI.fechar();
      LancamentoForm.abrir(null, { tipo: 'despesa', pago: true, ...sugestao }, { url, texto: txt.trim() });
      if (!sugestao.valor && !sugestao.data) UI.toast('Não consegui ler bem a nota. Preencha o que faltar.');
    } catch (e) {
      if (cancelado) return;
      console.error(e);
      await OCR.cancelar();
      await UI.fechar();
      UI.toast(navigator.onLine ? 'Não foi possível ler a imagem. Tente outra foto.' : 'Conecte-se à internet uma vez para preparar o leitor de notas.');
    }
  },

  ligar() {
    ['#fileCamera', '#fileGaleria'].forEach((sel) => {
      $(sel).addEventListener('change', (e) => {
        const arquivo = e.target.files[0];
        e.target.value = '';
        if (arquivo) this.processar(arquivo);
      });
    });
  },
};

/* =========================================================
   SINCRONIZAÇÃO DA FAMÍLIA (arquivo JSON num repositório PRIVADO do GitHub)
   ========================================================= */
const Mescla = {
  /* Junta dois conjuntos de dados: vence a versão mais recente de cada registro. */
  juntar(a, b) {
    const removidos = { ...b.removidos };
    for (const [id, t] of Object.entries(a.removidos || {})) removidos[id] = Math.max(t, removidos[id] || 0);
    const limite = Date.now() - 180 * 864e5;
    for (const id of Object.keys(removidos)) if (removidos[id] < limite) delete removidos[id];
    const col = (nome) => {
      const mapa = new Map();
      for (const item of [...b[nome], ...a[nome]]) {
        const atual = mapa.get(item.id);
        if (!atual || item.atualizado > atual.atualizado) mapa.set(item.id, item);
      }
      return [...mapa.values()].filter((item) => !(removidos[item.id] >= item.atualizado));
    };
    return { eventos: col('eventos'), lancamentos: col('lancamentos'), removidos };
  },
  assinatura(d) {
    const ord = (lista) => [...lista].sort((x, y) => x.id.localeCompare(y.id));
    return JSON.stringify([ord(d.eventos), ord(d.lancamentos), Object.entries(d.removidos || {}).sort()]);
  },
};

const Sync = {
  CHAVE: 'familia.sync',
  ARQUIVO: 'dados.json',
  cfg: null,
  ultima: 0,
  rodando: false,
  pendente: false,
  timer: 0,

  carregar() {
    try { this.cfg = JSON.parse(localStorage.getItem(this.CHAVE) || 'null'); } catch { this.cfg = null; }
    this.ultima = Number(localStorage.getItem(this.CHAVE + '.ultima')) || 0;
  },
  salvarCfg(cfg) {
    this.cfg = cfg;
    localStorage.setItem(this.CHAVE, JSON.stringify(cfg));
  },
  desconectar() {
    this.cfg = null;
    localStorage.removeItem(this.CHAVE);
    localStorage.removeItem(this.CHAVE + '.ultima');
    this.ultima = 0;
    this.status('desligado');
  },

  api(caminho, opcoes = {}, cfg = this.cfg) {
    return fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.dono)}/${encodeURIComponent(cfg.repo)}${caminho}`, {
      cache: 'no-store',
      ...opcoes,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${cfg.token}`, ...(opcoes.headers || {}) },
    });
  },

  /* Confere token, acesso e — principalmente — se o repositório é privado. */
  async testar(cfg) {
    let r;
    try { r = await this.api('', {}, cfg); } catch { throw new Error('Sem conexão com o GitHub.'); }
    if (r.status === 401) throw new Error('Token inválido ou expirado.');
    if (r.status === 404 || r.status === 403) throw new Error('Repositório não encontrado ou sem acesso. Confira o nome e o token.');
    if (!r.ok) throw new Error(`O GitHub respondeu com erro ${r.status}.`);
    const info = await r.json();
    if (!info.private) throw new Error('Este repositório é PÚBLICO: qualquer pessoa veria os dados da família. Use um repositório privado.');
    if (info.permissions && !info.permissions.push) throw new Error('O token não tem permissão de escrita (Contents: Read and write).');
  },

  async ler() {
    const r = await this.api(`/contents/${this.ARQUIVO}`);
    if (r.status === 404) return { dados: null, sha: null };
    if (!r.ok) throw new Error(`Leitura falhou (${r.status})`);
    const j = await r.json();
    const dados = Modelo.pacote(JSON.parse(b64dec(j.content)));
    if (!dados) throw new Error('O arquivo da família está em formato inesperado.');
    return { dados, sha: j.sha };
  },

  async escrever(dados, sha) {
    const corpo = {
      message: `Família Power · ${new Date().toLocaleString('pt-BR')}`,
      content: b64enc(JSON.stringify({ app: 'familia-power', versao: 1, ...dados })),
    };
    if (sha) corpo.sha = sha;
    const r = await this.api(`/contents/${this.ARQUIVO}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    if (r.status === 409 || r.status === 422) return false; /* outro aparelho gravou antes: tenta de novo */
    if (!r.ok) throw new Error(`Gravação falhou (${r.status})`);
    return true;
  },

  async sincronizar(manual = false) {
    if (!this.cfg) return;
    if (this.rodando) { this.pendente = true; return; }
    if (!navigator.onLine) { this.status('offline'); if (manual) UI.toast('Sem internet. Tudo fica salvo no aparelho.'); return; }
    this.rodando = true;
    this.status('sincronizando');
    let ok = false;
    try {
      for (let tentativa = 0; tentativa < 3 && !ok; tentativa++) {
        const { dados: remoto, sha } = await this.ler();
        const base = remoto || { eventos: [], lancamentos: [], removidos: {} };
        const mesclado = Mescla.juntar(Store.dados, base);
        const assinatura = Mescla.assinatura(mesclado);
        if (assinatura !== Mescla.assinatura(Store.dados)) {
          Store.aplicarRemoto(mesclado);
          App.renderizar();
        }
        ok = (remoto && assinatura === Mescla.assinatura(remoto)) || await this.escrever(mesclado, sha);
      }
      if (!ok) throw new Error('Muitas alterações ao mesmo tempo. Tente de novo.');
      this.ultima = Date.now();
      localStorage.setItem(this.CHAVE + '.ultima', String(this.ultima));
      this.status('ok');
      if (manual) UI.toast('Família sincronizada');
    } catch (e) {
      console.error(e);
      this.status('erro');
      if (manual) UI.toast(e.message || 'Não foi possível sincronizar.');
    } finally {
      this.rodando = false;
      if (this.pendente) { this.pendente = false; this.agendar(400); }
    }
  },

  agendar(ms = 2000) {
    if (!this.cfg) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sincronizar(), ms);
  },

  rotuloUltima() {
    if (!this.ultima) return 'ainda não sincronizado';
    const d = new Date(this.ultima);
    const hora = `${Datas.pad(d.getHours())}:${Datas.pad(d.getMinutes())}`;
    return Datas.ymd(d) === Datas.hoje() ? `hoje às ${hora}` : `${Datas.br(Datas.ymd(d))} às ${hora}`;
  },

  status(estado) {
    const el = $('#syncStatus');
    if (!el) return;
    const textos = {
      ok: `Sincronizado ${this.rotuloUltima()}`,
      sincronizando: 'Sincronizando…',
      erro: 'Não sincronizou · toque em ⚙',
      offline: 'Sem internet · salvo no aparelho',
      desligado: '',
    };
    el.textContent = textos[estado] || '';
    el.dataset.estado = estado;
    el.hidden = !textos[estado];
  },

  iniciar() {
    this.carregar();
    if (this.cfg) { this.status('sincronizando'); this.sincronizar(); }
    setInterval(() => { if (!document.hidden) this.sincronizar(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sincronizar(); });
    window.addEventListener('online', () => this.sincronizar());
    window.addEventListener('offline', () => this.cfg && this.status('offline'));
    SyncUI.lerConvite();
  },
};

const SyncUI = {
  conectar() {
    const folha = UI.abrir({
      titulo: 'Conectar ao GitHub',
      corpo: `<form class="form" novalidate autocomplete="off">
        <p>Os dados da família ficam num repositório <b>privado</b> seu. O app recusa repositórios públicos.</p>
        ${UI.campo('Seu usuário do GitHub', '<input name="dono" autocapitalize="off" spellcheck="false" placeholder="ex.: cantodonico-coder" required>')}
        ${UI.campo('Repositório privado dos dados', '<input name="repo" value="familia-dados" autocapitalize="off" spellcheck="false" required>')}
        ${UI.campo('Token de acesso', '<input name="token" type="password" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" required><small>Token fine-grained com acesso só a esse repositório e permissão Contents: Read and write.</small>')}
        <div class="botoes"><span class="cresce"></span>
          <button type="button" class="btn" data-acao="cancelar">Cancelar</button>
          <button type="submit" class="btn prim">Conectar</button>
        </div>
      </form>`,
    });
    const form = $('form', folha);
    form.addEventListener('click', (e) => { if (e.target.closest('[data-acao="cancelar"]')) UI.fechar(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cfg = { dono: form.dono.value.trim(), repo: form.repo.value.trim(), token: form.token.value.trim() };
      if (!cfg.dono || !cfg.repo || !cfg.token) return UI.toast('Preencha os três campos.');
      const botao = $('button[type="submit"]', form);
      botao.disabled = true;
      botao.textContent = 'Conferindo…';
      try {
        await Sync.testar(cfg);
        Sync.salvarCfg(cfg);
        await UI.fecharTodas();
        await Sync.sincronizar(true);
      } catch (erro) {
        UI.toast(erro.message);
        botao.disabled = false;
        botao.textContent = 'Conectar';
      }
    });
  },

  /* O convite leva a configuração no "#" do link: essa parte não é enviada a nenhum servidor. */
  async convidar() {
    if (!Sync.cfg) return;
    const r = await UI.escolher({
      titulo: 'Convidar para a família',
      mensagem: 'O link dá acesso aos compromissos e às despesas da família. Envie só para quem mora com você.',
      opcoes: [{ id: 'sim', rotulo: 'Compartilhar link', estilo: 'prim' }],
    });
    if (!r) return;
    const link = `${location.origin}${location.pathname}#convite=${encodeURIComponent(b64enc(JSON.stringify(Sync.cfg)))}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Família Power', text: 'Entre na nossa família no Família Power:', url: link });
      else { await navigator.clipboard.writeText(link); UI.toast('Link copiado'); }
    } catch { /* compartilhamento cancelado */ }
  },

  async lerConvite() {
    const m = location.hash.match(/#convite=([^&]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    let cfg;
    try { cfg = JSON.parse(b64dec(decodeURIComponent(m[1]))); } catch { return UI.toast('Convite inválido.'); }
    if (!cfg || !cfg.dono || !cfg.repo || !cfg.token) return UI.toast('Convite inválido.');
    const r = await UI.escolher({
      titulo: 'Entrar na família?',
      mensagem: `Conectar este aparelho aos dados de <b>${esc(cfg.dono)}/${esc(cfg.repo)}</b>. O que já estiver aqui será juntado aos dados da família.`,
      opcoes: [{ id: 'sim', rotulo: 'Conectar', estilo: 'prim' }],
    });
    if (!r) return;
    try {
      await Sync.testar(cfg);
      Sync.salvarCfg(cfg);
      await Sync.sincronizar(true);
    } catch (erro) {
      UI.toast(erro.message);
    }
  },
};

/* =========================================================
   BACKUP E CONFIGURAÇÕES
   ========================================================= */
const Backup = {
  exportar() {
    const pacote = { app: 'familia', versao: 1, exportadoEm: new Date().toISOString(), ...Store.dados };
    baixarArquivo(JSON.stringify(pacote, null, 2), `familia-power-backup-${Datas.hoje()}.json`, 'application/json');
    UI.toast('Backup exportado');
  },

  async importar(arquivo) {
    let pacote;
    try { pacote = Modelo.pacote(JSON.parse(await arquivo.text())); } catch { pacote = null; }
    if (!pacote) return UI.toast('Este arquivo não é um backup do Família Power.');
    const r = await UI.escolher({
      titulo: 'Restaurar backup?',
      mensagem: `O arquivo tem ${pacote.eventos.length} compromisso(s) e ${pacote.lancamentos.length} lançamento(s). Os dados atuais deste aparelho serão substituídos.`,
      opcoes: [{ id: 'sim', rotulo: 'Restaurar', estilo: 'prim' }],
    });
    if (!r) return;
    Store.dados = pacote;
    if (!Store.salvar()) return;
    await UI.fecharTodas();
    App.renderizar();
    UI.toast('Dados restaurados');
  },

  async apagar() {
    const r = await UI.escolher({
      titulo: 'Apagar todos os dados?',
      mensagem: Sync.cfg
        ? 'Remove tudo deste aparelho e desconecta a sincronização. Os dados da família no GitHub não são apagados.'
        : 'Compromissos e lançamentos serão removidos deste aparelho. Isso não pode ser desfeito. Exporte um backup antes, se quiser guardar.',
      opcoes: [{ id: 'sim', rotulo: 'Apagar tudo', estilo: 'perigo-forte' }],
    });
    if (!r) return;
    Sync.desconectar();
    Store.dados = { eventos: [], lancamentos: [], removidos: {} };
    Store.salvar();
    localStorage.removeItem(Lembretes.CHAVE);
    await UI.fecharTodas();
    App.renderizar();
    UI.toast('Dados apagados');
  },
};

const Config = {
  instalar: null,

  abrir() {
    const { eventos, lancamentos } = Store.dados;
    const permissao = Lembretes.suportado ? Notification.permission : 'indisponivel';
    const avisos = {
      granted: '<small>Ativadas neste aparelho</small>',
      denied: '<small>Bloqueadas. Libere nas configurações do navegador.</small>',
      default: '<small>Toque para permitir</small>',
      indisponivel: '<small>Este navegador não oferece notificações</small>',
    }[permissao];

    const folha = UI.abrir({
      titulo: 'Configurações',
      corpo: `
        ${this.instalar ? `<div class="lista-opcoes"><button type="button" class="opcao" data-acao="instalar"><span><b>Instalar na tela inicial</b><small>Abre como um aplicativo</small></span></button></div>` : ''}
        <h3 class="grupo-tit">Aparência</h3>
        <div class="temas" role="group" aria-label="Tema de cores">${Object.entries(Tema.OPCOES).map(([id, t]) => `
          <button type="button" class="tema-op" data-tema-op="${id}" aria-pressed="${id === Tema.atual()}">
            <span class="amostra" aria-hidden="true">${t.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
            <b>${t.nome}</b><small>${t.desc}</small>
          </button>`).join('')}
        </div>
        <h3 class="grupo-tit">Família conectada</h3>
        <div class="lista-opcoes">${Sync.cfg ? `
          <button type="button" class="opcao" data-acao="sinc"><span><b>Sincronizar agora</b><small>${esc(Sync.cfg.dono)}/${esc(Sync.cfg.repo)} · ${Sync.rotuloUltima()}</small></span></button>
          <button type="button" class="opcao" data-acao="convite"><span><b>Convidar para a família</b><small>Link que conecta outro celular aos mesmos dados</small></span></button>
          <button type="button" class="opcao perigo" data-acao="desconectar"><span><b>Desconectar este aparelho</b><small>Os dados continuam aqui e no GitHub</small></span></button>` : `
          <button type="button" class="opcao" data-acao="conectar"><span><b>Conectar ao GitHub</b><small>Você e sua família veem e editam os mesmos dados</small></span></button>`}
        </div>
        <h3 class="grupo-tit">Backup</h3>
        <div class="lista-opcoes">
          <button type="button" class="opcao" data-acao="exportar"><span><b>Exportar dados</b><small>${eventos.length} compromisso(s) e ${lancamentos.length} lançamento(s) em um arquivo .json</small></span></button>
          <button type="button" class="opcao" data-acao="importar"><span><b>Importar dados</b><small>Restaura um arquivo exportado antes</small></span></button>
        </div>
        <h3 class="grupo-tit">Avisos</h3>
        <div class="lista-opcoes">
          <button type="button" class="opcao" data-acao="notificacoes"><span><b>Notificações</b>${avisos}</span></button>
        </div>
        <p class="rodape-nota" style="text-align:left">Os avisos aparecem enquanto o app estiver aberto ou em segundo plano. Para aviso garantido com o celular bloqueado, use “Salvar no calendário” no compromisso.</p>
        <h3 class="grupo-tit">Dados</h3>
        <div class="lista-opcoes">
          <button type="button" class="opcao perigo" data-acao="apagar"><span><b>Apagar dados</b><small>Remove tudo deste aparelho</small></span></button>
        </div>
        <p class="rodape-nota"><b>Família Power</b><br>Gestão de Compromissos e Despesas<br>${Sync.cfg ? 'Seus dados ficam neste aparelho e no seu repositório privado do GitHub.' : 'Seus dados ficam somente neste aparelho.'}</p>`,
    });

    folha.addEventListener('click', async (e) => {
      const tema = e.target.closest('[data-tema-op]');
      if (tema) {
        Tema.aplicar(tema.dataset.temaOp);
        $$('[data-tema-op]', folha).forEach((b) => b.setAttribute('aria-pressed', String(b === tema)));
        return;
      }
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'exportar') Backup.exportar();
      if (acao === 'importar') $('#fileBackup').click();
      if (acao === 'apagar') Backup.apagar();
      if (acao === 'conectar') { await UI.fechar(); SyncUI.conectar(); }
      if (acao === 'sinc') { await UI.fechar(); Sync.sincronizar(true); }
      if (acao === 'convite') SyncUI.convidar();
      if (acao === 'desconectar') {
        const r = await UI.escolher({ titulo: 'Desconectar este aparelho?', mensagem: 'Os dados continuam aqui e no GitHub. Para voltar, conecte de novo ou use um convite.', opcoes: [{ id: 'sim', rotulo: 'Desconectar', estilo: 'perigo-forte' }] });
        if (r) { Sync.desconectar(); await UI.fecharTodas(); UI.toast('Aparelho desconectado'); }
      }
      if (acao === 'notificacoes') {
        if (permissao === 'default') { await Lembretes.pedirPermissao(); await UI.fechar(); this.abrir(); }
        else if (permissao === 'granted') UI.toast('As notificações já estão ativadas.');
      }
      if (acao === 'instalar' && this.instalar) {
        this.instalar.prompt();
        await this.instalar.userChoice;
        this.instalar = null;
        UI.fechar();
      }
    });
  },

  ligar() {
    $('#btnConfig').addEventListener('click', () => this.abrir());
    $('#fileBackup').addEventListener('change', (e) => {
      const arquivo = e.target.files[0];
      e.target.value = '';
      if (arquivo) Backup.importar(arquivo);
    });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.instalar = e; });
    window.addEventListener('appinstalled', () => { this.instalar = null; UI.toast('App instalado'); });
  },
};

/* =========================================================
   EFEITOS: brilho sob o dedo, ondas, inclinação e profundidade
   ========================================================= */
const Efeitos = {
  LUZ: '.ev, .lc, .btn, .fab, .chip, .opcao, .cal-dia, .seg button, .btn-leve, .resumo, .tab, .seta, .icon-btn, .tipo span, .nota-previa',
  ONDA: '.btn, .fab, .chip, .opcao, .btn-leve, .tab, .seta, .icon-btn, .seg button, .cal-dia, .ev, .lc, .tipo span',
  INCLINA: '.resumo, .fab, .opcao, .nota-previa',
  movimento: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  raiz: document.documentElement,
  atual: null,

  /* Executa no próximo quadro, uma vez por quadro por canal. */
  quadros: {},
  noQuadro(canal, fn) {
    this.quadros[canal] = fn;
    if (this.quadros[canal + ':id']) return;
    this.quadros[canal + ':id'] = requestAnimationFrame(() => {
      this.quadros[canal + ':id'] = 0;
      this.quadros[canal]();
    });
  },

  posicionar(el, x, y) {
    const r = el.getBoundingClientRect();
    const px = x - r.left, py = y - r.top;
    el.style.setProperty('--mx', `${px}px`);
    el.style.setProperty('--my', `${py}px`);
    if (this.movimento && el.matches(this.INCLINA)) {
      el.style.setProperty('--ry', `${((px / r.width - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py / r.height) * 9).toFixed(2)}deg`);
    }
  },

  avisar(el) { document.dispatchEvent(new CustomEvent('luz', { detail: el })); },

  acender(el) {
    if (this.atual === el) return;
    if (this.atual) this.apagar(this.atual);
    this.atual = el;
    if (el) { el.classList.add('acesa'); this.avisar(el); }
  },

  apagar(el) {
    el.classList.remove('acesa');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
    if (this.atual === el) { this.atual = null; this.avisar(null); }
  },

  onda(el, x, y) {
    const r = el.getBoundingClientRect();
    const tam = Math.max(r.width, r.height) * 2;
    const o = document.createElement('span');
    o.className = 'onda';
    o.style.cssText = `width:${tam}px;height:${tam}px;left:${x - r.left - tam / 2}px;top:${y - r.top - tam / 2}px`;
    o.addEventListener('animationend', () => o.remove());
    el.appendChild(o);
  },

  profundidade(nx, ny) {
    this.raiz.style.setProperty('--px', nx.toFixed(3));
    this.raiz.style.setProperty('--py', ny.toFixed(3));
  },

  ligar() {
    document.addEventListener('pointerdown', (e) => {
      this.pressionado = e.pointerType !== 'mouse';
      const el = e.target.closest(this.LUZ);
      this.acender(el);
      if (el) this.posicionar(el, e.clientX, e.clientY);
      const alvo = this.movimento && e.target.closest(this.ONDA);
      if (alvo) this.onda(alvo, e.clientX, e.clientY);
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      const { clientX: x, clientY: y, pointerType } = e;
      const mouse = pointerType === 'mouse';
      if (!mouse && !this.pressionado) return;
      this.noQuadro('dedo', () => {
        if (this.movimento) this.profundidade(x / innerWidth * 2 - 1, y / innerHeight * 2 - 1);
        /* O dedo passando por cima acende cada caixa, como o mouse. */
        const sobre = document.elementFromPoint(x, y)?.closest(this.LUZ) || null;
        if (sobre !== this.atual && (mouse || sobre)) {
          this.acender(sobre);
          if (!mouse && sobre && sobre.closest('.cal')) { try { navigator.vibrate?.(5); } catch { /* ignora */ } }
        }
        if (this.atual) this.posicionar(this.atual, x, y);
      });
    }, { passive: true });

    const soltar = (e) => {
      this.pressionado = false;
      if (e.pointerType === 'mouse' || !this.atual) return;
      const el = this.atual;
      setTimeout(() => this.apagar(el), 220);
    };
    document.addEventListener('pointerup', soltar, { passive: true });
    document.addEventListener('pointercancel', soltar, { passive: true });
    document.addEventListener('pointerleave', () => this.atual && this.apagar(this.atual));

    addEventListener('scroll', () => this.noQuadro('rolagem', () => {
      this.raiz.style.setProperty('--sy', String(Math.round(scrollY)));
      document.body.classList.toggle('rolado', scrollY > 6);
    }), { passive: true });

    /* Inclinar o celular move o fundo, dando sensação de profundidade. */
    if (this.movimento) {
      addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null) return;
        const nx = Math.max(-1, Math.min(1, e.gamma / 30));
        const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
        this.noQuadro('giro', () => this.profundidade(nx, ny));
      }, { passive: true });
    }
  },
};

/* =========================================================
   NAVEGAÇÃO E INICIALIZAÇÃO
   ========================================================= */
const Nav = {
  ir(aba) {
    ui.aba = aba;
    Prefs.salvar();
    $('#view-agenda').classList.toggle('ativa', aba === 'agenda');
    $('#view-fin').classList.toggle('ativa', aba === 'fin');
    $('#fabAgenda').hidden = aba !== 'agenda';
    $('#fabFin').hidden = aba !== 'fin';
    $$('.tab').forEach((t) => (t.dataset.tab === aba ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
    window.scrollTo(0, 0);
    const view = $(aba === 'agenda' ? '#view-agenda' : '#view-fin');
    view.classList.add('entrando');
    clearTimeout(this._entrada);
    this._entrada = setTimeout(() => view.classList.remove('entrando'), 900);
    if (aba === 'agenda') AgendaUI.render(); else FinUI.render();
  },
  ligar() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab !== ui.aba) this.ir(t.dataset.tab); }));
  },
};

const App = {
  dia: '',

  /* Limite de erro: se uma área falhar, só ela mostra o aviso; o resto do app segue. */
  seguro(fn, alvo) {
    try {
      return fn();
    } catch (e) {
      console.error(e);
      const el = $(alvo);
      if (el) el.innerHTML = `<div class="erro-area" role="alert"><strong>Algo não carregou aqui</strong><p>Seus dados continuam salvos.</p><button type="button" class="btn prim" onclick="location.reload()">Recarregar</button></div>`;
    }
  },

  protegerRenders() {
    [[AgendaUI, '#agendaConteudo'], [FinUI, '#finLista']].forEach(([obj, alvo]) => {
      const original = obj.render;
      obj.render = (...args) => this.seguro(() => original.apply(obj, args), alvo);
    });
    let ultimo = 0;
    const avisar = (e) => {
      console.error(e.error || e.reason || e);
      if (Date.now() - ultimo < 5000) return;
      ultimo = Date.now();
      UI.toast('Algo deu errado. Seus dados continuam salvos.');
    };
    window.addEventListener('error', avisar);
    window.addEventListener('unhandledrejection', avisar);
  },

  rotuloHoje() {
    const hoje = new Date();
    $('#hojeLabel').textContent = `${Datas.SEMANA[hoje.getDay()]}, ${hoje.getDate()} de ${Datas.MESES[hoje.getMonth()]}`;
  },

  renderizar() {
    this.rotuloHoje();
    if (ui.aba === 'agenda') AgendaUI.render(); else FinUI.render();
  },

  /* Atualiza a tela quando o dia vira com o app aberto. */
  vigiarDia() {
    this.dia = Datas.hoje();
    setInterval(() => {
      if (Datas.hoje() === this.dia) return;
      this.dia = Datas.hoje();
      ui.semanaRef = this.dia;
      if (!UI.pilha.length) this.renderizar();
    }, 60000);
  },

  iniciar() {
    Tema.aplicar(Tema.atual(), false);
    this.protegerRenders();
    Store.carregar();
    Prefs.carregar();
    if (history.state && history.state.folha) history.replaceState(null, '');
    window.addEventListener('popstate', () => UI.sincronizar());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.pilha.length) UI.fechar(); });

    Efeitos.ligar();
    AgendaUI.ligar();
    FinUI.ligar();
    Leitura.ligar();
    Config.ligar();
    Nav.ligar();
    this.rotuloHoje();
    Nav.ir(ui.aba);
    Lembretes.iniciar();
    this.vigiarDia();
    Sync.iniciar();
    if (Store.falhou) UI.toast('Não consegui ler os dados salvos. Uma cópia foi guardada; restaure um backup em ⚙.');

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      /* Quando uma versão nova assume, recarrega uma vez para mostrá-la. */
      const tinhaVersao = !!navigator.serviceWorker.controller;
      let recarregou = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!tinhaVersao || recarregou || UI.pilha.length) return;
        recarregou = true;
        location.reload();
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update())
        .catch((e) => console.warn('Service worker não registrado', e));
    }
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  },
};

App.iniciar();
