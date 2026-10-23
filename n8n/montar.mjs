// Cria ou atualiza no n8n os workflows da automação de posts do VCALendar (por nome).
//   VCAL - Erros               -> avisa no Telegram quando algum fluxo falha
//   VCAL - Gerar Post          -> sub-fluxo: texto (Claude) + fotos (Cloudflare) + montagem (vcal-render) + banco + prévia no Telegram
//   VCAL - Preparar Dia        -> todo dia 20h (ou à mão pelo webhook) decide os posts de amanhã e chama o Gerar Post
//   VCAL - Aprovacoes Telegram -> botões da prévia: aprovar, refazer foto/texto/tudo
import fs from 'node:fs';
import path from 'node:path';
import { api } from '../../../AppData/Local/Temp/claude/C--Users-samue/89a1239c-dd9c-4d81-9d12-1bf0b0b16bed/scratchpad/r1/n8n.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const codigo = f => fs.readFileSync(path.join(DIR, 'codigo', f), 'utf8');
const RENDER = 'https://agenciadeia-vcal-render.bqvblq.easypanel.host';
const D1 = 'https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/d1/database/59b8965a-4614-4e2e-b68a-29630426618b/query';
const CF = 'https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/ai/run/@cf/black-forest-labs/flux-1-schnell';
const CHAT = '7873865778';
const C = {
  d1: { httpHeaderAuth: { id: '4Oyp4hh1N3oXKoYC', name: 'Cloudflare D1 API' } },
  or: { httpHeaderAuth: { id: 'iRIF3y0oqYeaBoJI', name: 'OpenRouter API' } },
  cf: { httpHeaderAuth: { id: 'n9zHhMCwp4Dbql7U', name: 'Cloudflare Workers AI (vcal-imagens)' } },
  render: { httpHeaderAuth: { id: 'NIzd9nOlGMiuKrXs', name: 'VCAL Render API Key' } },
  tg: { telegramApi: { id: 'gsJqulkHoYN3v2ub', name: 'Telegram VCAL Aprovações' } },
};

let n = 0;
const no = (name, type, typeVersion, x, y, parameters, extra = {}) => ({ id: 'vcal-' + (++n), name, type, typeVersion, position: [x, y], parameters, ...extra });
const http = (name, x, y, cred, url, corpo, extra = {}) => no(name, 'n8n-nodes-base.httpRequest', 4.2, x, y, {
  method: 'POST', url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
  sendBody: true, specifyBody: 'json', jsonBody: corpo, options: { timeout: extra.timeout || 120000 },
}, { credentials: cred, ...(extra.retry ? { retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 } : {}) });
const code = (name, x, y, arquivo) => no(name, 'n8n-nodes-base.code', 2, x, y, { jsCode: codigo(arquivo) });
const se = (name, x, y, expr) => no(name, 'n8n-nodes-base.if', 2, x, y, {
  conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, combinator: 'and',
    conditions: [{ id: name, leftValue: expr, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }] }, options: {},
});
const teclado = idExpr => ({ rows: [
  { row: { buttons: [{ text: '✅ Publicar', additionalFields: { callback_data: '=ok:' + idExpr } }] } },
  { row: { buttons: [{ text: '🔄 Refazer foto', additionalFields: { callback_data: '=foto:' + idExpr } }, { text: '🔄 Refazer texto', additionalFields: { callback_data: '=texto:' + idExpr } }] } },
  { row: { buttons: [{ text: '❌ Refazer tudo', additionalFields: { callback_data: '=tudo:' + idExpr } }] } },
] });
const tg = (name, x, y, parameters) => no(name, 'n8n-nodes-base.telegram', 1.2, x, y, { chatId: CHAT, ...parameters }, { credentials: C.tg });
const liga = pares => {
  const c = {};
  for (const [de, para, saida = 0] of pares) {
    c[de] ||= { main: [] };
    while (c[de].main.length <= saida) c[de].main.push([]);
    c[de].main[saida].push({ node: para, type: 'main', index: 0 });
  }
  return c;
};
const SETTINGS = erroId => ({ executionOrder: 'v1', timezone: 'America/Sao_Paulo', callerPolicy: 'workflowsFromSameOwner', ...(erroId ? { errorWorkflow: erroId } : {}) });

