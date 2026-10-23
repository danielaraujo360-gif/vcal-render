// Testa o nó Telegram do n8n: foto com botões, álbum (carrossel) e vídeo com botões. Workflow temporário.
import { api } from '../../../AppData/Local/Temp/claude/C--Users-samue/89a1239c-dd9c-4d81-9d12-1bf0b0b16bed/scratchpad/r1/n8n.mjs';
import fs from 'node:fs';
const links = JSON.parse(fs.readFileSync('saida/links-prod.json', 'utf8'));
const TG = { telegramApi: { id: 'gsJqulkHoYN3v2ub', name: 'Telegram VCAL Aprovações' } };
const CHAT = '7873865778';
const teclado = id => ({ rows: [
  { row: { buttons: [{ text: '✅ Publicar', additionalFields: { callback_data: `ok:${id}` } }] } },
  { row: { buttons: [{ text: '🔄 Refazer foto', additionalFields: { callback_data: `foto:${id}` } }, { text: '🔄 Refazer texto', additionalFields: { callback_data: `texto:${id}` } }] } },
  { row: { buttons: [{ text: '❌ Refazer tudo', additionalFields: { callback_data: `tudo:${id}` } }] } },
] });
const PATH = 'temp-tg-' + Date.now();
const wf = await api('POST', '/workflows', { name: 'TEMP - Teste Telegram (apagar)', settings: { executionOrder: 'v1' },
  nodes: [
    { id: 't0', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: PATH, parameters: { httpMethod: 'GET', path: PATH, responseMode: 'lastNode', options: {} } },
    { id: 't1', name: 'Foto', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [220, 0], credentials: TG,
      parameters: { operation: 'sendPhoto', chatId: CHAT, file: links.foto, replyMarkup: 'inlineKeyboard', inlineKeyboard: teclado(0), additionalFields: { caption: '🧪 Teste 1/3 — post com botões' } } },
    { id: 't2', name: 'Album', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [440, 0], credentials: TG,
      parameters: { operation: 'sendMediaGroup', chatId: CHAT, media: { media: links.carrossel.map((u, i) => ({ type: 'photo', media: u, additionalFields: i === 0 ? { caption: '🧪 Teste 2/3 — carrossel' } : {} })) }, additionalFields: {} } },
    { id: 't3', name: 'Video', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [660, 0], credentials: TG,
      parameters: { operation: 'sendVideo', chatId: CHAT, file: links.video, replyMarkup: 'inlineKeyboard', inlineKeyboard: teclado(0), additionalFields: { caption: '🧪 Teste 3/3 — Reels com botões' } } },
  ],
  connections: { Webhook: { main: [[{ node: 'Foto', type: 'main', index: 0 }]] }, Foto: { main: [[{ node: 'Album', type: 'main', index: 0 }]] }, Album: { main: [[{ node: 'Video', type: 'main', index: 0 }]] } } });
try {
  await api('POST', `/workflows/${wf.id}/activate`);
  let raw = '';
  for (let t = 0; t < 12; t++) { raw = await (await fetch(`https://n8n.iafluxos360.com.br/webhook/${PATH}`)).text(); if (!raw.includes('is not registered')) break; await new Promise(r => setTimeout(r, 1500)); }
  console.log(raw.slice(0, 600));
  const ex = await api('GET', `/executions?workflowId=${wf.id}&limit=1&includeData=true`);
  const rd = ex.data[0]?.data?.resultData;
  console.log('status:', ex.data[0]?.status, '| nós:', Object.keys(rd?.runData || {}).join(' > '), rd?.error ? '| ERRO: ' + rd.error.message : '');
} finally { try { await api('POST', `/workflows/${wf.id}/deactivate`); } catch {} await api('DELETE', `/workflows/${wf.id}`); }
