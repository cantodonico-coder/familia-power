'use strict';

/* Família Power · Cozinha: lista de compras e cardápio (almoço e jantar) */

/* =========================================================
   COZINHA: lista de compras e almoços da semana
   ========================================================= */
const Cozinha = {
  SETORES: {
    'Hortifrúti': '#059669',
    'Açougue e peixaria': '#DC2626',
    'Frios e laticínios': '#0284C7',
    'Mercearia': '#D97706',
    'Padaria': '#B45309',
    'Bebidas': '#4F46E5',
    'Limpeza': '#0891B2',
    'Higiene': '#DB2777',
    'Outros': '#6B7280',
  },
  /* A ordem importa: termos mais específicos primeiro ("farinha de mandioca" é mercearia). */
  REGRAS: [
    ['Limpeza', /sab[aã]o|detergente|amaciante|desinfetante|[aá]gua sanit|esponja|papel toalha|saco de lixo|limpador|multiuso|alvejante/],
    ['Higiene', /papel higi|shampoo|xampu|condicionador|sabonete|pasta de dente|creme dental|escova de dente|desodorante|fralda|absorvente|len[cç]o umedecido|fio dental/],
    ['Mercearia', /farinha|leite de coco|creme de leite|leite condensado|batata palha|molho|extrato|arroz|feij[aã]o|macarr|espaguete|massa|lasanha|a[cç][uú]car|\bsal\b|[oó]leo|azeite|vinagre|milho|ervilha|gr[aã]o|shoyu|amendoim|caf[eé]|maionese|ketchup|mostarda|a[cç]afr[aã]o|trigo|aveia|biscoito|bolacha|achocolatado|gelatina|fermento|tempero|caldo|atum|sardinha em lata|polenta|fub[aá]|champignon|azeitona/],
    ['Açougue e peixaria', /carne|bife|frango|coxa|sobrecoxa|peito|patinho|ac[eé]m|maminha|picanha|costela|lingui[cç]a|bisteca|lombo|costelinha|charque|bacon|peixe|til[aá]pia|sardinha|salm[aã]o|file|fil[eé]|hamb[uú]rguer|salsicha|almôndega/],
    ['Frios e laticínios', /queijo|presunto|mu[cç]arela|mussarela|leite|manteiga|margarina|iogurte|requeij[aã]o|ovo|nhoque|mortadela|peito de peru|nata/],
    ['Hortifrúti', /alface|tomate|cebola|alho|batata|cenoura|abobrinha|br[oó]colis|couve|lim[aã]o|laranja|piment[aã]o|chuchu|aipim|mandioca|banana|ma[cç][aã]|hortel[aã]|salsinha|cheiro|coentro|r[uú]cula|repolho|beterraba|ab[oó]bora|pepino|mam[aã]o|uva|morango|abacaxi|melancia|manga|berinjela|vagem|espinafre|gengibre|cebolinha|fruta|verdura|legume/],
    ['Padaria', /\bp[aã]o|bolo|cuca|torrada|sonho|croissant/],
    ['Bebidas', /suco|refrigerante|cerveja|vinho|[aá]gua|ch[aá]\b|energ[eé]tico|espumante/],
  ],
  TAGS: {
    carne: ['Carne', '#DC2626'], frango: ['Frango', '#D97706'], peixe: ['Peixe', '#0284C7'],
    porco: ['Porco', '#DB2777'], vegetariano: ['Vegetariano', '#059669'], massa: ['Massa', '#7C3AED'], outro: ['Outro', '#6B7280'],
  },
  BANCO: [
    ['Arroz, feijão, bife acebolado e salada', 'carne', 'arroz, feijão, bife, cebola, alface, tomate'],
    ['Frango grelhado com legumes', 'frango', 'peito de frango, abobrinha, cenoura, brócolis, arroz'],
    ['Strogonoff de frango', 'frango', 'peito de frango, creme de leite, molho de tomate, champignon, arroz, batata palha'],
    ['Carne de panela com batata', 'carne', 'acém, batata, cenoura, cebola, arroz'],
    ['Espaguete à bolonhesa', 'massa', 'espaguete, carne moída, molho de tomate, cebola, queijo ralado'],
    ['Peixe assado com batatas', 'peixe', 'filé de peixe, batata, limão, cebola, arroz'],
    ['Feijoada simples', 'porco', 'feijão preto, linguiça calabresa, costelinha de porco, couve, laranja, arroz, farinha de mandioca', 'a'],
    ['Omelete com arroz e salada', 'vegetariano', 'ovos, tomate, queijo, alface, arroz'],
    ['Escondidinho de carne moída', 'carne', 'carne moída, aipim, queijo muçarela, leite, cebola'],
    ['Frango assado com farofa', 'frango', 'coxa e sobrecoxa, farinha de mandioca, cebola, arroz'],
    ['Galinhada', 'frango', 'coxa e sobrecoxa, arroz, açafrão, milho, ervilha', 'a'],
    ['Lasanha à bolonhesa', 'massa', 'massa de lasanha, carne moída, molho de tomate, queijo muçarela, presunto'],
    ['Polenta com molho de carne', 'carne', 'farinha de milho, carne moída, molho de tomate, queijo ralado'],
    ['Arroz carreteiro', 'carne', 'arroz, charque, cebola, alho, salsinha', 'a'],
    ['Picadinho de carne com purê', 'carne', 'patinho, batata, leite, manteiga, cebola'],
    ['Tilápia com arroz e brócolis', 'peixe', 'filé de tilápia, arroz, brócolis, limão'],
    ['Moqueca de peixe', 'peixe', 'filé de peixe, pimentão, tomate, cebola, leite de coco, arroz'],
    ['Bisteca de porco com arroz e salada', 'porco', 'bisteca de porco, arroz, feijão, alface, tomate'],
    ['Lombo assado com batatas', 'porco', 'lombo de porco, batata, cebola, alho'],
    ['Macarrão alho e óleo com frango', 'massa', 'espaguete, alho, peito de frango, salsinha'],
    ['Nhoque ao sugo', 'massa', 'nhoque, molho de tomate, queijo ralado'],
    ['Risoto de legumes', 'vegetariano', 'arroz, abobrinha, cenoura, ervilha, queijo ralado'],
    ['Torta de legumes', 'vegetariano', 'farinha de trigo, ovos, leite, cenoura, milho, ervilha'],
    ['Almôndegas ao molho com arroz', 'carne', 'carne moída, ovos, farinha de rosca, molho de tomate, arroz'],
    ['Frango xadrez', 'frango', 'peito de frango, pimentão, cebola, amendoim, shoyu, arroz'],
    ['Panqueca de carne', 'carne', 'farinha de trigo, ovos, leite, carne moída, molho de tomate'],
    ['Salpicão de frango', 'frango', 'peito de frango, maionese, cenoura, milho, batata palha, maçã'],
    ['Carne assada com aipim', 'carne', 'maminha, aipim, cebola', 'a'],
    ['Sopa de legumes com carne', 'carne', 'acém, batata, cenoura, chuchu, macarrão'],
    ['Quibe assado com salada', 'carne', 'trigo para quibe, carne moída, hortelã, alface, tomate'],
    ['Estrogonofe de carne', 'carne', 'patinho, creme de leite, champignon, molho de tomate, arroz, batata palha'],
    ['Feijão tropeiro', 'porco', 'feijão, bacon, linguiça calabresa, ovos, couve, farinha de mandioca', 'a'],
    ['Hambúrguer caseiro com purê', 'carne', 'carne moída, batata, leite, manteiga, cebola'],
    ['Ovos mexidos, arroz, feijão e salada', 'vegetariano', 'ovos, arroz, feijão, alface, tomate'],
    ['Abobrinha recheada', 'vegetariano', 'abobrinha, tomate, queijo muçarela, cebola'],
    ['Grão-de-bico ensopado', 'vegetariano', 'grão-de-bico, tomate, cebola, cenoura, arroz'],
    ['Sardinha assada com batatas', 'peixe', 'sardinha, batata, cebola, limão'],
    ['Churrasco', 'carne', 'costela, linguiça, pão, farinha de mandioca, tomate, cebola', 'a'],
    ['Frango à parmegiana', 'frango', 'filé de frango, farinha de rosca, ovos, molho de tomate, queijo muçarela, arroz'],
    ['Arroz de forno', 'frango', 'arroz, peito de frango, ervilha, milho, queijo muçarela, creme de leite'],
    ['Sopa de legumes', 'vegetariano', 'batata, cenoura, chuchu, abobrinha, macarrão, cebola', 'j'],
    ['Caldo verde', 'porco', 'batata, couve, linguiça calabresa, cebola, alho', 'j'],
    ['Canja de galinha', 'frango', 'peito de frango, arroz, cenoura, batata, cebola', 'j'],
    ['Sopa de feijão com macarrão', 'carne', 'feijão, macarrão, acém, cebola', 'j'],
    ['Sanduíche natural', 'frango', 'pão de forma, peito de frango, cenoura, maionese, alface', 'j'],
    ['Pizza caseira', 'massa', 'farinha de trigo, fermento, molho de tomate, queijo muçarela, presunto, orégano', 'j'],
    ['Tapioca recheada', 'vegetariano', 'goma de tapioca, queijo, tomate, ovos', 'j'],
    ['Crepioca com salada', 'vegetariano', 'ovos, goma de tapioca, queijo, alface, tomate', 'j'],
    ['Wrap de frango', 'frango', 'tortilha, peito de frango, alface, tomate, requeijão', 'j'],
    ['Cachorro-quente', 'carne', 'pão de cachorro-quente, salsicha, molho de tomate, milho, batata palha', 'j'],
    ['Salada completa com ovo', 'vegetariano', 'alface, tomate, pepino, ovos, milho, queijo', 'j'],
    ['Torta de frango', 'frango', 'farinha de trigo, ovos, leite, peito de frango, milho, ervilha', 'j'],
  ].map(([nome, tag, ing, ref = 'aj']) => ({
    id: 'banco-' + normalizar(nome).replace(/[^a-z0-9]+/g, '-'), nome, tag, ingredientes: ing.split(', '), banco: true,
    refeicoes: ref === 'a' ? ['almoco'] : ref === 'j' ? ['jantar'] : ['almoco', 'jantar'],
  })),

  classificar(nome) {
    const n = normalizar(nome);
    const r = this.REGRAS.find(([, re]) => re.test(n) || re.test(String(nome).toLowerCase()));
    return r ? r[0] : 'Outros';
  },

  /* "2 kg arroz", "arroz 2kg", "3 tomates" → { nome, qtd } */
  interpretar(entrada) {
    let t = String(entrada || '').trim().replace(/\s+/g, ' ');
    let preco = null;
    const mp = t.match(/\s*r\$\s*(\d+(?:[.,]\d{1,2})?)\s*$/i);
    if (mp) { preco = Dinheiro.parse(mp[1]); t = t.slice(0, mp.index).trim(); }
    const r = this._qtdNome(t);
    return { ...r, preco };
  },
  _qtdNome(t) {
    const un = '(?:kg|g|l|ml|un|und|unid|pct|pacotes?|cx|caixas?|dz|d[uú]zias?|latas?|garrafas?|ma[cç]os?|potes?|fardos?)';
    let m = t.match(new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${un}?)\\.?\\s+(?:de\\s+)?(.+)$`, 'i'));
    if (m) return { qtd: m[1].trim(), nome: this.capitalizar(m[2]) };
    m = t.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*${un})$`, 'i'));
    if (m) return { qtd: m[2].trim(), nome: this.capitalizar(m[1]) };
    return { qtd: '', nome: this.capitalizar(t) };
  },
  capitalizar: (s) => { const t = String(s).trim(); return t ? t[0].toUpperCase() + t.slice(1) : ''; },

  /* ---- lista ---- */
  itemPorNome(nome) {
    const k = normalizar(nome);
    return Store.dados.compras.find((c) => normalizar(c.nome) === k);
  },
  adicionar(entrada) {
    const { nome, qtd, preco } = this.interpretar(entrada);
    if (!nome) return null;
    const existente = this.itemPorNome(nome);
    const jaNaLista = existente && !existente.arquivado && !existente.feito;
    const item = Modelo.compra({
      ...(existente || { id: uid(), setor: this.classificar(nome), vezes: 0 }),
      nome: existente ? existente.nome : nome,
      qtd: qtd || (existente ? existente.qtd : ''),
      preco: preco || (existente ? existente.preco : null),
      feito: false,
      arquivado: false,
    });
    Store.gravar('compras', item);
    return { item, jaNaLista };
  },
  alternar(id) {
    const c = Store.dados.compras.find((x) => x.id === id);
    if (!c) return;
    c.feito = !c.feito;
    if (c.feito) c.vezes += 1;
    Store.tocar(c);
    Store.salvar();
    return c.feito;
  },
  limparCarrinho() {
    let n = 0;
    Store.dados.compras.forEach((c) => { if (c.feito && !c.arquivado) { c.arquivado = true; Store.tocar(c); n++; } });
    if (n) Store.salvar();
    return n;
  },
  ativos() { return Store.dados.compras.filter((c) => !c.arquivado); },
  soma(lista) { return lista.reduce((t, c) => t + (c.preco || 0), 0); },
  frequentes() {
    return Store.dados.compras.filter((c) => c.arquivado && c.vezes > 0).sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 12);
  },
  textoLista() {
    const pend = this.ativos().filter((c) => !c.feito);
    const grupos = Object.keys(this.SETORES).map((s) => [s, pend.filter((c) => c.setor === s)]).filter(([, l]) => l.length);
    return ['🛒 Lista de compras · Família Power', ...grupos.map(([s, l]) => `\n*${s}*\n` + l.map((c) => `• ${c.nome}${c.qtd ? ` (${c.qtd})` : ''}`).join('\n'))].join('\n');
  },

  /* ---- cardápio (almoço e jantar) ---- */
  REFEICOES: { almoco: 'Almoço', jantar: 'Jantar' },
  pratos(r = '') {
    const meus = Store.dados.pratos;
    const nomes = new Set(meus.map((p) => normalizar(p.nome)));
    return [...meus, ...this.BANCO.filter((p) => !nomes.has(normalizar(p.nome)))].filter((p) => !r || p.refeicoes.includes(r));
  },
  prato(nome) { const k = normalizar(nome); return this.pratos().find((p) => normalizar(p.nome) === k); },
  inicioSemana(d) { return Datas.somar(d, -((Datas.parse(d).getDay() + 6) % 7)); },
  diasSemana(ref) { const ini = this.inicioSemana(ref); return Array.from({ length: 7 }, (_, i) => Datas.somar(ini, i)); },
  idRefeicao: (data, r) => (r === 'jantar' ? 'jan-' : 'alm-') + data,
  almoco(data, r = ui.refeicao) { return Store.dados.cardapio.find((a) => a.data === data && a.refeicao === r); },
  definir(data, prato, r = ui.refeicao) {
    Store.gravar('cardapio', Modelo.almoco({ data, prato, refeicao: r }));
  },
  limpar(data, r = ui.refeicao) { Store.remover('cardapio', this.idRefeicao(data, r)); },

  /* Sugestão sem repetir na semana, evitando a mesma proteína em dias seguidos e pratos recentes. */
  sugerir(data, evitar = '', r = ui.refeicao) {
    const outra = r === 'jantar' ? 'almoco' : 'jantar';
    const dias = this.diasSemana(data);
    const usados = new Set(dias.filter((d) => d !== data).map((d) => this.almoco(d, r)).filter(Boolean).map((a) => normalizar(a.prato)));
    const mesmoDia = this.almoco(data, outra);
    if (mesmoDia) usados.add(normalizar(mesmoDia.prato));
    const tagDe = (d) => { const a = this.almoco(d, r); return a ? this.prato(a.prato)?.tag : null; };
    const vizinhos = [tagDe(Datas.somar(data, -1)), tagDe(Datas.somar(data, 1)), mesmoDia ? this.prato(mesmoDia.prato)?.tag : null];
    const contagem = {};
    dias.filter((d) => d !== data).forEach((d) => { const t = tagDe(d); if (t) contagem[t] = (contagem[t] || 0) + 1; });
    const recentes = new Set(Store.dados.cardapio.filter((a) => a.refeicao === r && a.data < dias[0] && a.data >= Datas.somar(dias[0], -14)).map((a) => normalizar(a.prato)));
    const domingo = r === 'almoco' && Datas.parse(data).getDay() === 0;
    let melhor = null, nota = -1;
    for (const p of this.pratos(r)) {
      const k = normalizar(p.nome);
      if (usados.has(k) || k === normalizar(evitar)) continue;
      let s = Math.random();
      if (recentes.has(k)) s *= 0.3;
      if (vizinhos.includes(p.tag)) s *= 0.25;
      s *= 0.45 ** (contagem[p.tag] || 0);
      if (!p.banco) s *= 1.4;
      if (p.refeicoes.length === 1) s *= 1.5; /* prato típico daquela refeição */
      if (domingo && /churrasco|lasanha|feijoada|assad/i.test(p.nome)) s *= 1.8;
      if (s > nota) { nota = s; melhor = p; }
    }
    return melhor;
  },
  sugerirSemana(ref, r = ui.refeicao) {
    let n = 0;
    for (const d of this.diasSemana(ref)) {
      if (this.almoco(d, r)) continue;
      const p = this.sugerir(d, '', r);
      if (p) { this.definir(d, p.nome, r); n++; }
    }
    return n;
  },
  ingredientesParaLista(ref) {
    const hoje = Datas.hoje();
    const nomes = new Map();
    for (const d of this.diasSemana(ref)) {
      if (d < hoje) continue;
      for (const r of Object.keys(this.REFEICOES)) {
        const a = this.almoco(d, r);
        const p = a && this.prato(a.prato);
        if (p) p.ingredientes.forEach((i) => nomes.set(normalizar(i), i));
      }
    }
    let n = 0;
    for (const nome of nomes.values()) {
      const res = this.adicionar(nome);
      if (res && !res.jaNaLista) n++;
    }
    return { total: nomes.size, novos: n };
  },
  textoSemana(ref) {
    const linhas = this.diasSemana(ref).map((d) => {
      const a = this.almoco(d, 'almoco'), j = this.almoco(d, 'jantar');
      return `*${Datas.curto(d)}*${a ? `\nAlmoço: ${a.prato}` : ''}${j ? `\nJantar: ${j.prato}` : ''}${!a && !j ? '\n—' : ''}`;
    });
    return ['🍽️ Cardápio da semana · Família Power', '', ...linhas].join('\n');
  },
};

