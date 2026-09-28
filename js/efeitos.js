'use strict';

/* Família Power · Efeitos de toque */

/* =========================================================
   EFEITOS: brilho sob o dedo, ondas, inclinação e profundidade
   ========================================================= */
const Efeitos = {
  LUZ: '.ev, .lc, .cp, .alm, .prato, .btn, .fab, .chip, .opcao, .cal-dia, .seg button, .btn-leve, .resumo, .tab, .seta, .icon-btn, .tipo span, .nota-previa',
  ONDA: '.cp, .alm, .prato, .btn, .fab, .chip, .opcao, .btn-leve, .tab, .seta, .icon-btn, .seg button, .cal-dia, .ev, .lc, .tipo span',
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
