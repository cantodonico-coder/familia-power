'use strict';

/* Família Power · Agenda: compromissos, recorrência, WhatsApp, calendário (.ics) e lembretes
   Desenvolvido por Nicosheik Labs · © 2026 */

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

  /* Contas a pagar (e contas fixas) aparecem na agenda no dia do vencimento. */
  contas() {
    return Store.dados.lancamentos
      .filter((l) => l.tipo === 'despesa' && (!l.pago || l.fixa))
      .map((l) => ({
        id: 'conta:' + l.id, conta: l, titulo: `Pagar ${l.descricao}`, data: l.data, hora: '',
        responsavel: l.pessoa, local: Dinheiro.br(l.valor), aviso: '09:00', obs: '',
        recorrencia: 'nao', feitos: l.pago ? [l.data] : [], excecoes: [],
      }));
  },

  /* Lista de ocorrências já filtradas e ordenadas. */
  listar(de, ate, { status = 'todos', pessoa = '', busca = '' } = {}) {
    const termo = normalizar(busca.trim());
    const itens = [];
    for (const ev of [...Store.dados.eventos, ...this.contas()]) {
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
    if (id.startsWith('conta:')) {
      const l = Store.lancamento(id.slice(6));
      if (!l) return false;
      l.pago = !l.pago;
      Store.tocar(l);
      Store.salvar();
      return l.pago;
    }
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
    const meta = [ev.responsavel, ev.local, Perfil.rotulo(ev.conta || ev)].filter(Boolean).map(esc).join(' · ');
    return `<div class="ev${feito ? ' feito' : ''}${ev.conta ? ' conta' : ''}" data-id="${esc(ev.id)}" data-data="${data}" role="button" tabindex="0" style="--cor:${ev.conta ? 'var(--alert)' : Cores.pessoa(ev.responsavel)}">
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

    if (!Store.dados.eventos.length && !Agenda.contas().length) {
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

  abrirItem(id, data) {
    if (id.startsWith('conta:')) return LancamentoForm.abrir(id.slice(6));
    EventoForm.abrir(id, data);
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
        UI.toast(id.startsWith('conta:') ? (feito ? 'Conta paga' : 'Conta pendente') : feito ? 'Marcado como concluído' : 'Marcado como pendente');
        this.render();
        return $(`.ev[data-id="${CSS.escape(id)}"][data-data="${data}"]`, this.el)?.classList.add('pulso');
      }
      this.abrirItem(ev.dataset.id, ev.dataset.data);
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
        this.abrirItem(e.target.dataset.id, e.target.dataset.data);
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
      ${ev && Perfil.detalhe(ev) ? `<p class="quem">${esc(Perfil.detalhe(ev))}</p>` : ''}
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
    const quando = ev.conta ? `Vence ${Datas.curto(data).toLowerCase()}` : Datas.curto(data) + (ev.hora ? ` às ${ev.hora}` : '');
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
