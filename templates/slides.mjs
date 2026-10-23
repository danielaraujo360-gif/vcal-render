// Camadas do vídeo de slides (9:16). A foto anda por baixo (zoom lento feito no ffmpeg) e o texto vem
// por cima numa camada transparente, para a letra não "crescer" junto com o zoom.
import { PALETAS } from './posts.mjs';
import { logo as logoAdapt } from './pecas.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'assets');
const logo = f => 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, f)).toString('base64');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BASE = (w, h, fundo = 'transparent') => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${fundo}}
body{font-family:Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1{font-weight:900;letter-spacing:-0.025em;line-height:1.04;text-wrap:balance}</style></head><body>`;

// Texto de uma cena: caixa colorida no terço de baixo + logo pequeno em cima.
export function camadaTexto(cena, paleta, w = 1080, h = 1920, comLogo = true) {
  const c = PALETAS[paleta] || PALETAS.rosa;
  const tam = Math.max(64, Math.min(96, Math.round(96 * 26 / Math.max(26, cena.texto.length))));
  return BASE(w, h) + `
  <div style="position:absolute;inset:auto 0 0 0;height:900px;background:linear-gradient(0deg,rgba(0,0,0,.45),rgba(0,0,0,0))"></div>
  ${comLogo ? `<div style="position:absolute;left:64px;top:120px">${logoAdapt('#ffffff', 46, true)}</div>` : ''}
  <div style="position:absolute;left:60px;right:60px;bottom:330px">
    <div style="display:inline-block;background:${c.caixa};color:${c.texto};border-radius:40px;padding:40px 48px;box-shadow:0 20px 44px rgba(0,0,0,.25)">
      <h1 style="font-size:${tam}px">${esc(cena.texto)}</h1>
    </div>
  </div></body></html>`;
}

// Cartão final: logo, chamada e o endereço.
export function cartaoFinal(fim, paleta, w = 1080, h = 1920) {
  const c = PALETAS[paleta] || PALETAS.rosa;
  return BASE(w, h, c.fundo) + `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px;padding:0 90px;text-align:center;color:${c.tinta}">
    <div style="position:absolute;right:-160px;top:-160px;width:560px;height:560px;border-radius:50%;background:${c.caixa};opacity:.16"></div>
    <div style="position:absolute;left:-140px;bottom:-180px;width:520px;height:520px;border-radius:50%;background:${c.caixa};opacity:.12"></div>
    <div style="position:relative">${logoAdapt(c.logo, 84)}</div>
    <h1 style="font-size:92px;position:relative">${esc(fim.texto)}</h1>
    <span style="position:relative;background:${c.caixa};color:${c.texto};font-weight:800;font-size:44px;border-radius:999px;padding:26px 54px">${esc(fim.botao || 'Teste no link da bio')}</span>
    ${fim.site ? `<span style="position:relative;font-size:38px;font-weight:700;opacity:.7">${esc(fim.site)}</span>` : ''}
  </div></body></html>`;
}
