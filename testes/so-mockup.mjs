import fs from 'node:fs';
import { createRequire } from 'node:module';
import { renderPost, fechar } from '../render.mjs';
const sharp = createRequire('C:/Users/samue/projects/iafluxo360-saas/package.json')('sharp');
const p = JSON.parse(fs.readFileSync('saida/amostra.json', 'utf8')).find(x => x.tipo === 'mockup');
p.print = 'data:image/png;base64,' + (await sharp('C:/Users/samue/projects/iafluxo360-saas/public/landing/4165d2047704.webp').png().toBuffer()).toString('base64');
fs.writeFileSync('saida/post-4-mockup.png', await renderPost('mockup', p));
await fechar(); console.log('ok');
