// Memes do VCAL (1080x1350): foto do Gemini + texto + logo discreta no canto.
//   node memes.mjs <pasta de saída>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/samue/projects/vcal-render/')('playwright');

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const saida = process.argv[2];
const uri = f => 'file:///' + path.resolve(AQUI, f).replace(/\\/g, '/');
const logoSrc = uri('../assets/logo-escuro.png');
const logo = (cor, op) => `<div style="position:absolute;right:34px;bottom:30px;width:172px;height:27px;opacity:${op};background:${cor};-webkit-mask:url(${logoSrc}) center/contain no-repeat"></div>`;

const base = `@font-face{font-family:Anton;src:url(${uri('../../edicao-auto/fontes/Anton.ttf')})}
@font-face{font-family:Figtree;src:url(${uri('../assets/fonts/Figtree%5Bwght%5D.ttf')});font-weight:300 900}
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px;overflow:hidden}
.foto{position:absolute;inset:0;background-size:cover;background-position:center}`;

const MEMES = {
  '1-dona-do-salao': `
    <div class="foto" style="background-image:url(${uri('foto-unhas.jpg')})"></div>
    <div style="position:absolute;left:0;right:0;top:70px;height:172px;background:#fff;display:flex;align-items:center;justify-content:center">
      <div style="font:400 80px Anton;color:#0b0b0b;white-space:nowrap">A dona do salão em dezembro:</div></div>
    <div style="position:absolute;left:150px;right:150px;top:292px;background:#efeae2;border-radius:24px;padding:30px 28px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:500 36px Figtree;color:#111b21">
      <div style="background:#fff;border-radius:18px;padding:18px 24px;width:max-content;max-width:90%">Amor, que horas você chega?<span style="font-size:22px;color:#667781;margin-left:20px">21:47</span></div>
      <div style="background:#d9fdd3;border-radius:18px;padding:18px 24px;width:max-content;max-width:90%;margin:20px 0 0 auto">Em janeiro, se Deus quiser<span style="font-size:22px;color:#667781;margin-left:20px">21:48 ✓✓</span></div>
    </div>${logo('#fff', .6)}`,
  '2-pov-papai-noel': `
    <div class="foto" style="background-image:url(${uri('foto-noel.jpg')})"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:520px;background:linear-gradient(transparent,rgba(0,0,0,.82) 62%)"></div>
    <div style="position:absolute;left:60px;right:60px;bottom:96px;text-align:center;font:800 62px/1.16 Figtree;color:#fff;text-shadow:0 3px 14px rgba(0,0,0,.7)">POV: Papai Noel tentando marcar horário no seu WhatsApp em dezembro</div>${logo('#fff', .6)}`,
  '3-soro': `
    <div class="foto" style="background-image:url(${uri('foto-soro.jpg')})"></div>
    <div style="position:absolute;left:-20px;right:-20px;bottom:120px;background:#e23d7c;transform:rotate(-2deg);padding:26px 40px 30px;text-align:center;box-shadow:0 10px 30px rgba(120,20,60,.4)">
      <div style="font:400 84px/1.14 Anton;color:#fff;letter-spacing:.5px">TOMANDO SORO<br>PRA AGUENTAR DEZEMBRO</div></div>${logo('#7a1f45', .75)}`,
  '4-falta-isso-aqui': `
    <div class="foto" style="background-image:url(${uri('foto-mao.jpg')})"></div>
    <div style="position:absolute;left:672px;right:44px;top:252px;color:#26201a">
      <div style="font:500 66px Figtree">Falta</div>
      <div style="font:700 80px/1.1 'Segoe Script';color:#a8791f;margin:4px 0 14px -6px;white-space:nowrap">isso aqui</div>
      <div style="font:500 56px/1.16 Figtree">pra eu abrir<br>minha agenda<br>de dezembro</div>
    </div>${logo('#26201a', .55)}`,
};

const nav = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const pag = await nav.newPage({ viewport: { width: 1080, height: 1350 } });
fs.mkdirSync(saida, { recursive: true });
for (const [nome, corpo] of Object.entries(MEMES)) {
  const arq = path.join(AQUI, '_' + nome + '.html');
  fs.writeFileSync(arq, `<!doctype html><meta charset="utf-8"><style>${base}</style>${corpo}`);
  await pag.goto(uri('_' + nome + '.html'));
  await pag.evaluate(() => document.fonts.ready);
  await pag.waitForTimeout(400);
  await pag.screenshot({ path: path.join(saida, nome + '.jpg'), type: 'jpeg', quality: 93 });
  fs.unlinkSync(arq);
  console.log('ok', nome);
}
await nav.close();
