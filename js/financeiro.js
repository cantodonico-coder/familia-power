'use strict';

/* Família Power · Financeiro: resumo, gráfico, lançamentos e contas fixas
   Desenvolvido por Nicoshake Labs · © 2026 */

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
    Fixas.gerar();
    Vinculos.sincronizar();
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
    const nFixas = Store.dados.fixas.filter((f) => f.ativo).length;
    const botaoFixas = `<button type="button" class="btn-leve btn-fixas" data-fixas>↻ Contas fixas${nFixas ? ` (${nFixas})` : ''}</button>`;
    if (itens.length < 2) { el.innerHTML = botaoFixas; return; }
    const aberto = el.querySelector('details')?.open ? ' open' : '';
    const max = itens[0][1], total = itens.reduce((t, [, v]) => t + v, 0);
    const linhas = itens.slice(0, 6).map(([cat, v]) => {
      const pct = Math.round((v / total) * 100);
      return `<li><b>${esc(cat)}</b><span>${Dinheiro.br(v)}</span>
        <div class="barra" role="img" aria-label="${esc(cat)}: ${pct}% das despesas"><i style="--p:${Math.max(3, (v / max) * 100)}%"></i></div></li>`;
    }).join('');
    el.innerHTML = `<details class="gastos"${aberto}><summary>Para onde foi o dinheiro <small>${itens.length} categorias</small></summary><ol>${linhas}</ol></details>${botaoFixas}`;
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
    const meta = [l.categoria, l.pessoa, Perfil.rotulo(l)].filter(Boolean).map(esc).join(' · ');
    const sinal = l.tipo === 'receita' ? '+' : '−';
    return `<div class="lc ${l.tipo}" data-id="${esc(l.id)}" role="button" tabindex="0" aria-label="${esc(l.descricao)}, ${sinal === '+' ? 'receita' : 'despesa'} de ${Dinheiro.br(l.valor)}, ${this.rotuloEstado(l)}">
      <div class="lc-dia" aria-hidden="true">${Number(l.data.slice(8))}</div>
      <div><div class="lc-desc">${esc(l.descricao)}${l.fixa ? ' <span class="selo-fixa" title="Conta fixa">↻</span>' : ''}${l.evento ? ' <span class="selo-fixa" title="Ligado a um compromisso">📅</span>' : ''}</div>${meta ? `<div class="lc-meta">${meta}</div>` : ''}
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
    Vinculos.aoPagar(l);
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
    $('#finGastos').addEventListener('click', (e) => { if (e.target.closest('[data-fixas]')) FixasUI.abrir(); });
    $('#btnLerNota').addEventListener('click', () => Leitura.iniciar());
  },
};

/* ---------- Formulário de lançamento (também usado pelo OCR) ---------- */
const LancamentoForm = {
  dataPadrao() {
    const hoje = Datas.hoje();
    return ui.finMes === hoje.slice(0, 7) ? hoje : ui.finMes + '-01';
  },

  /* opcoes: sugestao (dados pré-preenchidos), nota ({ url, texto } do OCR), marcarLidos, titulo, aoSalvar */
  abrir(id = null, { sugestao = null, nota = null, marcarLidos = false, titulo = '', aoSalvar = null } = {}) {
    UI.atualizarListas();
    const l = id ? Store.lancamento(id) : null;
    const d = l || {
      descricao: '', categoria: '', pessoa: '', tipo: 'despesa', pago: true, valor: null,
      data: sugestao ? '' : this.dataPadrao(), hora: '', fixa: '', ...(sugestao || {}),
    };
    const lido = (campo) => (marcarLidos && sugestao && sugestao[campo] ? 'lido' : '');
    const fixa = d.fixa ? Store.dados.fixas.find((f) => f.id === d.fixa) : null;
    const evLigado = d.evento ? Store.evento(d.evento) : null;

    const corpo = `<form class="form" novalidate>
      ${nota ? `<div class="nota-previa"><img src="${nota.url}" alt="Foto da nota"><span>Confira os dados. Campos em destaque foram lidos da nota; os vazios não foram encontrados.</span></div>` : ''}
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
      ${evLigado ? `<p class="quem">📅 Ligado ao compromisso “${esc(evLigado.titulo)}”. Pagar aqui conclui o compromisso; valor e data se mudam no compromisso.</p>` : ''}
      <label class="interruptor"${d.evento ? ' hidden' : ''}><span>Conta fixa <small class="dica-fixa">${fixa && fixa.ativo ? `todo dia ${fixa.dia}` : 'repete todo mês'}</small></span><input type="checkbox" name="fixa" ${fixa && fixa.ativo ? 'checked' : ''}></label>
      ${nota && nota.texto ? `<details class="texto-lido"><summary>Ver texto reconhecido</summary><pre>${esc(nota.texto)}</pre></details>` : ''}
      ${l && Perfil.detalhe(l) ? `<p class="quem">${esc(Perfil.detalhe(l))}</p>` : ''}
      <div class="botoes">
        ${l ? '<button type="button" class="btn perigo" data-acao="excluir">Excluir</button>' : ''}
        <span class="cresce"></span>
        <button type="button" class="btn" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="btn prim">Salvar</button>
      </div>
    </form>`;

    const folha = UI.abrir({
      titulo: titulo || (l ? 'Editar lançamento' : 'Novo lançamento'),
      corpo,
      aoFechar: () => { if (nota) URL.revokeObjectURL(nota.url); },
    });
    const form = $('form', folha);
    if (!l && !sugestao) setTimeout(() => form.descricao.focus(), 300);

    form.addEventListener('change', (e) => {
      if (e.target.name === 'tipo') $('.rotulo-pago', form).textContent = e.target.value === 'receita' ? 'Recebido' : 'Pago';
      if (e.target.name === 'fixa' || e.target.name === 'data') {
        const dia = Number(form.data.value.slice(8));
        $('.dica-fixa', form).textContent = form.fixa.checked && dia ? `todo dia ${dia}` : 'repete todo mês';
      }
    });
    form.addEventListener('input', (e) => e.target.closest('.campo')?.classList.remove('lido', 'erro'));
    form.addEventListener('submit', (e) => { e.preventDefault(); this.salvar(form, l, aoSalvar); });
    form.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'cancelar') UI.fechar();
      if (acao === 'excluir') this.excluir(l);
    });
  },

  async salvar(form, atual, aoSalvar) {
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
      fixa: atual ? atual.fixa : '',
      evento: atual ? atual.evento : '',
    });
    const aviso = item.evento ? '' : Fixas.aplicarFormulario(item, form.fixa.checked);
    if (item.evento && atual && atual.pago !== item.pago) Vinculos.aoPagar(item);
    if (!Store.gravar('lancamentos', item)) return;
    await UI.fecharTodas();
    if (aoSalvar) aoSalvar(item);
    if (ui.aba === 'fin') ui.finMes = item.data.slice(0, 7);
    App.renderAba();
    UI.toast(aviso || 'Lançamento salvo');
  },

  async excluir(l) {
    const r = await UI.escolher({
      titulo: 'Excluir lançamento?',
      mensagem: `“${esc(l.descricao)}” de ${Dinheiro.br(l.valor)} será removido.${l.fixa ? ' A conta fixa continua nos outros meses.' : ''}`,
      opcoes: [{ id: 'sim', rotulo: 'Excluir', estilo: 'perigo-forte' }],
    });
    if (!r) return;
    Store.remover('lancamentos', l.id);
    if (l.fixa) Store.dados.removidos[Fixas.idGerado(l.fixa, l.data.slice(0, 7))] = Date.now();
    Store.salvar();
    await UI.fechar();
    App.renderAba();
    UI.toast('Lançamento excluído');
  },
};

/* ---------- Contas fixas: geram o lançamento de cada mês, já como "a pagar" ---------- */
const Fixas = {
  idGerado: (fixaId, mes) => `fx-${fixaId}-${mes}`,
  proxMes: (mes) => Datas.somarMeses(mes + '-01', 1).slice(0, 7),
  limiteGeracao() { return Datas.somarMeses(Datas.hoje(), 1).slice(0, 7); },

  existeNoMes(f, mes) {
    return !!Store.dados.removidos[this.idGerado(f.id, mes)] ||
      Store.dados.lancamentos.some((l) => l.fixa === f.id && l.data.startsWith(mes));
  },

  /* Cria os lançamentos que faltam, do mês de início até o próximo mês. */
  gerar() {
    const ate = this.limiteGeracao();
    let n = 0;
    for (const f of Store.dados.fixas) {
      if (!f.ativo) continue;
      let mes = f.desde;
      for (let i = 0; i < 36 && mes <= ate; i++, mes = this.proxMes(mes)) {
        if (this.existeNoMes(f, mes)) continue;
        const [a, m] = mes.split('-').map(Number);
        const l = Modelo.lancamento({
          id: this.idGerado(f.id, mes), data: `${mes}-${Datas.pad(Math.min(f.dia, Datas.diasNoMes(a, m - 1)))}`,
          descricao: f.descricao, categoria: f.categoria, pessoa: f.pessoa, tipo: f.tipo, valor: f.valor, pago: false, fixa: f.id,
        });
        l.atualizado = 1; /* qualquer edição feita num celular vence esta cópia automática */
        Store.dados.lancamentos.push(l);
        n++;
      }
    }
    if (n) Store.salvar();
    return n;
  },

  /* Liga, atualiza ou desliga a conta fixa a partir do formulário do lançamento. */
  aplicarFormulario(item, ligada) {
    const f = item.fixa ? Store.dados.fixas.find((x) => x.id === item.fixa) : null;
    const mes = item.data.slice(0, 7);
    const futurosPendentes = (id) => Store.dados.lancamentos.filter((l) => l.fixa === id && l.data.slice(0, 7) > mes && !l.pago);
    if (ligada && (!f || !f.ativo)) {
      const nova = Modelo.fixa({ id: f ? f.id : uid(), descricao: item.descricao, categoria: item.categoria, pessoa: item.pessoa, tipo: item.tipo, valor: item.valor, dia: Number(item.data.slice(8)), desde: f ? f.desde : mes });
      Store.gravar('fixas', nova);
      item.fixa = nova.id;
      return `Conta fixa: todo dia ${nova.dia}`;
    }
    if (ligada && f) {
      Store.gravar('fixas', Modelo.fixa({ ...f, descricao: item.descricao, categoria: item.categoria, pessoa: item.pessoa, tipo: item.tipo, valor: item.valor }));
      futurosPendentes(f.id).forEach((l) => Object.assign(l, { descricao: item.descricao, categoria: item.categoria, pessoa: item.pessoa, valor: item.valor, atualizado: Date.now() }));
      return '';
    }
    if (!ligada && f && f.ativo) {
      Store.gravar('fixas', Modelo.fixa({ ...f, ativo: false }));
      futurosPendentes(f.id).forEach((l) => Store.remover('lancamentos', l.id));
      item.fixa = '';
      return 'Conta fixa encerrada';
    }
    return '';
  },
};

const FixasUI = {
  abrir() {
    const lista = Store.dados.fixas.filter((f) => f.ativo).sort((a, b) => a.dia - b.dia);
    const total = (tipo) => lista.filter((f) => f.tipo === tipo).reduce((t, f) => t + f.valor, 0);
    const folha = UI.abrir({
      titulo: 'Contas fixas',
      corpo: `<p>Criadas todo mês automaticamente, como “a pagar”. Para criar, marque “Conta fixa” num lançamento.</p>
        ${lista.length ? `<div class="lista-opcoes">${lista.map((f) => `
          <div class="opcao fixa-op"><span><b>${esc(f.descricao)}</b><small>Todo dia ${f.dia} · ${f.tipo === 'receita' ? '+' : '−'} ${Dinheiro.br(f.valor)}${f.categoria ? ` · ${esc(f.categoria)}` : ''}</small></span>
            <button type="button" class="btn-leve" data-encerrar="${esc(f.id)}">Encerrar</button></div>`).join('')}</div>
          <p class="rodape-nota">Por mês: ${total('despesa') ? `${Dinheiro.br(total('despesa'))} em contas` : ''}${total('despesa') && total('receita') ? ' · ' : ''}${total('receita') ? `${Dinheiro.br(total('receita'))} em receitas` : ''}</p>`
        : '<div class="vazio">Nenhuma conta fixa ainda.</div>'}`,
    });
    folha.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-encerrar]');
      if (!b) return;
      const f = Store.dados.fixas.find((x) => x.id === b.dataset.encerrar);
      const r = await UI.escolher({ titulo: 'Encerrar conta fixa?', mensagem: `“${esc(f.descricao)}” deixa de ser criada. Os meses já lançados continuam; os próximos ainda não pagos são removidos.`, opcoes: [{ id: 'sim', rotulo: 'Encerrar', estilo: 'perigo-forte' }] });
      if (!r) return;
      Store.gravar('fixas', Modelo.fixa({ ...f, ativo: false }));
      Store.dados.lancamentos.filter((l) => l.fixa === f.id && l.data > Datas.hoje() && !l.pago).forEach((l) => Store.remover('lancamentos', l.id));
      await UI.fechar();
      App.renderAba();
      UI.toast('Conta fixa encerrada');
    });
  },
};

/* ---------- Compromissos com valor: cada ocorrência vira uma despesa ligada ----------
   Compromisso em aberto = despesa "a pagar". Concluir o compromisso = pagar, e vice-versa. */
const Vinculos = {
  id: (ev, data) => (ev.recorrencia === 'nao' ? `ev-${ev.id}` : `ev-${ev.id}-${data}`),
  inicio() { return Datas.hoje().slice(0, 8) + '01'; },
  limite() { return Datas.somar(Datas.somarMeses(Datas.hoje(), 2), -1); }, /* fim do próximo mês */
  datas(ev) {
    if (ev.recorrencia === 'nao') return [ev.data];
    const ini = ev.data > this.inicio() ? ev.data : this.inicio();
    return Agenda.ocorrencias(ev, ini, this.limite());
  },
  lancamento(ev, data) { return Store.lancamento(this.id(ev, data)); },

  /* Mantém evento e despesa coerentes (inclusive depois de sincronizar entre celulares). */
  sincronizar() {
    let mudou = false;
    const validos = new Set();
    for (const ev of Store.dados.eventos) {
      if (!ev.valor) continue;
      for (const data of this.datas(ev)) {
        const id = this.id(ev, data);
        validos.add(id);
        const apagado = Store.dados.removidos[id];
        if (apagado && apagado >= ev.atualizado) continue; /* apagado de propósito (vale até o compromisso ser editado) */
        const feito = ev.feitos.includes(data);
        let l = Store.lancamento(id);
        if (!l) {
          l = Modelo.lancamento({ id, data, descricao: ev.titulo, categoria: ev.categoria, pessoa: ev.responsavel, tipo: 'despesa', valor: ev.valor, pago: feito, evento: ev.id });
          l.atualizado = apagado ? Date.now() : 1;
          Store.dados.lancamentos.push(l);
          mudou = true;
          continue;
        }
        if (l.pago !== feito) {
          if (l.atualizado > ev.atualizado) {
            ev.feitos = l.pago ? [...ev.feitos, data] : ev.feitos.filter((d) => d !== data);
            ev.atualizado = l.atualizado;
          } else {
            l.pago = feito;
            l.atualizado = ev.atualizado;
          }
          mudou = true;
        }
        /* enquanto não foi pago, a despesa acompanha o compromisso */
        if (!l.pago && (l.descricao !== ev.titulo || l.valor !== ev.valor || l.data !== data || l.categoria !== ev.categoria || l.pessoa !== ev.responsavel)) {
          Object.assign(l, { descricao: ev.titulo, valor: ev.valor, data, categoria: ev.categoria, pessoa: ev.responsavel });
          mudou = true;
        }
      }
    }
    /* despesas em aberto de compromissos apagados, sem valor ou que mudaram de data */
    const desde = this.inicio();
    for (const l of [...Store.dados.lancamentos]) {
      if (!l.evento || l.pago || validos.has(l.id) || l.data < desde) continue;
      Store.remover('lancamentos', l.id);
    }
    if (mudou) Store.salvar();
  },

  /* Pagou no Financeiro → conclui o compromisso daquele dia. */
  aoPagar(l) {
    if (!l || !l.evento) return;
    const ev = Store.evento(l.evento);
    if (!ev) return;
    const data = l.data;
    const tem = ev.feitos.includes(data);
    if (l.pago && !tem) ev.feitos.push(data);
    if (!l.pago && tem) ev.feitos = ev.feitos.filter((d) => d !== data);
    Store.tocar(ev);
  },
  /* Concluiu na agenda → paga a despesa daquele dia. */
  aoConcluir(ev, data, feito) {
    if (!ev.valor) return;
    const l = this.lancamento(ev, data);
    if (l && l.pago !== feito) { l.pago = feito; Store.tocar(l); }
  },
};
