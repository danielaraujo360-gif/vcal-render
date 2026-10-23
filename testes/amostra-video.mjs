// Amostra de vídeo de slides: Claude escreve o roteiro (4 cenas + final), Cloudflare gera as fotos 9:16.
import fs from 'node:fs';
import { abrirCanal, CRED } from './via-n8n.mjs';
import { renderVideo } from '../video.mjs';

const SISTEMA = `Você é o social media do VCALendar, app brasileiro de agendamento online para profissionais da beleza. Público: a profissional dona do negócio. Português do Brasil, despojado, frases curtíssimas.
Funcionalidades reais (só estas): agenda online; página de agendamento própria no link da bio com catálogo e preços, a cliente marca sozinha 24h; sinal antecipado; confirmação pela cliente via WhatsApp; lista de espera; caixa; cadastro de clientes com histórico.
PROIBIDO: lembrete automático, mensagem automática, IA, números ou depoimentos inventados. Responda só JSON.`;
const PEDIDO = `Roteiro de um Reels de slides (9:16) com 4 cenas e um cartão final, contando uma pequena história: a dor da profissional -> a virada com o VCALendar -> o resultado.
{"tema":"...","paleta":"rosa|amarelo|azul|lilas|coral|verde","cenas":[{"texto":"até 7 palavras","prompt_foto":"inglês, foto vertical realista de profissional brasileira de beleza na cena, luz natural, sem texto, sem logotipo"}],"fim":{"texto":"até 6 palavras","botao":"até 4 palavras"},"legenda":"até 400 caracteres terminando no link da bio","hashtags":["5 a 8"]}`;

const or = await abrirCanal(CRED.openrouter);
let rot;
try {
  const r = await or.chamar('https://openrouter.ai/api/v1/chat/completions', { model: 'anthropic/claude-sonnet-5.5', response_format: { type: 'json_object' }, max_tokens: 2500, messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: PEDIDO }] });
  rot = JSON.parse(r.choices[0].message.content.replace(/^```json\s*|```\s*$/g, ''));
  console.log('roteiro ok | custo US$', r.usage?.cost?.toFixed(4), '|', rot.tema);
} finally { await or.fechar(); }

const cf = await abrirCanal(CRED.cloudflare);
try {
  for (const c of rot.cenas) {
    // FLUX schnell gera no máximo 1024 px; pedimos retrato e o render recorta/escala para 1080x1920.
    const r = await cf.chamar('https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/ai/run/@cf/black-forest-labs/flux-1-schnell', { prompt: c.prompt_foto + ', vertical portrait composition', steps: 8 });
    if (!r.result?.image) throw new Error(JSON.stringify(r).slice(0, 300));
    c.foto = Buffer.from(r.result.image, 'base64');
    console.log('foto ok:', c.texto);
  }
} finally { await cf.fechar(); }

rot.fim.site = 'vcal.com.br';
const t0 = Date.now();
const r = await renderVideo(rot, 'saida/reels-amostra.mp4');
fs.writeFileSync('saida/reels-amostra.json', JSON.stringify({ ...rot, cenas: rot.cenas.map(({ foto, ...c }) => c) }, null, 2));
console.log('video ok', r.duracao + 's', 'montado em', ((Date.now() - t0) / 1000).toFixed(0) + 's');
