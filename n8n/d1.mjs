// Executa SQL no Cloudflare D1 (banco videosreels do Reels) pela credencial do n8n, via workflow temporário.
import { api } from '../../../AppData/Local/Temp/claude/C--Users-samue/89a1239c-dd9c-4d81-9d12-1bf0b0b16bed/scratchpad/r1/n8n.mjs';
const D1 = 'https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/d1/database/59b8965a-4614-4e2e-b68a-29630426618b/query';
export async function sql(consultas) {
  const PATH = 'temp-d1-' + Date.now();
  const wf = await api('POST', '/workflows', { name: 'TEMP - D1 vcal (apagar)', settings: { executionOrder: 'v1' },
    nodes: [
      { id: 'd1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: PATH, parameters: { httpMethod: 'POST', path: PATH, responseMode: 'lastNode', options: {} } },
      { id: 'd2', name: 'D1', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [250, 0], credentials: { httpHeaderAuth: { id: '4Oyp4hh1N3oXKoYC', name: 'Cloudflare D1 API' } },
        parameters: { method: 'POST', url: D1, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { response: { response: { neverError: true } } } } },
    ], connections: { Webhook: { main: [[{ node: 'D1', type: 'main', index: 0 }]] } } });
  try {
    await api('POST', `/workflows/${wf.id}/activate`);
    const out = [];
    for (const c of consultas) {
      let raw = '';
      for (let t = 0; t < 12; t++) { raw = await (await fetch(`https://n8n.iafluxos360.com.br/webhook/${PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(typeof c === 'string' ? { sql: c } : c) })).text(); if (!raw.includes('is not registered')) break; await new Promise(r => setTimeout(r, 1500)); }
      out.push(JSON.parse(raw));
    }
    return out;
  } finally {
    try { await api('POST', `/workflows/${wf.id}/deactivate`); } catch {}
    // o n8n às vezes pede uns segundos entre desligar e apagar: tenta de novo em vez de quebrar
    for (let t = 0; t < 10; t++) { try { await api('DELETE', `/workflows/${wf.id}`); break; } catch (e) { await new Promise(r => setTimeout(r, 2000)); } }
  }
}
if (process.argv[2]) console.log(JSON.stringify(await sql([process.argv[2]]), null, 1));
