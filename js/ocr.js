'use strict';

/* Família Power · Leitura de notas (OCR local)
   Desenvolvido por Nicosheik Labs · © 2026 */

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
      LancamentoForm.abrir(null, { sugestao: { tipo: 'despesa', pago: true, ...sugestao }, nota: { url, texto: txt.trim() }, marcarLidos: true });
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
