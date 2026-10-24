// Fotografa os modelos HTML com o Chromium (Playwright). Um navegador só, reaproveitado entre posts.
import { createRequire } from 'node:module';
import { MODELOS } from './templates/posts.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = createRequire('C:/Users/samue/projects/iafluxo360-saas/package.json')('playwright'); } // só no PC de desenvolvimento

let navegador = null;
async function abrir() {
  if (!navegador) navegador = await playwright.chromium.launch({ args: ['--no-sandbox'] });
  return navegador;
}
export async function fechar() { if (navegador) { await navegador.close(); navegador = null; } }

// Gera a imagem de um post (JPG por padrão: o Instagram só publica JPG). Devolve um Buffer.
export async function renderPost(tipo, dados, { largura = 1080, altura = 1080, formato = 'jpeg' } = {}) {
  const modelo = MODELOS[tipo];
  if (!modelo) throw new Error('modelo desconhecido: ' + tipo);
  const b = await abrir();
  const page = await b.newPage({ viewport: { width: largura, height: altura } });
  try {
    await page.setContent(modelo(dados, largura, altura), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot(formato === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 92 });
  } finally { await page.close(); }
}

// Mosaico com as páginas do carrossel (3 por linha), usado só na prévia do Telegram.
export async function renderMosaico(imagens) {
  const col = Math.min(3, imagens.length), lado = 360, gap = 12;
  const linhas = Math.ceil(imagens.length / col);
  const w = col * lado + (col + 1) * gap, h = linhas * lado + (linhas + 1) * gap;
  const html = `<!doctype html><html><body style="margin:0;background:#e9e9ec;width:${w}px;height:${h}px">
    <div style="display:grid;grid-template-columns:repeat(${col},${lado}px);gap:${gap}px;padding:${gap}px">
    ${imagens.map(s => `<img src="${s}" style="width:${lado}px;height:${lado}px;display:block;border-radius:8px">`).join('')}
    </div></body></html>`;
  const b = await abrir();
  const page = await b.newPage({ viewport: { width: w, height: h } });
  try { await page.setContent(html, { waitUntil: 'load' }); return await page.screenshot({ type: 'jpeg', quality: 88 }); }
  finally { await page.close(); }
}
