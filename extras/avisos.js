'use strict';
/* Família Power — envia os avisos da agenda e das contas para os celulares,
   mesmo com o app fechado. Roda no GitHub Actions do repositório privado de dados.
   Não imprime dados da família no log: só contagens. */
const fs = require('fs');
const webpush = require('web-push');

const ler = (arquivo, padrao) => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return padrao; } };
const dados = ler('dados.json', null);
const cfg = ler('push.json', null);
if (!dados || !cfg || !cfg.publica || !cfg.privada) { console.log('Sem dados ou sem configuração de avisos.'); process.exit(0); }
const aparelhos = (dados.dispositivos || []).filter((d) => d && d.sub && d.sub.endpoint);
if (!aparelhos.length) { console.log('Nenhum aparelho com avisos ativados.'); process.exit(0); }
webpush.setVapidDetails('mailto:avisos@familia-power.app', cfg.publica, cfg.privada);

/* Data e hora no fuso da família */
const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: cfg.fuso || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date()).map((p) => [p.type, p.value]));
const hoje = `${partes.year}-${partes.month}-${partes.day}`;
const agora = Number(partes.hour) * 60 + Number(partes.minute);
const JANELA = 180; /* tolera atrasos do agendador do GitHub */

const pad = (n) => String(n).padStart(2, '0');
const parse = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const somar = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const minutos = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const reais = (c) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);

function ocorreEm(ev, data) {
  if (data < ev.data || (ev.excecoes || []).includes(data)) return false;
  const r = ev.recorrencia || 'nao';
  if (r === 'nao') return data === ev.data;
  if (r === 'diaria') return true;
  if (r === 'semanal') return Math.round((parse(data) - parse(ev.data)) / 864e5) % 7 === 0;
  const b = parse(ev.data), d = parse(data);
  if (r === 'mensal') return d.getUTCDate() === b.getUTCDate();
  if (r === 'anual') return d.getUTCDate() === b.getUTCDate() && d.getUTCMonth() === b.getUTCMonth();
  return false;
}

const avisos = [];
const amanha = somar(hoje, 1);
for (const ev of dados.eventos || []) {
  if (!ev.aviso) continue;
  for (const data of [hoje, amanha]) {
    if (!ocorreEm(ev, data) || (ev.feitos || []).includes(data)) continue;
    const diaAviso = ev.hora && ev.aviso > ev.hora ? somar(data, -1) : data;
    if (diaAviso !== hoje) continue;
    const m = minutos(ev.aviso);
    if (m > agora || agora - m > JANELA) continue;
    if (data === hoje && ev.hora && minutos(ev.hora) <= agora) continue;
    const quando = (data === hoje ? 'Hoje' : 'Amanhã') + (ev.hora ? ` às ${ev.hora}` : '');
    avisos.push({ tag: `${ev.id}|${data}`, titulo: ev.titulo, corpo: [quando, ev.responsavel, ev.local].filter(Boolean).join(' · ') });
  }
}
for (const l of dados.lancamentos || []) {
  if (l.tipo !== 'despesa' || l.pago || l.data !== hoje) continue;
  if (9 * 60 > agora || agora - 9 * 60 > JANELA) continue;
  avisos.push({ tag: `conta:${l.id}|${l.data}`, titulo: `Pagar ${l.descricao}`, corpo: `Vence hoje · ${reais(l.valor)}` });
}

(async () => {
  const enviados = ler('avisos-enviados.json', {});
  const antes = JSON.stringify(enviados);
  let envios = 0, falhas = 0;
  for (const a of avisos) {
    if (enviados[a.tag]) continue;
    const corpo = JSON.stringify(a);
    for (const d of aparelhos) {
      try { await webpush.sendNotification(d.sub, corpo, { TTL: 3 * 3600 }); envios++; } catch { falhas++; }
    }
    enviados[a.tag] = hoje;
  }
  const limite = somar(hoje, -3);
  for (const k of Object.keys(enviados)) if (enviados[k] < limite) delete enviados[k];
  if (JSON.stringify(enviados) !== antes) fs.writeFileSync('avisos-enviados.json', JSON.stringify(enviados, null, 1));
  console.log(`Avisos no horário: ${avisos.length} · envios: ${envios} · falhas: ${falhas}`);
})();
