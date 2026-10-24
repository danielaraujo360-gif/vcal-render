// Acompanha os posts 2, 3 e 4 até serem publicados (ou darem erro). Até 70 minutos.
import { sql } from './d1.mjs';
import { api } from '../../../AppData/Local/Temp/claude/C--Users-samue/89a1239c-dd9c-4d81-9d12-1bf0b0b16bed/scratchpad/r1/n8n.mjs';
const fim = Date.now() + 70 * 60e3;
let ultimo = '';
while (Date.now() < fim) {
  const r = (await sql(["SELECT id, status, ig_media_id, publicado_em FROM vcal_posts WHERE id IN (2,3,4) ORDER BY id"]))[0].result[0].results;
  const linha = r.map(x => `#${x.id}:${x.status}`).join(' ');
  const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  if (linha !== ultimo) { console.log(hora, linha); ultimo = linha; }
  const erros = (await api('GET', '/executions?workflowId=7sdGI9ruusMq8CzM&status=error&limit=3&includeData=true')).data.filter(e => new Date(e.startedAt) > new Date(Date.now() - 75 * 60e3));
  if (erros.length) { const e = erros[0].data.resultData; console.log('ERRO na publicação:', e.lastNodeExecuted, '|', e.error?.message); break; }
  if (r.every(x => x.status === 'publicado')) { console.log('TODOS PUBLICADOS'); r.forEach(x => console.log('#' + x.id, x.ig_media_id, x.publicado_em)); break; }
  await new Promise(s => setTimeout(s, 60000));
}
