'use strict';

/* Família Power · Navegação e inicialização (carregar por último)
   Desenvolvido por Nicosheik Labs · © 2026 */

/* =========================================================
   NAVEGAÇÃO E INICIALIZAÇÃO
   ========================================================= */
const Nav = {
  ir(aba) {
    ui.aba = aba;
    Prefs.salvar();
    $('#view-agenda').classList.toggle('ativa', aba === 'agenda');
    $('#view-fin').classList.toggle('ativa', aba === 'fin');
    $('#view-coz').classList.toggle('ativa', aba === 'coz');
    $('#fabAgenda').hidden = aba !== 'agenda';
    $('#fabFin').hidden = aba !== 'fin';
    $$('.tab').forEach((t) => (t.dataset.tab === aba ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
    window.scrollTo(0, 0);
    const view = $(`#view-${aba}`);
    view.classList.add('entrando');
    clearTimeout(this._entrada);
    this._entrada = setTimeout(() => view.classList.remove('entrando'), 900);
    App.renderAba();
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
    [[AgendaUI, '#agendaConteudo'], [FinUI, '#finLista'], [CozinhaUI, '#cozConteudo']].forEach(([obj, alvo]) => {
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

  renderAba() {
    Fixas.gerar();
    ({ agenda: AgendaUI, fin: FinUI, coz: CozinhaUI })[ui.aba].render();
  },

  renderizar() {
    this.rotuloHoje();
    this.renderAba();
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

  /* Atalhos do ícone (segurar o ícone) e fotos compartilhadas da galeria. */
  async atalho() {
    const acao = new URLSearchParams(location.search).get('acao');
    if (!acao) return;
    history.replaceState(null, '', location.pathname);
    if (acao === 'gasto') { Nav.ir('fin'); LancamentoForm.abrir(); }
    if (acao === 'nota') { Nav.ir('fin'); Leitura.iniciar(); }
    if (acao === 'compras') { ui.cozModo = 'lista'; Nav.ir('coz'); setTimeout(() => $('#novoItem')?.focus(), 300); }
    if (acao === 'nota-compartilhada') {
      Nav.ir('fin');
      try {
        const cache = await caches.open('familia-compartilhado');
        const resp = await cache.match('imagem');
        await cache.delete('imagem');
        if (!resp) return UI.toast('Não recebi a imagem. Tente compartilhar de novo.');
        const blob = await resp.blob();
        Leitura.processar(new File([blob], 'nota.jpg', { type: blob.type || 'image/jpeg' }));
      } catch {
        UI.toast('Não recebi a imagem. Tente compartilhar de novo.');
      }
    }
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
    CozinhaUI.ligar();
    Leitura.ligar();
    Config.ligar();
    Nav.ligar();
    this.rotuloHoje();
    Nav.ir(ui.aba);
    Lembretes.iniciar();
    this.vigiarDia();
    Sync.iniciar();
    Bloqueio.vigiar();
    (Bloqueio.ativo() ? Bloqueio.mostrar() : Promise.resolve()).then(() => this.atalho());
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
    /* Altura real do topo, para a barra "Adicionar item" grudar logo abaixo dele. */
    if ('ResizeObserver' in window) {
      new ResizeObserver(([e]) => document.documentElement.style.setProperty('--topo-h', `${e.target.offsetHeight}px`)).observe($('.topbar'));
    }
  },
};

App.iniciar();
