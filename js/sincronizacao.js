'use strict';

/* Família Power · Sincronização da família pelo GitHub
   Desenvolvido por Nicosheik Labs · © 2026 */

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
      for (const item of [...(b[nome] || []), ...(a[nome] || [])]) {
        const atual = mapa.get(item.id);
        if (!atual || item.atualizado > atual.atualizado) mapa.set(item.id, item);
      }
      return [...mapa.values()].filter((item) => !(removidos[item.id] >= item.atualizado));
    };
    const saida = { removidos };
    COLECOES.forEach((c) => { saida[c] = col(c); });
    return saida;
  },
  assinatura(d) {
    const ord = (lista) => [...lista].sort((x, y) => x.id.localeCompare(y.id));
    return JSON.stringify([...COLECOES.map((c) => ord(d[c] || [])), Object.entries(d.removidos || {}).sort()]);
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
    /* Quando o GitHub informa a validade do token, ela é guardada para avisar antes de vencer. */
    const venc = r.headers.get('github-authentication-token-expiration');
    if (venc && !cfg.validade) { const d = new Date(venc.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2')); if (!isNaN(d)) cfg.validade = Datas.ymd(d); }
    if (r.status === 401) throw new Error('Token inválido ou expirado.');
    if (r.status === 404 || r.status === 403) throw new Error('Repositório não encontrado ou sem acesso. Confira o nome e o token.');
    if (!r.ok) throw new Error(`O GitHub respondeu com erro ${r.status}.`);
    const info = await r.json();
    if (!info.private) throw new Error('Este repositório é PÚBLICO: qualquer pessoa veria os dados da família. Use um repositório privado.');
    if (info.permissions && !info.permissions.push) throw new Error('O token não tem permissão de escrita (Contents: Read and write).');
  },

  async ler() {
    const r = await this.api(`/contents/${this.ARQUIVO}`);
    if (r.status === 401) { this.tokenVencido = true; throw new Error('O token do GitHub venceu ou foi apagado. Troque em ⚙ → Trocar token.'); }
    this.tokenVencido = false;
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
        const base = remoto || { eventos: [], lancamentos: [], compras: [], cardapio: [], pratos: [], fixas: [], dispositivos: [], removidos: {} };
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

  /* Histórico: cada sincronização vira uma versão no GitHub. */
  async versoes() {
    const r = await this.api(`/commits?path=${this.ARQUIVO}&per_page=30`);
    if (!r.ok) throw new Error(`Não consegui listar as versões (${r.status}).`);
    return (await r.json()).map((c) => ({ sha: c.sha, data: new Date(c.commit.committer?.date || c.commit.author?.date) }));
  },
  async lerVersao(sha) {
    const r = await this.api(`/contents/${this.ARQUIVO}?ref=${encodeURIComponent(sha)}`);
    if (!r.ok) throw new Error(`Não consegui abrir essa versão (${r.status}).`);
    const dados = Modelo.pacote(JSON.parse(b64dec((await r.json()).content)));
    if (!dados) throw new Error('Versão em formato inesperado.');
    return dados;
  },
  /* Volta tudo a como estava na versão escolhida (e isso também vira uma nova versão). */
  restaurar(antigo) {
    const agora = Date.now();
    const novo = { removidos: { ...Store.dados.removidos } };
    for (const col of COLECOES) {
      const ids = new Set(antigo[col].map((x) => x.id));
      Store.dados[col].forEach((x) => { if (!ids.has(x.id)) novo.removidos[x.id] = agora; });
      novo[col] = antigo[col].map((x) => ({ ...x, atualizado: agora }));
    }
    for (const col of COLECOES) novo[col].forEach((x) => { if (novo.removidos[x.id] < agora) delete novo.removidos[x.id]; });
    Store.dados = novo;
    Store.salvar();
  },

  diasParaVencer() {
    if (!this.cfg || !this.cfg.validade) return null;
    return Datas.diff(Datas.hoje(), this.cfg.validade);
  },
  avisarValidade() {
    const dias = this.diasParaVencer();
    if (dias === null || dias > 7) return;
    const chave = this.CHAVE + '.avisoToken';
    if (localStorage.getItem(chave) === Datas.hoje()) return;
    localStorage.setItem(chave, Datas.hoje());
    UI.toast(dias < 0 ? 'O token do GitHub venceu. ⚙ → Trocar token.' : `O token do GitHub vence ${dias === 0 ? 'hoje' : `em ${dias} dia${dias > 1 ? 's' : ''}`}. ⚙ → Trocar token.`);
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
      erro: this.tokenVencido ? 'Token do GitHub venceu · toque em ⚙' : 'Não sincronizou · toque em ⚙',
      offline: 'Sem internet · salvo no aparelho',
      desligado: '',
    };
    el.textContent = textos[estado] || '';
    el.dataset.estado = estado;
    el.hidden = !textos[estado];
  },

  iniciar() {
    this.carregar();
    if (this.cfg) { this.status('sincronizando'); this.sincronizar(); setTimeout(() => this.avisarValidade(), 3000); }
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
        ${UI.campo('Seu nome', `<input name="eu" value="${esc(Perfil.nome)}" maxlength="40" placeholder="Como a família te chama" required><small>Aparece como “por Nome” no que você registrar.</small>`)}
        ${UI.campo('Seu usuário do GitHub', '<input name="dono" autocapitalize="off" spellcheck="false" placeholder="ex.: cantodonico-coder" required>')}
        ${UI.campo('Repositório privado dos dados', '<input name="repo" value="familia-dados" autocapitalize="off" spellcheck="false" required>')}
        ${UI.campo('Token de acesso', '<input name="token" type="password" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" required><small>Token fine-grained com acesso só a esse repositório e permissão Contents: Read and write.</small>')}
        ${UI.campo('Validade do token (opcional)', '<input name="validade" type="date"><small>O app avisa uma semana antes de vencer.</small>')}
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
      const cfg = { dono: form.dono.value.trim(), repo: form.repo.value.trim(), token: form.token.value.trim(), validade: Datas.valida(form.validade.value) ? form.validade.value : '' };
      if (!form.eu.value.trim() || !cfg.dono || !cfg.repo || !cfg.token) return UI.toast('Preencha seu nome, usuário, repositório e token.');
      Perfil.nome = form.eu.value.trim();
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

  trocarToken() {
    const folha = UI.abrir({
      titulo: 'Trocar token',
      corpo: `<form class="form" novalidate autocomplete="off">
        <p>Gere um token novo no GitHub (mesmo repositório, Contents: Read and write) e cole aqui.</p>
        ${UI.campo('Token novo', '<input name="token" type="password" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" required>')}
        ${UI.campo('Validade (opcional)', '<input name="validade" type="date">')}
        <div class="botoes"><span class="cresce"></span><button type="button" class="btn" data-acao="cancelar">Cancelar</button><button type="submit" class="btn prim">Salvar</button></div>
      </form>`,
    });
    const form = $('form', folha);
    form.addEventListener('click', (e) => { if (e.target.closest('[data-acao="cancelar"]')) UI.fechar(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cfg = { ...Sync.cfg, token: form.token.value.trim(), validade: Datas.valida(form.validade.value) ? form.validade.value : '' };
      if (!cfg.token) return UI.toast('Cole o token novo.');
      try {
        await Sync.testar(cfg);
        Sync.salvarCfg(cfg);
        await UI.fecharTodas();
        await Sync.sincronizar(true);
        UI.toast('Token trocado. Envie um convite novo aos outros celulares.');
      } catch (erro) { UI.toast(erro.message); }
    });
  },

  async versoes() {
    const folha = UI.abrir({ titulo: 'Versões anteriores', corpo: '<p>Buscando no GitHub…</p><div class="esqueleto"><i></i><i></i><i></i></div>' });
    const corpo = $('.folha-corpo', folha);
    let lista;
    try { lista = await Sync.versoes(); } catch (e) { corpo.innerHTML = `<p>${esc(e.message)}</p>`; return; }
    const rotulo = (d) => `${Datas.SEMANA[d.getDay()].slice(0, 3)}, ${Datas.br(Datas.ymd(d))} às ${Datas.pad(d.getHours())}:${Datas.pad(d.getMinutes())}`;
    corpo.innerHTML = `<p>Escolha como os dados estavam num momento. Tudo volta a ser assim nos celulares da família — e dá para desfazer escolhendo uma versão mais nova.</p>
      <div class="lista-opcoes">${lista.map((v, i) => `<button type="button" class="opcao" data-sha="${esc(v.sha)}" data-rotulo="${rotulo(v.data)}"><span><b>${rotulo(v.data)}</b><small>${i === 0 ? 'Versão atual' : `Versão ${lista.length - i}`}</small></span></button>`).join('')}</div>`;
    corpo.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sha]');
      if (!b) return;
      const r = await UI.escolher({ titulo: 'Restaurar esta versão?', mensagem: `Os dados voltam a ser como estavam em <b>${b.dataset.rotulo}</b>.`, opcoes: [{ id: 'sim', rotulo: 'Restaurar', estilo: 'prim' }] });
      if (!r) return;
      try {
        const antigo = await Sync.lerVersao(b.dataset.sha);
        Sync.restaurar(antigo);
        await UI.fecharTodas();
        App.renderizar();
        await Sync.sincronizar();
        UI.toast(`Dados restaurados de ${b.dataset.rotulo}`);
      } catch (erro) { UI.toast(erro.message); }
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
    const nome = await new Promise((resolve) => {
      let valor = null;
      const folha = UI.abrir({
        titulo: 'Entrar na família?',
        corpo: `<form class="form" novalidate><p>Conectar este aparelho aos dados de <b>${esc(cfg.dono)}/${esc(cfg.repo)}</b>. O que já estiver aqui será juntado aos dados da família.</p>
          ${UI.campo('Seu nome', `<input name="eu" value="${esc(Perfil.nome)}" maxlength="40" placeholder="Como a família te chama" required>`)}
          <button type="submit" class="btn prim bloco">Conectar</button></form>`,
        aoFechar: () => resolve(valor),
      });
      $('form', folha).addEventListener('submit', (e) => {
        e.preventDefault();
        const v = e.target.eu.value.trim();
        if (!v) return UI.toast('Escreva seu nome.');
        valor = v;
        UI.fechar();
      });
    });
    if (!nome) return;
    Perfil.nome = nome;
    try {
      await Sync.testar(cfg);
      Sync.salvarCfg(cfg);
      await Sync.sincronizar(true);
    } catch (erro) {
      UI.toast(erro.message);
    }
  },
};
