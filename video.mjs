// Monta o vídeo de slides 9:16: cada cena = foto com zoom lento + camada de texto; transições suaves;
// cartão final; trilha de piano sem direitos autorais. Usa ffmpeg (no servidor e no PC).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { camadaTexto, cartaoFinal } from './templates/slides.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = createRequire('C:/Users/samue/projects/iafluxo360-saas/package.json')('playwright'); }
const RAIZ = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const W = 1080, H = 1920, FPS = 30;

async function fotografar(b, html, arquivo, transparente) {
  const page = await b.newPage({ viewport: { width: W, height: H } });
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: arquivo, omitBackground: !!transparente });
  } finally { await page.close(); }
}

// roteiro = { paleta, cenas: [{ texto, foto: Buffer|caminho }], fim: { texto, botao, site } }
// opcoes = { porCena: s, final: s, transicao: s, musica: true, narracao: caminho.wav (opcional) }
export async function renderVideo(roteiro, saida, opcoes = {}) {
  const porCena = opcoes.porCena ?? 3.2, fimDur = opcoes.final ?? 3.0, tr = opcoes.transicao ?? 0.5;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vcalvid-'));
  const b = await playwright.chromium.launch({ args: ['--no-sandbox'] });
  try {
    const cenas = roteiro.cenas;
    for (const [i, c] of cenas.entries()) {
      const foto = path.join(tmp, `foto${i}.jpg`);
      fs.writeFileSync(foto, Buffer.isBuffer(c.foto) ? c.foto : fs.readFileSync(c.foto));
      await fotografar(b, camadaTexto(c, roteiro.paleta), path.join(tmp, `texto${i}.png`), true);
    }
    await fotografar(b, cartaoFinal(roteiro.fim, roteiro.paleta), path.join(tmp, 'fim.png'), false);

    // Uma entrada por cena (foto + texto) e o cartão final; filtro monta zoom, texto entrando e transições.
    const args = ['-y'];
    cenas.forEach((_, i) => args.push('-loop', '1', '-t', String(porCena + tr), '-i', path.join(tmp, `foto${i}.jpg`), '-loop', '1', '-t', String(porCena + tr), '-i', path.join(tmp, `texto${i}.png`)));
    args.push('-loop', '1', '-t', String(fimDur), '-i', path.join(tmp, 'fim.png'));
    const nQ = Math.round((porCena + tr) * FPS);
    const f = [];
    cenas.forEach((_, i) => {
      const zin = i % 2 === 0; // alterna aproximar / afastar
      const z = zin ? `min(1+0.10*on/${nQ},1.10)` : `max(1.10-0.10*on/${nQ},1.0)`;
      f.push(`[${2 * i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${nQ}:s=${W}x${H}:fps=${FPS},setsar=1[f${i}]`);
      f.push(`[${2 * i + 1}:v]format=rgba,fade=t=in:st=0.25:d=0.35:alpha=1[t${i}]`);
      f.push(`[f${i}][t${i}]overlay=0:0:format=auto,format=yuv420p,trim=duration=${porCena + tr},setpts=PTS-STARTPTS[c${i}]`);
    });
    f.push(`[${2 * cenas.length}:v]scale=${W}:${H},setsar=1,format=yuv420p,fps=${FPS},trim=duration=${fimDur},setpts=PTS-STARTPTS[cfim]`);
    const lista = [...cenas.map((_, i) => `c${i}`), 'cfim'];
    let atual = lista[0], t = porCena;
    for (let k = 1; k < lista.length; k++) {
      const out = k === lista.length - 1 ? 'v' : `x${k}`;
      f.push(`[${atual}][${lista[k]}]xfade=transition=${k === lista.length - 1 ? 'fade' : 'smoothleft'}:duration=${tr}:offset=${t.toFixed(3)}[${out}]`);
      atual = out; t += porCena;
    }
    const total = porCena * cenas.length + fimDur;
    const faixas = [];
    if (opcoes.musica !== false) {
      const wav = path.join(tmp, 'trilha.wav');
      fs.writeFileSync(path.join(tmp, 'toques.json'), '[]');
      execFileSync(process.env.PYTHON || 'python', [path.join(RAIZ, 'trilha.py'), String(total), path.join(tmp, 'toques.json'), wav], { stdio: 'ignore' });
      faixas.push(wav);
    }
    if (opcoes.narracao) faixas.push(opcoes.narracao);
    const base = 2 * cenas.length + 1;
    faixas.forEach(a => args.push('-i', a));
    if (faixas.length === 2) f.push(`[${base}:a]volume=0.25[m];[${base + 1}:a]volume=1.0[n];[m][n]amix=inputs=2:duration=first:normalize=0[a]`);
    args.push('-filter_complex', f.join(';'), '-map', '[v]');
    if (faixas.length === 2) args.push('-map', '[a]'); else if (faixas.length === 1) args.push('-map', `${base}:a`);
    args.push('-t', String(total), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart');
    if (faixas.length) args.push('-c:a', 'aac', '-b:a', '160k');
    args.push(saida);
    execFileSync(process.env.FFMPEG || 'ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    return { arquivo: saida, duracao: total };
  } finally {
    await b.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
