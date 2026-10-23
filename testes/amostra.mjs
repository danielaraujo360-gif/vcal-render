// Amostra completa no estilo novo: Claude escreve 6 posts, Cloudflare gera as fotos, o render monta.
import fs from 'node:fs';
import path from 'node:path';
import { abrirCanal, CRED } from './via-n8n.mjs';
import { renderPost, fechar } from '../render.mjs';
import { PALETAS } from '../templates/posts.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SAIDA = path.join(RAIZ, 'saida');
const PRINTS = 'C:/Users/samue/projects/iafluxo360-saas/public/landing/';
const TELAS = { agenda: '11b67537529e.webp', reserva: '66e7b6b537b0.webp', caixa: '4165d2047704.webp', pagina: '1c202fefbcab.webp', espera: '142dc5f85276.webp', horarios: 'bf637e5e554a.webp' };

const SISTEMA = `Você é o social media do VCALendar, app brasileiro de agendamento online para profissionais que atendem com hora marcada (salões, estética, cílios, unhas, sobrancelhas, barbearias, clínicas). Público: a PROFISSIONAL dona do negócio.
Tom: próximo, despojado, de quem conhece a rotina do salão. Português do Brasil, frases curtas, sem jargão de tecnologia, no máximo 1 emoji por texto.
FUNCIONALIDADES REAIS (use só estas, nunca invente outras nem números de resultado): agenda online por profissional; página de agendamento própria (link na bio) com catálogo e preços, a cliente marca sozinha 24h; cobrança de sinal antecipado; confirmação do horário pela cliente via WhatsApp (o horário fica reservado até ela confirmar); lista de espera para vagas que abrem; caixa (quanto recebeu por dia e por profissional); cadastro de clientes com histórico.
PROIBIDO: prometer lembrete automático, mensagem automática, inteligência artificial, integrações não listadas, depoimentos ou números inventados.
Responda APENAS com JSON válido.`;
const PEDIDO = `Crie 6 posts quadrados para o feed do Instagram do VCALendar, variados, no estilo de perfis de app de agenda para beleza (foto de profissional com frase numa caixa colorida, cards de frase coloridos, print do app).
Distribua assim: 3 do tipo "foto", 2 do tipo "frase", 1 do tipo "mockup".
Campos de cada post:
- tipo: "foto" | "frase" | "mockup"
- paleta: uma de ${Object.keys(PALETAS).join(', ')} (varie, não repita em seguida)
- titulo: até 8 palavras, forte, vai em letra grande
- destaque: 1 ou 2 palavras do título para destacar
- apoio: frase curta opcional (até 12 palavras)
- cta: chamada curtinha opcional, ex. "Leia a legenda", "Link na bio"
- rotulo: só no tipo frase, opcional, 1 a 3 palavras (ex. "Dica rápida")
- prompt_foto: só no tipo foto, em inglês, cena fotográfica realista de uma profissional brasileira de beleza (lash, unhas, sobrancelha, cabelo, estética) trabalhando ou usando o celular/notebook no salão, luz natural, sem texto, sem logotipo, deixando espaço limpo na parte de baixo da imagem
- tela: só no mockup, uma de ${Object.keys(TELAS).join(', ')}
- legenda: até 450 caracteres, termina chamando para o link na bio
- hashtags: 5 a 8
Formato: {"posts":[...]}`;

const t0 = Date.now();
const or = await abrirCanal(CRED.openrouter);
let posts;
try {
  const r = await or.chamar('https://openrouter.ai/api/v1/chat/completions', { model: 'anthropic/claude-sonnet-5.5', response_format: { type: 'json_object' }, max_tokens: 4000, messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: PEDIDO }] });
  if (!r.choices) throw new Error(JSON.stringify(r).slice(0, 400));
  posts = JSON.parse(r.choices[0].message.content.replace(/^```json\s*|```\s*$/g, '')).posts;
  console.log('textos ok | custo US$', r.usage?.cost?.toFixed(4));
} finally { await or.fechar(); }
fs.writeFileSync(path.join(SAIDA, 'amostra.json'), JSON.stringify(posts, null, 2));

const cf = await abrirCanal(CRED.cloudflare);
try {
  for (const [i, p] of posts.entries()) {
    if (p.tipo === 'foto') {
      const r = await cf.chamar('https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/ai/run/@cf/black-forest-labs/flux-1-schnell', { prompt: p.prompt_foto, steps: 8 });
      if (!r.result?.image) throw new Error('foto falhou: ' + JSON.stringify(r).slice(0, 300));
      p.foto = 'data:image/jpeg;base64,' + r.result.image;
    }
    if (p.tipo === 'mockup') {
      const sharp = (await import('module')).createRequire('C:/Users/samue/projects/iafluxo360-saas/package.json')('sharp');
      p.print = 'data:image/png;base64,' + (await sharp(PRINTS + (TELAS[p.tela] || TELAS.agenda)).png().toBuffer()).toString('base64');
    }
    const png = await renderPost(p.tipo, p);
    const nome = `post-${i + 1}-${p.tipo}.png`;
    fs.writeFileSync(path.join(SAIDA, nome), png);
    console.log(nome, '|', p.paleta, '|', p.titulo);
  }
} finally { await cf.fechar(); await fechar(); }
console.log('tempo total', ((Date.now() - t0) / 1000).toFixed(0) + 's');