const CozinhaUI = {
  get el() { return $('#cozConteudo'); },
  casca: '',
  refSemana: '',

  render() {
    $$('#cozModo button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modo === ui.cozModo)));
    if (ui.cozModo === 'cardapio') this.cardapio(); else this.lista();
  },

  /* ---------- Lista de compras ---------- */
  lista() {
    if (this.casca !== 'lista' || !$('#listaCorpo', this.el)) {
      this.casca = 'lista';
      this.el.innerHTML = `
        <form class="add-item" id="formItem" autocomplete="off">
          <label class="busca"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <input id="novoItem" list="dl-itens" placeholder="Item (ex.: 2 kg arroz R$ 25)" enterkeyhint="done" aria-label="Adicionar item à lista"></label>
          <button type="submit" class="btn prim">Pôr</button>
        </form>
        <div id="listaCorpo"></div>`;
    }
    const ativos = Cozinha.ativos();
    const pend = ativos.filter((c) => !c.feito), carrinho = ativos.filter((c) => c.feito);
    const freq = Cozinha.frequentes();
    $('#dl-itens').innerHTML = Store.dados.compras.map((c) => `<option value="${esc(c.nome)}"></option>`).join('');

    const linha = (c) => `<div class="cp${c.feito ? ' feito' : ''}" data-id="${esc(c.id)}" style="--cor:${Cozinha.SETORES[c.setor] || '#6B7280'}">
        <button type="button" class="check-cp" aria-pressed="${c.feito}" aria-label="${c.feito ? 'Tirar do carrinho' : 'Pôr no carrinho'}: ${esc(c.nome)}"></button>
        <div class="cp-corpo" role="button" tabindex="0"><span class="cp-nome">${esc(c.nome)}</span><span class="cp-extra">${c.qtd ? `<span class="cp-qtd">${esc(c.qtd)}</span>` : ''}${c.preco ? `<span class="cp-preco">${Dinheiro.br(c.preco)}</span>` : ''}</span></div>
      </div>`;
    const grupos = Object.keys(Cozinha.SETORES).map((s) => [s, pend.filter((c) => c.setor === s)]).filter(([, l]) => l.length);

    let html = `<div class="barra-acoes">
        <p class="contagem"><b>${pend.length}</b> para comprar${carrinho.length ? ` · <b>${carrinho.length}</b> no carrinho` : ''}${Cozinha.soma(ativos) ? `<br><small>Estimado: ${Dinheiro.br(Cozinha.soma(ativos))}</small>` : ''}</p>
        ${pend.length ? `<button type="button" class="btn-leve" data-acao="compartilhar">${ICONE.whats}Enviar</button>` : ''}
      </div>`;
    if (freq.length) {
      html += `<p class="rotulo-sec">Compro sempre</p><div class="chips chips-freq">${freq.map((c) => `<button type="button" class="chip" data-freq="${esc(c.id)}">+ ${esc(c.nome)}</button>`).join('')}</div>`;
    }
    if (!ativos.length) {
      html += AgendaUI.vazio('Lista vazia', 'Escreva um item acima ou use os almoços da semana para montar a lista.');
    }
    html += grupos.map(([s, l]) => `<section class="dia"><h3 class="dia-tit setor" style="--cor:${Cozinha.SETORES[s]}">${s}</h3><div class="painel">${l.map(linha).join('')}</div></section>`).join('');
    if (carrinho.length) {
      const totalCarrinho = Cozinha.soma(carrinho);
      html += `<section class="dia carrinho"><div class="carrinho-tit"><h3 class="dia-tit">No carrinho${totalCarrinho ? ` · ${Dinheiro.br(totalCarrinho)}` : ''}</h3><button type="button" class="btn-leve" data-acao="limpar">Limpar</button></div><div class="painel">${carrinho.map(linha).join('')}</div>
        <button type="button" class="btn prim bloco finalizar" data-acao="finalizar">Finalizar compra → Financeiro</button></section>`;
    }
    $('#listaCorpo').innerHTML = html;
  },

  editarItem(id) {
    const c = Store.dados.compras.find((x) => x.id === id);
    if (!c) return;
    const opcoes = Object.keys(Cozinha.SETORES).map((s) => `<option${s === c.setor ? ' selected' : ''}>${s}</option>`).join('');
    const folha = UI.abrir({
      titulo: 'Editar item',
      corpo: `<form class="form" novalidate>
        ${UI.campo('Item', `<input name="nome" value="${esc(c.nome)}" maxlength="80" required>`)}
        <div class="duas">
          ${UI.campo('Quantidade', `<input name="qtd" value="${esc(c.qtd)}" maxlength="30" placeholder="ex.: 2 kg">`)}
          ${UI.campo('Preço', `<input name="preco" value="${Dinheiro.campo(c.preco)}" inputmode="decimal" placeholder="0,00">`)}
        </div>
        ${UI.campo('Setor', `<select name="setor">${opcoes}</select>`)}
        ${Perfil.detalhe(c) ? `<p class="quem">${esc(Perfil.detalhe(c))}</p>` : ''}
        <div class="botoes"><button type="button" class="btn perigo" data-acao="excluir">Excluir</button><span class="cresce"></span>
          <button type="button" class="btn" data-acao="cancelar">Cancelar</button><button type="submit" class="btn prim">Salvar</button></div>
      </form>`,
    });
    const form = $('form', folha);
    form.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-acao]')?.dataset.acao;
      if (a === 'cancelar') UI.fechar();
      if (a === 'excluir') { Store.remover('compras', c.id); await UI.fechar(); this.render(); UI.toast('Item removido'); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = Cozinha.capitalizar(form.nome.value);
      if (!nome) return UI.toast('Escreva o item.');
      Store.gravar('compras', Modelo.compra({ ...c, nome, qtd: form.qtd.value, preco: Dinheiro.parse(form.preco.value), setor: form.setor.value }));
      await UI.fechar();
      this.render();
    });
  },

  /* ---------- Almoços da semana ---------- */
  cardapio() {
    this.casca = 'cardapio';
    const ref = this.refSemana || Datas.hoje();
    const dias = Cozinha.diasSemana(ref);
    const a = Datas.parse(dias[0]), b = Datas.parse(dias[6]);
    const mesA = Datas.MESES[a.getMonth()].slice(0, 3), mesB = Datas.MESES[b.getMonth()].slice(0, 3);
    const titulo = mesA === mesB ? `${a.getDate()} – ${b.getDate()} de ${mesB}` : `${a.getDate()} ${mesA} – ${b.getDate()} ${mesB}`;
    const hoje = Datas.hoje();
    const nomeRef = Cozinha.REFEICOES[ui.refeicao];
    const vazios = dias.filter((d) => !Cozinha.almoco(d)).length;

    const linhas = dias.map((d) => {
      const alm = Cozinha.almoco(d);
      const p = alm && Cozinha.prato(alm.prato);
      const [tagNome, cor] = Cozinha.TAGS[p?.tag || 'outro'];
      const dt = Datas.parse(d);
      const sem = Datas.SEMANA[dt.getDay()].slice(0, 3);
      return `<div class="alm${d === hoje ? ' hoje' : ''}${alm ? '' : ' vazio-dia'}${d < hoje ? ' passado' : ''}" data-data="${d}" style="--cor:${alm ? cor : 'var(--text-secondary)'}">
        <div class="alm-dia"><b>${sem}</b><span>${dt.getDate()}</span></div>
        <div class="alm-corpo" role="button" tabindex="0" aria-label="Escolher ${nomeRef.toLowerCase()} de ${Datas.rotuloDia(d)}">
          ${alm ? `<div class="alm-prato">${esc(alm.prato)}</div><div class="alm-info">${[p ? `${tagNome} · ${p.ingredientes.length} ingredientes` : 'Prato livre', Perfil.rotulo(alm)].filter(Boolean).join(' · ')}</div>` : `<div class="alm-prato vazio">Escolher ${nomeRef.toLowerCase()}</div><div class="alm-info">Toque para ver sugestões</div>`}
        </div>
        <button type="button" class="alm-trocar" data-trocar aria-label="Outra sugestão para ${Datas.rotuloDia(d)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg></button>
      </div>`;
    }).join('');

    this.el.innerHTML = `${AgendaUI.navegador(titulo, 'Semana anterior', 'Próxima semana')}
      <div class="seg seg-refeicao" role="tablist" aria-label="Refeição">${Object.entries(Cozinha.REFEICOES).map(([k, n]) => `<button type="button" role="tab" data-refeicao="${k}" aria-selected="${k === ui.refeicao}">${k === 'almoco' ? '☀️' : '🌙'} ${n}</button>`).join('')}</div>
      <div class="acoes-cardapio">
        <button type="button" class="btn prim" data-acao="sugerir">✨ ${vazios ? `Sugerir ${vazios === 7 ? 'semana' : `${vazios} dia${vazios > 1 ? 's' : ''}`}` : 'Semana pronta'}</button>
        <button type="button" class="btn" data-acao="ingredientes" aria-label="Pôr os ingredientes na lista de compras"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18l-2 10.5a1.5 1.5 0 0 1-1.5 1.2h-11A1.5 1.5 0 0 1 5 19.5Z"/><path d="m8 9 3-6M16 9l-3-6"/></svg>Ingredientes</button>
        <button type="button" class="btn-leve" data-acao="enviar-semana" aria-label="Enviar cardápio pelo WhatsApp">${ICONE.whats}</button>
      </div>
      <div class="painel semana-alm">${linhas}</div>`;
    $('[data-acao="sugerir"]', this.el).disabled = !vazios;
  },

  escolher(data) {
    const atual = Cozinha.almoco(data);
    const filtro = { tag: '', busca: '' };
    const folha = UI.abrir({
      titulo: `${Cozinha.REFEICOES[ui.refeicao]} · ${Datas.curto(data)}`,
      corpo: `<label class="busca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" class="busca-prato" placeholder="Buscar prato" autocomplete="off"></label>
        <div class="chips chips-tag">${['', ...Object.keys(Cozinha.TAGS).filter((t) => t !== 'outro')].map((t) => `<button type="button" class="chip" data-tag="${t}" aria-pressed="${t === ''}">${t ? Cozinha.TAGS[t][0] : 'Todos'}</button>`).join('')}</div>
        <div class="lista-pratos"></div>
        <details class="novo-prato"><summary>Outro prato</summary>
          <form class="form" novalidate>
            ${UI.campo('Nome do prato', '<input name="nome" maxlength="100" placeholder="ex.: Lasanha da vó">')}
            ${UI.campo('Ingredientes', '<input name="ing" maxlength="600" placeholder="separe por vírgula"><small>Opcional. Vão para a lista de compras quando pedir.</small>')}
            ${UI.campo('Tipo', `<select name="tag">${Object.entries(Cozinha.TAGS).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select>`)}
            <label class="interruptor">Guardar nos meus pratos<input type="checkbox" name="guardar" checked></label>
            <button type="submit" class="btn prim bloco">Usar este prato</button>
          </form>
        </details>
        ${atual ? `<button type="button" class="btn perigo bloco" data-acao="remover" style="margin-top:12px">Tirar ${Cozinha.REFEICOES[ui.refeicao].toLowerCase()} deste dia</button>` : ''}`,
    });
    const lista = $('.lista-pratos', folha);
    const desenhar = () => {
      const termo = normalizar(filtro.busca);
      const itens = Cozinha.pratos(termo ? '' : ui.refeicao).filter((p) => (!filtro.tag || p.tag === filtro.tag) && (!termo || normalizar(p.nome + ' ' + p.ingredientes.join(' ')).includes(termo)));
      lista.innerHTML = itens.length ? itens.map((p) => {
        const [tagNome, cor] = Cozinha.TAGS[p.tag] || Cozinha.TAGS.outro;
        const escolhido = atual && normalizar(atual.prato) === normalizar(p.nome);
        return `<button type="button" class="prato${escolhido ? ' escolhido' : ''}" data-prato="${esc(p.nome)}" style="--cor:${cor}">
          <b>${esc(p.nome)}${p.banco ? '' : ' <em>meu</em>'}</b><small>${tagNome} · ${esc(p.ingredientes.slice(0, 5).join(', '))}${p.ingredientes.length > 5 ? '…' : ''}</small></button>`;
      }).join('') : '<p class="dia-vazio">Nenhum prato encontrado. Use “Outro prato”.</p>';
    };
    desenhar();
    $('.busca-prato', folha).addEventListener('input', (e) => { filtro.busca = e.target.value; desenhar(); });
    folha.addEventListener('click', async (e) => {
      const tag = e.target.closest('[data-tag]');
      if (tag) {
        filtro.tag = tag.dataset.tag;
        $$('[data-tag]', folha).forEach((b) => b.setAttribute('aria-pressed', String(b === tag)));
        return desenhar();
      }
      const p = e.target.closest('[data-prato]');
      if (p) { Cozinha.definir(data, p.dataset.prato); await UI.fechar(); this.render(); this.pulsar(data); return; }
      if (e.target.closest('[data-acao="remover"]')) { Cozinha.limpar(data); await UI.fechar(); this.render(); }
    });
    $('.novo-prato form', folha).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const nome = Cozinha.capitalizar(f.nome.value);
      if (!nome) return UI.toast('Escreva o nome do prato.');
      if (f.guardar.checked) {
        const existente = Store.dados.pratos.find((x) => normalizar(x.nome) === normalizar(nome));
        Store.gravar('pratos', Modelo.prato({ ...(existente || {}), id: existente ? existente.id : uid(), nome, tag: f.tag.value, ingredientes: f.ing.value.split(',') }));
      }
      Cozinha.definir(data, nome);
      await UI.fechar();
      this.render();
      this.pulsar(data);
    });
  },

  pulsar(data) { $(`.alm[data-data="${data}"]`, this.el)?.classList.add('pulso'); },

  ligar() {
    $('#cozModo').addEventListener('click', (e) => {
      const b = e.target.closest('[data-modo]');
      if (!b || b.dataset.modo === ui.cozModo) return;
      ui.cozModo = b.dataset.modo;
      Prefs.salvar();
      this.render();
    });

    this.el.addEventListener('submit', (e) => {
      if (e.target.id !== 'formItem') return;
      e.preventDefault();
      const campo = $('#novoItem');
      const r = Cozinha.adicionar(campo.value);
      if (!r) return;
      campo.value = '';
      this.render();
      campo.focus();
      if (r.jaNaLista) UI.toast(`${r.item.nome} já estava na lista`);
      $(`.cp[data-id="${CSS.escape(r.item.id)}"]`, this.el)?.classList.add('pulso');
    });

    this.el.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      const ref = this.refSemana || Datas.hoje();
      if (acao === 'compartilhar') return window.open(`https://wa.me/?text=${encodeURIComponent(Cozinha.textoLista())}`, '_blank', 'noopener');
      if (acao === 'enviar-semana') return window.open(`https://wa.me/?text=${encodeURIComponent(Cozinha.textoSemana(ref))}`, '_blank', 'noopener');
      if (acao === 'finalizar') {
        const carrinho = Cozinha.ativos().filter((c) => c.feito);
        return LancamentoForm.abrir(null, {
          titulo: 'Finalizar compra',
          sugestao: { descricao: 'Mercado', categoria: 'Alimentação', tipo: 'despesa', pago: true, valor: Cozinha.soma(carrinho) || null, data: Datas.hoje(), hora: Datas.agoraHM() },
          aoSalvar: () => Cozinha.limparCarrinho(),
        });
      }
      if (acao === 'limpar') { const n = Cozinha.limparCarrinho(); this.render(); return UI.toast(`${n} ite${n > 1 ? 'ns guardados' : 'm guardado'} em “Compro sempre”`); }
      if (acao === 'sugerir') { const n = Cozinha.sugerirSemana(ref); this.render(); $$('.alm', this.el).forEach((el) => el.classList.add('pulso')); const j = ui.refeicao === 'jantar';
        return UI.toast(`${n} ${n === 1 ? (j ? 'jantar' : 'almoço') : (j ? 'jantares' : 'almoços')} sugerido${n === 1 ? '' : 's'}`); }
      const refBtn = e.target.closest('[data-refeicao]');
      if (refBtn) { ui.refeicao = refBtn.dataset.refeicao; Prefs.salvar(); return this.render(); }
      if (acao === 'ingredientes') {
        const { total, novos } = Cozinha.ingredientesParaLista(ref);
        if (!total) return UI.toast('Escolha os almoços primeiro.');
        return UI.toast(novos ? `${novos} ingrediente${novos > 1 ? 's' : ''} na lista de compras` : 'Tudo já está na lista');
      }

      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const passo = Number(nav.dataset.nav);
        this.refSemana = passo ? Datas.somar(ref, passo * 7) : '';
        return this.render();
      }

      const freq = e.target.closest('[data-freq]');
      if (freq) {
        const c = Store.dados.compras.find((x) => x.id === freq.dataset.freq);
        if (c) { Cozinha.adicionar(c.nome); this.render(); $(`.cp[data-id="${CSS.escape(c.id)}"]`, this.el)?.classList.add('pulso'); }
        return;
      }

      const cp = e.target.closest('.cp');
      if (cp) {
        if (e.target.closest('.check-cp')) {
          const feito = Cozinha.alternar(cp.dataset.id);
          if (navigator.vibrate) navigator.vibrate(10);
          this.render();
          $(`.cp[data-id="${CSS.escape(cp.dataset.id)}"]`, this.el)?.classList.add('pulso');
          return feito && Cozinha.ativos().every((c) => c.feito) && UI.toast('Tudo no carrinho! 🎉');
        }
        return this.editarItem(cp.dataset.id);
      }

      const alm = e.target.closest('.alm');
      if (alm) {
        const d = alm.dataset.data;
        if (e.target.closest('[data-trocar]')) {
          const p = Cozinha.sugerir(d, Cozinha.almoco(d)?.prato);
          if (p) { Cozinha.definir(d, p.nome); this.render(); this.pulsar(d); }
          return;
        }
        this.escolher(d);
      }
    });

    this.el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const cp = e.target.closest('.cp-corpo');
      if (cp) return this.editarItem(cp.parentElement.dataset.id);
      const alm = e.target.closest('.alm-corpo');
      if (alm) this.escolher(alm.parentElement.dataset.data);
    });
  },
};
