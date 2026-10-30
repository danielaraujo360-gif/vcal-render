// Cria ou atualiza no n8n os workflows da automação de posts do VCALendar (por nome).
//   VCAL - Erros               -> avisa no Telegram quando algum fluxo falha
//   VCAL - Gerar Post          -> sub-fluxo: texto (Claude) + fotos (Cloudflare) + montagem (vcal-render) + banco, já aprovado
//   VCAL - Preparar Dia        -> todo dia 21:15, depois de a cota do Cloudflare renovar às 21h (ou à mão pelo webhook) decide os posts de amanhã e chama o Gerar Post
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
const teclado = (idExpr, comFoto = true) => ({ rows: [
  { row: { buttons: [{ text: '✅ Publicar', additionalFields: { callback_data: '=ok:' + idExpr } }] } },
  { row: { buttons: [...(comFoto ? [{ text: '🔄 Refazer foto', additionalFields: { callback_data: '=foto:' + idExpr } }] : []), { text: '🔄 Refazer texto', additionalFields: { callback_data: '=texto:' + idExpr } }] } },
  { row: { buttons: [{ text: '❌ Refazer tudo', additionalFields: { callback_data: '=tudo:' + idExpr } }] } },
] });
// Telegram: todo texto vai em HTML escapado (sem isso, um "_" num link ou hashtag vira itálico e a mensagem é recusada).
const escapar = v => typeof v === 'string' && v.startsWith('={{') ? '={{ String(' + v.slice(3, -2).trim() + " ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }}" : v;
const tg = (name, x, y, parameters) => {
  const p = { chatId: CHAT, ...parameters };
  if (p.text) p.text = escapar(p.text);
  p.additionalFields = { ...(p.additionalFields || {}), parse_mode: 'HTML' };
  if (p.additionalFields.caption) p.additionalFields.caption = escapar(p.additionalFields.caption);
  return no(name, 'n8n-nodes-base.telegram', 1.2, x, y, p, { credentials: C.tg });
};
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
  ];
  return { name: 'VCAL - Gerar Post', settings: SETTINGS(erroId), nodes, connections: liga([
    ['Gatilho', 'Carregar Dados'], ['Carregar Dados', 'Planejar'], ['Planejar', 'Precisa Texto?'],
    ['Precisa Texto?', 'Claude', 0], ['Precisa Texto?', 'Ler Texto', 1], ['Claude', 'Ler Texto'],
    ['Ler Texto', 'Gerar Foto?'], ['Gerar Foto?', 'Cloudflare', 0], ['Gerar Foto?', 'Montar Pedido', 1], ['Cloudflare', 'Guardar Foto'], ['Guardar Foto', 'Montar Pedido'],
    ['Montar Pedido', 'Montar Midia'], ['Montar Midia', 'SQL Salvar'], ['SQL Salvar', 'Salvar D1'], 
  ]) };
}