// ---------------- VCAL - Erros ----------------
function wfErros() {
  return { name: 'VCAL - Erros', settings: SETTINGS(), nodes: [
    no('Erro', 'n8n-nodes-base.errorTrigger', 1, 0, 0, {}),
    tg('Avisar Erro', 260, 0, { text: "={{ '⚠️ Erro na automação do VCALendar\\n\\nFluxo: ' + $json.workflow.name + '\\nEtapa: ' + ($json.execution.lastNodeExecuted || '?') + '\\n\\n' + String(($json.execution.error && $json.execution.error.message) || 'sem detalhe').slice(0, 600) }}", additionalFields: { appendAttribution: false } }),
  ], connections: liga([['Erro', 'Avisar Erro']]) };
}

// ---------------- VCAL - Gerar Post ----------------
function wfGerar(erroId) {
  const nodes = [
    no('Gatilho', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, 0, 0, { inputSource: 'passthrough' }),
    http('Carregar Dados', 220, 0, C.d1, D1, "={{ JSON.stringify({ sql: 'SELECT * FROM vcal_posts WHERE id = ' + (Number($json.id) || 0) + \"; SELECT tema FROM vcal_posts WHERE tema IS NOT NULL AND tema <> '' ORDER BY id DESC LIMIT 20;\" }) }}"),
    code('Planejar', 440, 0, 'planejar.js'),
    se('Precisa Texto?', 660, 0, '={{ $json.precisaTexto }}'),
    http('Claude', 880, -120, C.or, 'https://openrouter.ai/api/v1/chat/completions', '={{ JSON.stringify($json.pedidoClaude) }}', { retry: true }),
    code('Ler Texto', 1100, 0, 'ler-texto.js'),
    no('Gerar Foto?', 'n8n-nodes-base.if', 2, 1320, 0, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, combinator: 'and', conditions: [{ id: 'semfoto', leftValue: '={{ $json.semFoto }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } }] }, options: {} }),
    http('Cloudflare', 1540, -120, C.cf, CF, '={{ JSON.stringify({ prompt: $json.prompt, steps: 8 }) }}', { retry: true }),
    http('Guardar Foto', 1760, -120, C.render, RENDER + '/arquivo', "={{ JSON.stringify({ base64: $json.result.image, ext: 'jpg' }) }}", { retry: true }),
    code('Montar Pedido', 1980, 0, 'montar-pedido.js'),
    http('Montar Midia', 2200, 0, C.render, "={{ '" + RENDER + "' + $json.rota }}", '={{ JSON.stringify($json.corpo) }}', { timeout: 300000, retry: true }),
    code('SQL Salvar', 2420, 0, 'sql-salvar.js'),
    http('Salvar D1', 2640, 0, C.d1, D1, '={{ JSON.stringify({ sql: $json.sql, params: $json.params }) }}'),
    code('Mensagem Telegram', 2860, 0, 'mensagem-telegram.js'),
    se('É Vídeo?', 3080, 0, "={{ $json.tipo === 'video' }}"),
    tg('Prévia Vídeo', 3300, -160, { operation: 'sendVideo', file: '={{ $json.primeira }}', replyMarkup: 'inlineKeyboard', inlineKeyboard: teclado('{{ $json.id }}'), additionalFields: { caption: '={{ $json.legenda }}' } }),
    se('É Álbum?', 3300, 80, "={{ $json.tipo === 'album' && $json.midia.length === 5 }}"),
    tg('Prévia Álbum', 3520, 0, { operation: 'sendMediaGroup', media: { media: [0, 1, 2, 3, 4].map(i => ({ type: 'photo', media: `={{ $json.midia[${i}] }}`, additionalFields: i === 0 ? { caption: '={{ $json.legenda }}' } : {} })) }, additionalFields: {} }),
    tg('Botões Álbum', 3740, 0, { text: "={{ '👆 Carrossel #' + $('Mensagem Telegram').first().json.id + ' — o que faço com ele?' }}", replyMarkup: 'inlineKeyboard', inlineKeyboard: teclado("{{ $('Mensagem Telegram').first().json.id }}"), additionalFields: { appendAttribution: false } }),
    tg('Prévia Foto', 3520, 200, { operation: 'sendPhoto', file: '={{ $json.primeira }}', replyMarkup: 'inlineKeyboard', inlineKeyboard: teclado('{{ $json.id }}'), additionalFields: { caption: '={{ $json.legenda }}' } }),
  ];
  return { name: 'VCAL - Gerar Post', settings: SETTINGS(erroId), nodes, connections: liga([
    ['Gatilho', 'Carregar Dados'], ['Carregar Dados', 'Planejar'], ['Planejar', 'Precisa Texto?'],
    ['Precisa Texto?', 'Claude', 0], ['Precisa Texto?', 'Ler Texto', 1], ['Claude', 'Ler Texto'],
    ['Ler Texto', 'Gerar Foto?'], ['Gerar Foto?', 'Cloudflare', 0], ['Gerar Foto?', 'Montar Pedido', 1], ['Cloudflare', 'Guardar Foto'], ['Guardar Foto', 'Montar Pedido'],
    ['Montar Pedido', 'Montar Midia'], ['Montar Midia', 'SQL Salvar'], ['SQL Salvar', 'Salvar D1'], ['Salvar D1', 'Mensagem Telegram'],
    ['Mensagem Telegram', 'É Vídeo?'], ['É Vídeo?', 'Prévia Vídeo', 0], ['É Vídeo?', 'É Álbum?', 1],
    ['É Álbum?', 'Prévia Álbum', 0], ['É Álbum?', 'Prévia Foto', 1], ['Prévia Álbum', 'Botões Álbum'],
  ]) };
}

// ---------------- VCAL - Preparar Dia ----------------
function wfPreparar(gerarId, erroId) {
  const nodes = [
    no('Todo Dia 20h', 'n8n-nodes-base.scheduleTrigger', 1.2, 0, 0, { rule: { interval: [{ field: 'cronExpression', expression: '0 20 * * *' }] } }),
    no('Gerar Agora', 'n8n-nodes-base.webhook', 2, 0, 200, { httpMethod: 'GET', path: 'vcal-gerar-agora', authentication: 'headerAuth', responseMode: 'onReceived', options: {} }, { webhookId: 'vcal-gerar-agora', credentials: C.render }),
    http('Historico', 240, 100, C.d1, D1, "={{ JSON.stringify({ sql: \"SELECT id, data_publicar, formato, bloco, posicao, status FROM vcal_posts WHERE status IN ('aguardando','aprovado','publicado','gerando') ORDER BY data_publicar DESC, id DESC LIMIT 30; SELECT COUNT(*) AS n FROM vcal_posts WHERE status IN ('aguardando','aprovado','publicado','gerando');\" }) }}"),
    code('Planejar Dia', 480, 100, 'planejar-dia.js'),
    no('Gerar Post', 'n8n-nodes-base.executeWorkflow', 1.1, 720, 100, { source: 'database', workflowId: { __rl: true, value: gerarId, mode: 'id' }, mode: 'each', options: { waitForSubWorkflow: true } }, { onError: 'continueRegularOutput' }),
  ];
  return { name: 'VCAL - Preparar Dia', settings: SETTINGS(erroId), nodes, connections: liga([
    ['Todo Dia 20h', 'Historico'], ['Gerar Agora', 'Historico'], ['Historico', 'Planejar Dia'], ['Planejar Dia', 'Gerar Post'],
  ]) };
}

// ---------------- VCAL - Aprovacoes Telegram ----------------
function wfAprovacoes(gerarId, erroId) {
  const nodes = [
    no('Clique no Telegram', 'n8n-nodes-base.telegramTrigger', 1.1, 0, 0, { updates: ['callback_query'], additionalFields: {} }, { webhookId: 'vcal-aprovacoes-telegram', credentials: C.tg }),
    code('Ler Clique', 220, 0, 'ler-clique.js'),
    http('Buscar Post', 440, 0, C.d1, D1, "={{ JSON.stringify({ sql: 'SELECT id, status, tentativa, formato, data_publicar FROM vcal_posts WHERE id = ' + (Number($json.id) || 0) }) }}"),
    code('Decidir', 660, 0, 'decidir.js'),
    no('Responder Clique', 'n8n-nodes-base.telegram', 1.2, 880, 0, { resource: 'callback', operation: 'answerQuery', queryId: '={{ $json.queryId }}', additionalFields: { text: '={{ $json.resposta.slice(0, 190) }}' } }, { credentials: C.tg, onError: 'continueRegularOutput' }),
    tg('Avisar', 1100, 0, { text: "={{ $('Decidir').first().json.resposta }}", additionalFields: { appendAttribution: false } }),
    se('Tem SQL?', 1320, 0, "={{ !!$('Decidir').first().json.sql }}"),
    http('Atualizar Post', 1540, -100, C.d1, D1, "={{ JSON.stringify($('Decidir').first().json.sql) }}"),
    se('Refazer?', 1760, 0, "={{ !!$('Decidir').first().json.gerar }}"),
    no('Pedido Refazer', 'n8n-nodes-base.code', 2, 1980, -100, { jsCode: "return [{ json: $('Decidir').first().json.gerar }];" }),
    no('Gerar de Novo', 'n8n-nodes-base.executeWorkflow', 1.1, 2200, -100, { source: 'database', workflowId: { __rl: true, value: gerarId, mode: 'id' }, mode: 'once', options: { waitForSubWorkflow: false } }),
  ];
  return { name: 'VCAL - Aprovacoes Telegram', settings: SETTINGS(erroId), nodes, connections: liga([
    ['Clique no Telegram', 'Ler Clique'], ['Ler Clique', 'Buscar Post'], ['Buscar Post', 'Decidir'], ['Decidir', 'Responder Clique'], ['Responder Clique', 'Avisar'],
    ['Avisar', 'Tem SQL?'], ['Tem SQL?', 'Atualizar Post', 0], ['Tem SQL?', 'Refazer?', 1], ['Atualizar Post', 'Refazer?'],
    ['Refazer?', 'Pedido Refazer', 0], ['Pedido Refazer', 'Gerar de Novo'],
  ]) };
}

// ---------------- criar/atualizar ----------------
const existentes = (await api('GET', '/workflows?limit=250')).data;
async function salvar(wf, ativar) {
  const atual = existentes.find(w => w.name === wf.name);
  let r;
  if (atual) { if (atual.active) await api('POST', `/workflows/${atual.id}/deactivate`); r = await api('PUT', `/workflows/${atual.id}`, wf); }
  else r = await api('POST', '/workflows', wf);
  if (ativar) await api('POST', `/workflows/${r.id}/activate`);
  const v = await api('GET', `/workflows/${r.id}`);
  console.log(`${v.name}: id ${v.id} | ativo ${v.active} | nós ${v.nodes.length}`);
  return v.id;
}
const erroId = await salvar(wfErros(), true);
const gerarId = await salvar(wfGerar(erroId), true);
await salvar(wfPreparar(gerarId, erroId), process.argv.includes('--ativar-agenda'));
await salvar(wfAprovacoes(gerarId, erroId), true);
