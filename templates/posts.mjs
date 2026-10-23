// Modelos de post (HTML) do VCALendar. Cada modelo recebe os dados do post e devolve uma página
// pronta para ser fotografada pelo navegador. O texto é sempre desenhado aqui, nunca pela IA de imagem.
import { logo, celular, fontes, tela } from './pecas.mjs';

// Paletas variadas e despojadas (pedido do Daniel: não só a cor da marca).
// fundo = fundo dos cards sem foto; caixa = caixa de texto; texto = texto na caixa; tinta = texto e logo
// sobre o fundo claro; marca = palavra de destaque. logo = como o logo aparece nos cards claros:
// só a paleta verde usa o logo original, as outras usam o logo inteiro na cor da tinta.
export const PALETAS = {
  rosa:    { fundo: '#ffe3ec', caixa: '#ff4f8b', texto: '#ffffff', tinta: '#3b0a1c', marca: '#ff4f8b', logo: '#3b0a1c' },
  amarelo: { fundo: '#fff4cc', caixa: '#ffc93c', texto: '#2b2100', tinta: '#2b2100', marca: '#c98f00', logo: '#2b2100' },
  azul:    { fundo: '#e3ecff', caixa: '#2f6bff', texto: '#ffffff', tinta: '#0b1f4d', marca: '#2f6bff', logo: '#0b1f4d' },
  lilas:   { fundo: '#efe8ff', caixa: '#7b5cff', texto: '#ffffff', tinta: '#221550', marca: '#7b5cff', logo: '#221550' },
  coral:   { fundo: '#ffe8e1', caixa: '#ff6b4a', texto: '#ffffff', tinta: '#3d1408', marca: '#ff6b4a', logo: '#3d1408' },
  verde:   { fundo: '#e6f5ec', caixa: '#087a46', texto: '#ffffff', tinta: '#06301c', marca: '#087a46', logo: 'original' },
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Pinta a palavra de destaque (sem diferenciar maiúsculas e acentos).
export function destacar(titulo, destaque, estilo) {
  const t = esc(titulo);
  if (!destaque) return t;
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const i = fold(t).indexOf(fold(esc(destaque)));
  if (i < 0) return t;
  const n = esc(destaque).length;
  return t.slice(0, i) + `<span style="${estilo}">${t.slice(i, i + n)}</span>` + t.slice(i + n);
}
// Tamanho da letra pelo comprimento do título, para nunca estourar a caixa.
const tamanho = (txt, max, min, limite) => Math.max(min, Math.min(max, Math.round(max * limite / Math.max(limite, String(txt).length))));

const BASE = (w, h) => `<!doctype html><html><head><meta charset="utf-8">
${fontes()}
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.tela{position:relative;width:${w}px;height:${h}px;overflow:hidden}
h1{font-weight:900;letter-spacing:-0.025em;line-height:1.02;text-wrap:balance}
.chip{display:inline-flex;align-items:center;gap:12px;font-weight:700;border-radius:999px}
</style></head><body>`;

// ---------- FOTO: foto inteira + caixa de texto colorida + logo branco no canto ----------
export function foto(p, w = 1080, h = 1080) {
  const c = PALETAS[p.paleta] || PALETAS.rosa;
  const fs1 = tamanho(p.titulo, 74, 50, 34);
  const alto = (p.posicao || 'baixo') === 'cima';
  return BASE(w, h) + `<div class="tela">
  <img src="${p.foto}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${p.foco || 'center'}">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.30) 0%,rgba(0,0,0,0) 22%)"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(${alto ? '180deg' : '0deg'},rgba(0,0,0,.38) 0%,rgba(0,0,0,0) 46%)"></div>
  <div style="position:absolute;left:52px;top:50px">${logo('#ffffff', 40, true)}</div>
  <div style="position:absolute;left:48px;right:48px;${alto ? 'top:150px' : 'bottom:56px'};display:flex;flex-direction:column;align-items:flex-start;gap:18px">
    <div style="background:${c.caixa};color:${c.texto};border-radius:34px;padding:34px 42px;max-width:860px;box-shadow:0 18px 40px rgba(0,0,0,.22)">
      <h1 style="font-size:${fs1}px">${destacar(p.titulo, p.destaque, `font-style:italic`)}</h1>
      ${p.apoio ? `<p style="font-size:30px;font-weight:600;line-height:1.3;margin-top:14px;opacity:.92">${esc(p.apoio)}</p>` : ''}
    </div>
    ${p.cta ? `<span class="chip" style="background:rgba(255,255,255,.92);color:#18181b;font-size:26px;padding:14px 26px">${esc(p.cta)} <span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;background:${c.caixa};color:${c.texto};font-size:22px">↓</span></span>` : ''}
  </div></div></body></html>`;
}

// ---------- FRASE: card colorido, frase grande com uma palavra marcada ----------
export function frase(p, w = 1080, h = 1080) {
  const c = PALETAS[p.paleta] || PALETAS.amarelo;
  const fs1 = tamanho(p.titulo, 108, 66, 30);
  return BASE(w, h) + `<div class="tela" style="background:${c.fundo};color:${c.tinta};padding:96px 88px;display:flex;flex-direction:column;justify-content:center">
  <div style="position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:${c.caixa};opacity:.18"></div>
  <div style="position:absolute;left:-90px;bottom:-140px;width:360px;height:360px;border-radius:50%;background:${c.caixa};opacity:.12"></div>
  ${p.rotulo ? `<span class="chip" style="align-self:flex-start;background:${c.caixa};color:${c.texto};font-size:26px;letter-spacing:.06em;text-transform:uppercase;padding:12px 26px;margin-bottom:44px">${esc(p.rotulo)}</span>` : ''}
  <h1 style="font-size:${fs1}px;position:relative">${destacar(p.titulo, p.destaque, `background:${c.caixa};color:${c.texto};padding:0 .14em;border-radius:.18em;box-decoration-break:clone;-webkit-box-decoration-break:clone`)}</h1>
  ${p.apoio ? `<p style="font-size:36px;font-weight:600;line-height:1.35;margin-top:40px;max-width:820px;opacity:.78;position:relative">${esc(p.apoio)}</p>` : ''}
  <div style="position:absolute;left:88px;right:88px;bottom:72px;display:flex;align-items:center;justify-content:space-between">
    ${logo(c.logo, 40)}
    ${p.cta ? `<span style="font-size:26px;font-weight:700;opacity:.7">${esc(p.cta)}</span>` : ''}
  </div></div></body></html>`;
}

// ---------- PRINT: tela real do app dentro de um iPhone desenhado ----------
export function mockup(p, w = 1080, h = 1080) {
  const c = PALETAS[p.paleta] || PALETAS.azul;
  const fs1 = tamanho(p.titulo, 70, 50, 32);
  return BASE(w, h) + `<div class="tela" style="background:${c.fundo};color:${c.tinta}">
  <div style="position:absolute;right:-180px;bottom:-200px;width:720px;height:720px;border-radius:50%;background:${c.caixa};opacity:.16"></div>
  <div style="position:absolute;left:64px;top:72px;width:470px;display:flex;flex-direction:column;gap:26px">
    ${logo(c.logo, 36)}
    <h1 style="font-size:${fs1}px">${destacar(p.titulo, p.destaque, `color:${c.marca}`)}</h1>
    ${p.apoio ? `<p style="font-size:30px;font-weight:600;line-height:1.35;opacity:.75">${esc(p.apoio)}</p>` : ''}
    ${p.cta ? `<span class="chip" style="align-self:flex-start;background:${c.caixa};color:${c.texto};font-size:26px;padding:14px 26px">${esc(p.cta)}</span>` : ''}
  </div>
  <div style="position:absolute;right:78px;top:92px">${celular({ print: p.print || tela(p.tela), largura: 450, rotacao: 4 })}</div>
  </div></body></html>`;
}

// ---------- CARROSSEL: capa = modelo foto ou frase (cta "Arraste pro lado"), depois item e final ----------
// item: número grande + título + texto curto. Todas as páginas do carrossel usam a mesma paleta.
export function item(p, w = 1080, h = 1080) {
  const c = PALETAS[p.paleta] || PALETAS.azul;
  const fs1 = tamanho(p.titulo, 76, 52, 30);
  return BASE(w, h) + `<div class="tela" style="background:${c.fundo};color:${c.tinta};padding:96px 88px 160px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start">
  <div style="position:absolute;right:-140px;top:-140px;width:460px;height:460px;border-radius:50%;background:${c.caixa};opacity:.16"></div>
  <div style="position:relative;flex:none;display:inline-grid;place-items:center;width:150px;height:150px;border-radius:44px;background:${c.caixa};color:${c.texto};font-weight:900;font-size:92px;letter-spacing:-0.04em">${esc(p.numero ?? '')}</div>
  <h1 style="font-size:${fs1}px;margin-top:64px;max-width:880px;position:relative">${destacar(p.titulo, p.destaque, `color:${c.marca}`)}</h1>
  ${p.apoio ? `<p style="font-size:38px;font-weight:600;line-height:1.38;margin-top:34px;max-width:860px;opacity:.78;position:relative">${esc(p.apoio)}</p>` : ''}
  <div style="position:absolute;left:88px;right:88px;bottom:72px;display:flex;align-items:center;justify-content:space-between">
    ${logo(c.logo, 36)}
    <span style="font-size:26px;font-weight:700;opacity:.6">${esc(p.pagina || '')}</span>
  </div></div></body></html>`;
}

// final: chamada para ação do carrossel, no fundo da cor forte da paleta.
export function final(p, w = 1080, h = 1080) {
  const c = PALETAS[p.paleta] || PALETAS.azul;
  return BASE(w, h) + `<div class="tela" style="background:${c.caixa};color:${c.texto};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;padding:0 100px;text-align:center">
  <div style="position:absolute;right:-160px;top:-160px;width:520px;height:520px;border-radius:50%;background:#fff;opacity:.10"></div>
  <div style="position:absolute;left:-140px;bottom:-180px;width:480px;height:480px;border-radius:50%;background:#fff;opacity:.08"></div>
  <div style="position:relative">${logo(c.texto, 64)}</div>
  <h1 style="font-size:${tamanho(p.titulo, 92, 64, 28)}px;position:relative">${esc(p.titulo)}</h1>
  ${p.cta ? `<span class="chip" style="position:relative;background:${c.texto};color:${c.caixa};font-size:36px;padding:22px 46px">${esc(p.cta)}</span>` : ''}
  </div></body></html>`;
}

export const MODELOS = { foto, frase, mockup, item, final };
