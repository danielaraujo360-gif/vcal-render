// Remonta os posts da amostra (mesmos textos), guardando as fotos geradas em saida/fotos para reaproveitar.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { abrirCanal, CRED } from './via-n8n.mjs';
import { renderPost, fechar } from '../render.mjs';
const sharp = createRequire('C:/Users/samue/projects/iafluxo360-saas/package.json')('sharp');
const TELAS = { agenda: '11b67537529e.webp', reserva: '66e7b6b537b0.webp', caixa: '4165d2047704.webp', pagina: '1c202fefbcab.webp', espera: '142dc5f85276.webp', horarios: 'bf637e5e554a.webp' };
fs.mkdirSync('saida/fotos', { recursive: true });
const posts = JSON.parse(fs.readFileSync('saida/amostra.json', 'utf8'));
let cf = null;
try {
  for (const [i, p] of posts.entries()) {
    if (p.tipo === 'foto') {
      const arq = `saida/fotos/post-${i + 1}.jpg`;
      if (!fs.existsSync(arq)) {
        cf ||= await abrirCanal(CRED.cloudflare);
        const r = await cf.chamar('https://api.cloudflare.com/client/v4/accounts/280fafc57de253413b5d78102820ecf2/ai/run/@cf/black-forest-labs/flux-1-schnell', { prompt: p.prompt_foto, steps: 8 });
        fs.writeFileSync(arq, Buffer.from(r.result.image, 'base64'));
      }
      p.foto = 'data:image/jpeg;base64,' + fs.readFileSync(arq).toString('base64');
    }
    if (p.tipo === 'mockup') p.print = 'data:image/png;base64,' + (await sharp('C:/Users/samue/projects/iafluxo360-saas/public/landing/' + (TELAS[p.tela] || TELAS.agenda)).png().toBuffer()).toString('base64');
    fs.writeFileSync(`saida/post-${i + 1}-${p.tipo}.png`, await renderPost(p.tipo, p));
    console.log('ok', i + 1, p.tipo, p.paleta);
  }
} finally { if (cf) await cf.fechar(); await fechar(); }