// ---------------- VCAL - Preparar Dia ----------------
function wfPreparar(gerarId, erroId) {
  const nodes = [
    no('Todo Dia 21h15', 'n8n-nodes-base.scheduleTrigger', 1.2, 0, 0, { rule: { interval: [{ field: 'cronExpression', expression: '15 21 * * *' }] } }),
    no('Gerar Agora', 'n8n-nodes-base.webhook', 2, 0, 200, { httpMethod: 'GET', path: 'vcal-gerar-agora', authentication: 'headerAuth', responseMode: 'onReceived', options: {} }, { webhookId: 'vcal-gerar-agora', credentials: C.render }),
    http('Historico', 240, 100, C.d1, D1, "={{ JSON.stringify({ sql: \"SELECT id, data_publicar, formato, bloco, posicao, status FROM vcal_posts WHERE status IN ('aguardando','aprovado','publicado','gerando') ORDER BY data_publicar DESC, id DESC LIMIT 30; SELECT COUNT(*) AS n FROM vcal_posts WHERE status IN ('aguardando','aprovado','publicado','gerando');\" }) }}"),
    code('Planejar Dia', 480, 100, 'planejar-dia.js'),
    no('Gerar Post', 'n8n-nodes-base.executeWorkflow', 1.1, 720, 100, { source: 'database', workflowId: { __rl: true, value: gerarId, mode: 'id' }, mode: 'each', options: { waitForSubWorkflow: true } }, { onError: 'continueRegularOutput' }),
    no('Saldo OpenRouter', 'n8n-nodes-base.httpRequest', 4.2, 240, -160, { method: 'GET', url: 'https://openrouter.ai/api/v1/credits', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: { timeout: 60000, response: { response: { neverError: true } } } }, { credentials: C.or }),
    code('Checar Saude', 480, -160, 'checar-saude.js'),
    tg('Avisar Manutencao', 720, -160, { text: '={{ $json.texto }}', additionalFields: { appendAttribution: false } }),
  ];
  return { name: 'VCAL - Preparar Dia', settings: SETTINGS(erroId), nodes, connections: liga([
    ['Todo Dia 21h15', 'Historico'], ['Todo Dia 21h15', 'Saldo OpenRouter'], ['Gerar Agora', 'Historico'], ['Historico', 'Planejar Dia'], ['Planejar Dia', 'Gerar Post'],
    ['Saldo OpenRouter', 'Checar Saude'], ['Checar Saude', 'Avisar Manutencao'],
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

// ---------------- VCAL - Publicar (Instagram @appvcal) ----------------
const IG = '17841430968237584', PAGINA = '1433562539832721';
const GRAPH = 'https://graph.facebook.com/v21.0/';
const C_IG = { httpHeaderAuth: { id: 'TADk0AjYNTCOXI4k', name: 'Instagram VCAL (@appvcal)' } };
const httpIg = (name, x, y, url, corpo) => no(name, 'n8n-nodes-base.httpRequest', 4.2, x, y, {
  method: corpo ? 'POST' : 'GET', url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
  ...(corpo ? { sendBody: true, specifyBody: 'json', jsonBody: corpo } : {}), options: { timeout: 120000, response: { response: { neverError: true } } },
}, { credentials: C_IG });
function wfPublicar(erroId) {
  const agora = "$now.setZone('America/Sao_Paulo').toFormat('yyyy-MM-dd HH:mm')";
  const P = "$('Preparar').first().json";
  const nodes = [
    no('A Cada 10 Min', 'n8n-nodes-base.scheduleTrigger', 1.2, 0, 0, { rule: { interval: [{ field: 'minutes', minutesInterval: 10 }] } }),
    http('Buscar Vencidos', 220, 0, C.d1, D1, `={{ JSON.stringify({ sql: "UPDATE vcal_posts SET status = 'pulado', atualizado_em = datetime('now') WHERE status IN ('aguardando','gerando') AND data_publicar <= '" + ${agora} + "' RETURNING id; SELECT * FROM vcal_posts WHERE status = 'aprovado' AND data_publicar <= '" + ${agora} + "' ORDER BY data_publicar LIMIT 1;" }) }}`),
    code('Preparar', 440, 0, 'publicar-preparar.js'),
    se('Teve Pulado?', 660, 0, '={{ $json.pulados.length > 0 }}'),
    tg('Avisar Pulados', 880, -120, { text: "={{ '⏭️ Não publiquei o(s) post(s) #' + $json.pulados.join(', #') + ' porque não foram aprovados até a hora. A sequência de cores continua no próximo.' }}", additionalFields: { appendAttribution: false } }),
    se('Tem Post?', 1100, 0, `={{ ${P}.tem }}`),
    http('Marcar Publicando', 1320, 0, C.d1, D1, `={{ JSON.stringify({ sql: "UPDATE vcal_posts SET status = 'publicando', atualizado_em = datetime('now') WHERE id = ? AND status = 'aprovado' RETURNING id", params: [${P}.id] }) }}`),
    se('É Carrossel?', 1540, 0, `={{ ${P}.tipo === 'carrossel' }}`),
    code('Filhos', 1760, -140, 'publicar-filhos.js'),
    httpIg('Criar Filho', 1980, -140, GRAPH + IG + '/media', '={{ JSON.stringify($json) }}'),
    no('Juntar Filhos', 'n8n-nodes-base.code', 2, 2200, -140, { jsCode: `const ids = $input.all().map(i => i.json.id);\nif (!ids.length || ids.some(x => !x)) throw new Error('O Instagram recusou uma das imagens do carrossel (' + String(($input.all().find(i => !i.json.id) || { json: {} }).json.error?.message || '').replace(/:/g, ' -') + ')');\nreturn [{ json: { media_type: 'CAROUSEL', children: ids.join(','), caption: ${P}.legenda } }];` }),
    httpIg('Criar Carrossel', 2420, -140, GRAPH + IG + '/media', '={{ JSON.stringify($json) }}'),
    httpIg('Criar Container', 1760, 120, GRAPH + IG + '/media', `={{ JSON.stringify(${P}.tipo === 'reels' ? { media_type: 'REELS', video_url: ${P}.midia[0], caption: ${P}.legenda, share_to_feed: true } : { image_url: ${P}.midia[0], caption: ${P}.legenda }) }}`),
    code('Container', 2640, 0, 'publicar-container.js'),
    no('Esperar 15s', 'n8n-nodes-base.wait', 1.1, 2860, 0, { amount: 15, unit: 'seconds' }, { webhookId: 'vcal-publicar-esperar' }),
    httpIg('Status', 3080, 0, "={{ '" + GRAPH + "' + $('Container').first().json.creation_id + '?fields=status_code,status' }}"),
    code('Avaliar', 3300, 0, 'publicar-avaliar.js'),
    se('Pronto?', 3520, 0, '={{ $json.pronto }}'),
    httpIg('Publicar', 3740, -100, GRAPH + IG + '/media_publish', '={{ JSON.stringify({ creation_id: $json.creation_id }) }}'),
    httpIg('Link', 3960, -100, "={{ '" + GRAPH + "' + $('Publicar').first().json.id + '?fields=permalink' }}"),
    http('Marcar Publicado', 4180, -100, C.d1, D1, `={{ JSON.stringify({ sql: "UPDATE vcal_posts SET status = 'publicado', ig_media_id = ?, publicado_em = datetime('now'), atualizado_em = datetime('now') WHERE id = ?", params: [$('Publicar').first().json.id, ${P}.id] }) }}`),
    tg('Avisar Publicado', 4400, -100, { text: `={{ '✅ Post #' + ${P}.id + ' publicado no Instagram!\\n' + ($('Link').first().json.permalink || '') }}`, additionalFields: { appendAttribution: false } }),
    // página do Facebook (mesmo token: é token da página VCALendar, com pages_manage_posts)
    code('FB Preparar', 4620, -100, 'publicar-facebook.js'),
    httpIg('FB Enviar', 4840, -100, "={{ '" + GRAPH + PAGINA + "/' + $json.rota }}", '={{ JSON.stringify($json.corpo) }}'),
    no('FB Juntar', 'n8n-nodes-base.code', 2, 5060, -100, { jsCode: `const r = $input.all().map(i => i.json);\nconst falha = r.find(x => !x.id);\nif (falha) throw new Error('Publicado no Instagram, mas o Facebook recusou (' + String(falha.error?.message || 'sem resposta').replace(/:/g, ' -') + ')');\nif (${P}.tipo !== 'carrossel') return [];\nreturn [{ json: { message: ${P}.legenda, attached_media: r.map(x => ({ media_fbid: x.id })) } }];` }),
    httpIg('FB Post Carrossel', 5280, -100, GRAPH + PAGINA + '/feed', '={{ JSON.stringify($json) }}'),
    no('FB Conferir', 'n8n-nodes-base.code', 2, 5500, -100, { jsCode: `if (!$json.id) throw new Error('Publicado no Instagram, mas o Facebook recusou o carrossel (' + String($json.error?.message || 'sem resposta').replace(/:/g, ' -') + ')');\nreturn [];` }),
  ];
  return { name: 'VCAL - Publicar', settings: SETTINGS(erroId), nodes, connections: liga([
    ['A Cada 10 Min', 'Buscar Vencidos'], ['Buscar Vencidos', 'Preparar'], ['Preparar', 'Teve Pulado?'],
    ['Teve Pulado?', 'Avisar Pulados', 0], ['Teve Pulado?', 'Tem Post?', 1], ['Avisar Pulados', 'Tem Post?'],
    ['Tem Post?', 'Marcar Publicando', 0], ['Marcar Publicando', 'É Carrossel?'],
    ['É Carrossel?', 'Filhos', 0], ['Filhos', 'Criar Filho'], ['Criar Filho', 'Juntar Filhos'], ['Juntar Filhos', 'Criar Carrossel'], ['Criar Carrossel', 'Container'],
    ['É Carrossel?', 'Criar Container', 1], ['Criar Container', 'Container'],
    ['Container', 'Esperar 15s'], ['Esperar 15s', 'Status'], ['Status', 'Avaliar'], ['Avaliar', 'Pronto?'],
    ['Pronto?', 'Publicar', 0], ['Pronto?', 'Esperar 15s', 1], ['Publicar', 'Link'], ['Link', 'Marcar Publicado'], ['Marcar Publicado', 'Avisar Publicado'],
    ['Avisar Publicado', 'FB Preparar'], ['FB Preparar', 'FB Enviar'], ['FB Enviar', 'FB Juntar'], ['FB Juntar', 'FB Post Carrossel'], ['FB Post Carrossel', 'FB Conferir'],
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
await salvar(wfPublicar(erroId), process.argv.includes('--ativar-publicacao'));
