'use strict';

/* Família Power · Bloqueio com PIN */

/* =========================================================
   BLOQUEIO COM PIN (só neste aparelho)
   Protege contra acesso casual; os dados não são criptografados.
   ========================================================= */
const Bloqueio = {
  CHAVE: 'familia.pin',
  TEMPO_FORA: 5 * 60 * 1000,
  saiuEm: 0,
  aberto: false,

  ativo() { try { return !!JSON.parse(localStorage.getItem(this.CHAVE) || 'null')?.hash; } catch { return false; } },
  dados() { return JSON.parse(localStorage.getItem(this.CHAVE)); },

  async resumo(pin, sal) {
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}:${pin}`));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return hashTexto(`${sal}:${pin}:${sal}`);
  },
  async definir(pin) {
    const sal = uid();
    localStorage.setItem(this.CHAVE, JSON.stringify({ sal, tam: pin.length, hash: await this.resumo(pin, sal) }));
  },
  async confere(pin) {
    const d = this.dados();
    return (await this.resumo(pin, d.sal)) === d.hash;
  },
  remover() {
    localStorage.removeItem(this.CHAVE);
    document.documentElement.classList.remove('bloqueado');
  },

  /* Tela de bloqueio com teclado numérico. Resolve quando o PIN certo é digitado. */
  mostrar() {
    if (this.aberto) return Promise.resolve();
    this.aberto = true;
    document.documentElement.classList.add('bloqueado');
    const tam = this.dados().tam || 4;
    let pin = '', erros = 0, esperaAte = 0;
    const tela = document.createElement('div');
    tela.id = 'tela-bloqueio';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-label', 'Digite o PIN');
    const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'esqueci', '0', 'apagar'];
    tela.innerHTML = `<div class="bloq-caixa">
        <h1 class="brand">Família <span>Power</span></h1>
        <p class="bloq-msg" aria-live="polite">Digite seu PIN</p>
        <div class="bloq-pontos" aria-hidden="true">${'<i></i>'.repeat(tam)}</div>
        <div class="bloq-teclado">${teclas.map((t) => t === 'esqueci'
          ? '<button type="button" class="bloq-texto" data-t="esqueci">Esqueci</button>'
          : t === 'apagar' ? '<button type="button" class="bloq-texto" data-t="apagar" aria-label="Apagar">⌫</button>'
          : `<button type="button" data-t="${t}">${t}</button>`).join('')}</div>
      </div>`;
    document.body.appendChild(tela);
    const msg = $('.bloq-msg', tela), pontos = $$('.bloq-pontos i', tela);
    const desenhar = () => pontos.forEach((p, i) => p.classList.toggle('cheio', i < pin.length));

    return new Promise((resolve) => {
      const tentar = async () => {
        if (await this.confere(pin)) {
          tela.classList.add('saindo');
          setTimeout(() => tela.remove(), 300);
          document.documentElement.classList.remove('bloqueado');
          document.removeEventListener('keydown', teclado);
          this.aberto = false;
          return resolve();
        }
        erros++;
        pin = '';
        desenhar();
        tela.querySelector('.bloq-pontos').classList.remove('erro');
        void tela.offsetWidth;
        tela.querySelector('.bloq-pontos').classList.add('erro');
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        if (erros >= 5) {
          esperaAte = Date.now() + 30000;
          msg.textContent = 'Muitas tentativas. Aguarde 30 segundos.';
          setTimeout(() => { if (Date.now() >= esperaAte) msg.textContent = 'Digite seu PIN'; }, 30000);
          erros = 0;
        } else msg.textContent = 'PIN incorreto';
      };
      const tecla = (t) => {
        if (Date.now() < esperaAte) return;
        if (t === 'apagar') { pin = pin.slice(0, -1); return desenhar(); }
        if (t === 'esqueci') return this.esqueci(tela);
        if (!/^\d$/.test(t) || pin.length >= tam) return;
        pin += t;
        desenhar();
        if (pin.length === tam) setTimeout(tentar, 120);
      };
      const teclado = (e) => {
        if (/^\d$/.test(e.key)) tecla(e.key);
        if (e.key === 'Backspace') tecla('apagar');
      };
      tela.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) tecla(b.dataset.t); });
      document.addEventListener('keydown', teclado);
    });
  },

  esqueci(tela) {
    const caixa = $('.bloq-caixa', tela);
    if ($('.bloq-esqueci', caixa)) return;
    const painel = document.createElement('div');
    painel.className = 'bloq-esqueci';
    painel.innerHTML = `<h2>Esqueceu o PIN?</h2>
      <p>Para tirar o PIN, os dados <b>deste aparelho</b> são apagados.${Sync.cfg ? ' Como ele está conectado à família, é só conectar de novo com um convite para recuperar tudo.' : ' Se tiver um backup, dá para restaurar depois.'}</p>
      <button type="button" class="btn perigo-forte bloco" data-r="apagar">Apagar dados e tirar o PIN</button>
      <button type="button" class="btn bloco" data-r="voltar">Voltar</button>`;
    caixa.appendChild(painel);
    caixa.classList.add('modo-esqueci');
    painel.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (r === 'voltar') { painel.remove(); caixa.classList.remove('modo-esqueci'); }
      if (r === 'apagar') {
        [Store.CHAVE, Sync.CHAVE, Sync.CHAVE + '.ultima', this.CHAVE, Lembretes.CHAVE].forEach((k) => localStorage.removeItem(k));
        location.reload();
      }
    });
  },

  /* Pede o PIN atual antes de trocar ou desativar. */
  async confirmarAtual() {
    return new Promise((resolve) => {
      let ok = false;
      const folha = UI.abrir({
        titulo: 'Confirme o PIN atual',
        corpo: `<form class="form" novalidate>${UI.campo('PIN atual', '<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
          <button type="submit" class="btn prim bloco">Continuar</button></form>`,
        aoFechar: () => resolve(ok),
      });
      const form = $('form', folha);
      setTimeout(() => form.pin.focus(), 300);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await this.confere(form.pin.value)) { ok = true; UI.fechar(); }
        else { form.pin.value = ''; form.pin.closest('.campo').classList.add('erro'); UI.toast('PIN incorreto'); }
      });
    });
  },

  configurar() {
    const folha = UI.abrir({
      titulo: 'Criar PIN',
      corpo: `<form class="form" novalidate>
        <p>O PIN é pedido ao abrir o app e quando ele fica mais de 5 minutos fechado. Vale só para este aparelho.</p>
        ${UI.campo('Novo PIN (4 a 6 números)', '<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
        ${UI.campo('Repita o PIN', '<input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
        <div class="botoes"><span class="cresce"></span><button type="button" class="btn" data-acao="cancelar">Cancelar</button><button type="submit" class="btn prim">Salvar PIN</button></div>
      </form>`,
    });
    const form = $('form', folha);
    setTimeout(() => form.pin.focus(), 300);
    form.addEventListener('click', (e) => { if (e.target.closest('[data-acao="cancelar"]')) UI.fechar(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = form.pin.value;
      if (!/^\d{4,6}$/.test(pin)) return UI.toast('Use de 4 a 6 números.');
      if (pin !== form.pin2.value) return UI.toast('Os dois PINs não são iguais.');
      await this.definir(pin);
      await UI.fechar();
      UI.toast('PIN ativado');
    });
  },

  vigiar() {
    document.addEventListener('visibilitychange', () => {
      if (!this.ativo()) return;
      if (document.hidden) { this.saiuEm = Date.now(); return; }
      if (this.saiuEm && Date.now() - this.saiuEm > this.TEMPO_FORA) this.mostrar();
    });
  },
};
