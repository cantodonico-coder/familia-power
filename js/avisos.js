'use strict';

/* Família Power · Avisos com o app fechado (Web Push + GitHub Actions) */

/* =========================================================
   AVISOS COM O APP FECHADO (Web Push + GitHub Actions no repositório privado)
   ========================================================= */
const Push = {
  CHAVE: 'familia.dispositivo',
  get suportado() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!window.crypto?.subtle; },
  get idAparelho() {
    let id = localStorage.getItem(this.CHAVE);
    if (!id) { id = 'ap-' + uid(); localStorage.setItem(this.CHAVE, id); }
    return id;
  },
  ativoAqui() { return Store.dados.dispositivos.some((d) => d.id === this.idAparelho); },

  b64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  deB64url(txt) {
    const b = atob(txt.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (txt.length % 4)) % 4));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  },

  /* Lê um arquivo do repositório de dados (null se não existir). */
  async lerArquivo(caminho) {
    const r = await Sync.api(`/contents/${caminho}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Não consegui ler ${caminho} (${r.status}).`);
    const j = await r.json();
    return { texto: b64dec(j.content), sha: j.sha };
  },
  async gravarArquivo(caminho, conteudo, mensagem) {
    const atual = await this.lerArquivo(caminho);
    if (atual && atual.texto === conteudo) return true;
    const corpo = { message: mensagem, content: b64enc(conteudo) };
    if (atual) corpo.sha = atual.sha;
    const r = await Sync.api(`/contents/${caminho}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    return r.ok;
  },

  /* Chaves do envio (VAPID): criadas uma vez e guardadas só no repositório privado. */
  async chaves() {
    const existente = await this.lerArquivo('push.json');
    if (existente) return JSON.parse(existente.texto);
    const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const privada = (await crypto.subtle.exportKey('jwk', par.privateKey)).d;
    const publica = this.b64url(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
    const cfg = { publica, privada, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo', criado: new Date().toISOString() };
    if (!(await this.gravarArquivo('push.json', JSON.stringify(cfg, null, 1), 'Família Power: chaves dos avisos'))) throw new Error('Não consegui gravar a configuração dos avisos no GitHub.');
    return cfg;
  },

  /* Instala a rotina que envia os avisos. Retorna false se o token não puder mexer em workflows. */
  async instalarRotina() {
    const [yml, js] = await Promise.all(['extras/avisos.yml', 'extras/avisos.js'].map((f) => fetch(f, { cache: 'no-cache' }).then((r) => r.text())));
    const okJs = await this.gravarArquivo('.github/avisos.js', js, 'Família Power: script dos avisos');
    const okYml = okJs && await this.gravarArquivo('.github/workflows/avisos.yml', yml, 'Família Power: rotina dos avisos');
    return okJs && okYml;
  },

  async ativar() {
    if (!Sync.cfg) return UI.toast('Conecte o app à família primeiro (⚙ → Conectar ao GitHub).');
    if (!this.suportado) return UI.toast('Este navegador não aceita avisos com o app fechado.');
    if ((await Notification.requestPermission()) !== 'granted') return UI.toast('Permita as notificações para ativar os avisos.');
    UI.toast('Preparando os avisos…');
    try {
      const cfg = await this.chaves();
      const rotina = await this.instalarRotina();
      const reg = await navigator.serviceWorker.ready;
      const atual = await reg.pushManager.getSubscription();
      if (atual) await atual.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.deB64url(cfg.publica) });
      Store.gravar('dispositivos', Modelo.dispositivo({ id: this.idAparelho, nome: Perfil.nome, sub: sub.toJSON() }));
      await Sync.sincronizar();
      if (rotina) UI.toast('Avisos ativados neste aparelho');
      else PushUI.rotinaManual();
    } catch (e) {
      console.error(e);
      UI.toast(e.message || 'Não foi possível ativar os avisos.');
    }
  },

  async desativar() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch { /* ignora */ }
    Store.remover('dispositivos', this.idAparelho);
    UI.toast('Avisos com o app fechado desativados neste aparelho');
  },
};

const PushUI = {
  /* Quando o token não tem a permissão "Workflows", o usuário envia os 2 arquivos à mão. */
  rotinaManual() {
    const url = (c) => `https://github.com/${encodeURIComponent(Sync.cfg.dono)}/${encodeURIComponent(Sync.cfg.repo)}/upload/main/${c}`;
    const folha = UI.abrir({
      titulo: 'Falta um passo no GitHub',
      corpo: `<p>Este aparelho já está pronto. Falta instalar a rotina que envia os avisos. Escolha um dos caminhos:</p>
        <h3 class="grupo-tit">Mais fácil</h3>
        <p>No GitHub, edite o token e adicione a permissão <b>Workflows: Read and write</b>. Depois toque em “Ativar” de novo.</p>
        <h3 class="grupo-tit">Ou envie os arquivos</h3>
        <div class="lista-opcoes">
          <button type="button" class="opcao" data-baixar="avisos.js"><span><b>1. Baixar avisos.js</b><small>Enviar para a pasta .github</small></span></button>
          <a class="opcao" href="${url('.github')}" target="_blank" rel="noopener"><span><b>Abrir envio para .github</b><small>${esc(Sync.cfg.repo)}</small></span></a>
          <button type="button" class="opcao" data-baixar="avisos.yml"><span><b>2. Baixar avisos.yml</b><small>Enviar para a pasta .github/workflows</small></span></button>
          <a class="opcao" href="${url('.github/workflows')}" target="_blank" rel="noopener"><span><b>Abrir envio para .github/workflows</b><small>${esc(Sync.cfg.repo)}</small></span></a>
        </div>`,
    });
    folha.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-baixar]');
      if (!b) return;
      const txt = await fetch(`extras/${b.dataset.baixar}`, { cache: 'no-cache' }).then((r) => r.text());
      baixarArquivo(txt, b.dataset.baixar, 'text/plain');
    });
  },
};
