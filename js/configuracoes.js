'use strict';

/* Família Power · Backup e configurações */

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
    Store.dados = { eventos: [], lancamentos: [], compras: [], cardapio: [], pratos: [], fixas: [], dispositivos: [], removidos: {} };
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
          <button type="button" class="opcao" data-acao="versoes"><span><b>Versões anteriores</b><small>Desfazer: voltar os dados a como estavam antes</small></span></button>
          <button type="button" class="opcao${Sync.diasParaVencer() !== null && Sync.diasParaVencer() <= 7 ? ' perigo' : ''}" data-acao="token"><span><b>Trocar token</b><small>${Sync.cfg.validade ? `Vence em ${Datas.br(Sync.cfg.validade)}` : 'Validade não informada'}</small></span></button>
          <button type="button" class="opcao" data-acao="convite"><span><b>Convidar para a família</b><small>Link que conecta outro celular aos mesmos dados</small></span></button>
          <button type="button" class="opcao perigo" data-acao="desconectar"><span><b>Desconectar este aparelho</b><small>Os dados continuam aqui e no GitHub</small></span></button>` : `
          <button type="button" class="opcao" data-acao="conectar"><span><b>Conectar ao GitHub</b><small>Você e sua família veem e editam os mesmos dados</small></span></button>`}
        </div>
        <h3 class="grupo-tit">Você</h3>
        <div class="lista-opcoes"><button type="button" class="opcao" data-acao="nome"><span><b>${Perfil.nome ? esc(Perfil.nome) : 'Seu nome'}</b><small>${Perfil.nome ? 'Nome deste aparelho · toque para mudar' : 'Para a família ver quem registrou cada item'}</small></span></button></div>
        <h3 class="grupo-tit">Privacidade</h3>
        <div class="lista-opcoes">${Bloqueio.ativo() ? `
          <button type="button" class="opcao" data-acao="pin-trocar"><span><b>Trocar PIN</b><small>Pedido ao abrir o app e após 5 min fora dele</small></span></button>
          <button type="button" class="opcao perigo" data-acao="pin-tirar"><span><b>Desativar PIN</b></span></button>` : `
          <button type="button" class="opcao" data-acao="pin-ativar"><span><b>Bloqueio com PIN</b><small>Pede um código de 4 a 6 números para abrir</small></span></button>`}
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
        ${Push.suportado ? `<div class="lista-opcoes" style="margin-top:10px">
          <button type="button" class="opcao" data-acao="${Push.ativoAqui() ? 'push-off' : 'push-on'}"><span><b>Avisos com o app fechado</b><small>${!Sync.cfg ? 'Precisa da família conectada ao GitHub' : Push.ativoAqui() ? 'Ativados neste aparelho · toque para desativar' : 'Chegam mesmo com o celular bloqueado'}</small></span></button>
        </div>` : ''}
        <p class="rodape-nota" style="text-align:left">${Push.ativoAqui() ? 'O GitHub confere a agenda a cada 30 minutos (06:00–23:30) e avisa os celulares. Pode chegar alguns minutos depois do horário.' : 'Sem os avisos com o app fechado, eles aparecem com o app aberto ou em segundo plano. Também dá para usar “Salvar no calendário” no compromisso.'}</p>
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
      if (acao === 'nome') {
        await UI.fechar();
        const f = $('form', UI.abrir({ titulo: 'Seu nome', corpo: `<form class="form" novalidate>${UI.campo('Nome neste aparelho', `<input name="eu" value="${esc(Perfil.nome)}" maxlength="40">`)}<button type="submit" class="btn prim bloco">Salvar</button></form>` }));
        f.addEventListener('submit', (ev) => { ev.preventDefault(); Perfil.nome = f.eu.value.trim(); UI.fechar(); UI.toast('Nome salvo'); });
        return;
      }
      if (acao === 'push-on') { await UI.fechar(); return Push.ativar(); }
      if (acao === 'push-off') { await UI.fechar(); return Push.desativar(); }
      if (acao === 'versoes') { await UI.fechar(); SyncUI.versoes(); }
      if (acao === 'token') { await UI.fechar(); SyncUI.trocarToken(); }
      if (acao === 'pin-ativar') { await UI.fechar(); Bloqueio.configurar(); }
      if (acao === 'pin-trocar') { await UI.fechar(); if (await Bloqueio.confirmarAtual()) Bloqueio.configurar(); }
      if (acao === 'pin-tirar') {
        await UI.fechar();
        if (await Bloqueio.confirmarAtual()) { Bloqueio.remover(); UI.toast('PIN desativado'); }
      }
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
