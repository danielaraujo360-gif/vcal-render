// Ajuda de desenvolvimento: chama uma API usando uma credencial guardada no n8n, por um workflow
// temporário (criado, usado e apagado). Assim nenhuma chave fica em arquivo neste computador.
import { api } from '../../../AppData/Local/Temp/claude/C--Users-samue/89a1239c-dd9c-4d81-9d12-1bf0b0b16bed/scratchpad/r1/n8n.mjs';

export const CRED = {
  openrouter: { httpHeaderAuth: { id: 'iRIF3y0oqYeaBoJI', name: 'OpenRouter API' } },
  cloudflare: { httpHeaderAuth: { id: 'n9zHhMCwp4Dbql7U', name: 'Cloudflare Workers AI (vcal-imagens)' } },
};
const BASE = 'https://n8n.iafluxos360.com.br';

// Abre um workflow temporário com a credencial e devolve { chamar(url, corpo), fechar() }.
export async function abrirCanal(cred) {
  const PATH = 'temp-vcalrender-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const wf = await api('POST', '/workflows', {
    name: 'TEMP - vcal-render dev (apagar)', settings: { executionOrder: 'v1' },
    nodes: [
      { id: 'v1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: PATH, parameters: { httpMethod: 'POST', path: PATH, responseMode: 'lastNode', options: {} } },
      { id: 'v2', name: 'Chamar', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [250, 0], credentials: cred,
        parameters: { method: 'POST', url: '={{ $json.body.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
          sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body.corpo) }}', options: { response: { response: { neverError: true } }, timeout: 180000 } } },
    ],
    connections: { Webhook: { main: [[{ node: 'Chamar', type: 'main', index: 0 }]] } },
  });
  await api('POST', `/workflows/${wf.id}/activate`);
  return {
    async chamar(url, corpo) {
      for (let t = 0; t < 12; t++) {
        const raw = await (await fetch(`${BASE}/webhook/${PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, corpo }) })).text();
        if (!raw.includes('is not registered')) return JSON.parse(raw);
        await new Promise(r => setTimeout(r, 1500));
      }
      throw new Error('webhook temporário não registrou');
    },
    async fechar() { try { await api('POST', `/workflows/${wf.id}/deactivate`); } catch {} await api('DELETE', `/workflows/${wf.id}`); },
  };
}
