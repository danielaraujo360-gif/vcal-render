// Serviço de montagem do VCALendar (roda no EasyPanel, chamado pelo n8n).
//   GET  /health
//   POST /post       { tipo, dados, largura?, altura? }            -> { url } (JPG, que é o que o Instagram aceita)
//   POST /carrossel  { paginas: [{ tipo, dados }], largura?, altura? } -> { urls: [...] }
//   POST /video      { roteiro: { paleta, cenas: [{ texto, foto }], fim }, opcoes? } -> { url, duracao }
//   POST /arquivo    { base64, ext? }                                -> { url }  (guarda foto gerada no R2)
// Fotos podem vir como link http(s), data URI ou base64 puro. Toda chamada exige o cabeçalho X-API-Key.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderPost } from './render.mjs';
import { renderVideo } from './video.mjs';
import { enviar, r2Ativo } from './r2.mjs';

const PORTA = Number(process.env.PORT || 8080);
const CHAVE = process.env.RENDER_API_KEY;
const LIMITE = 40 * 1024 * 1024;

const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
function lerCorpo(req) {
  return new Promise((ok, erro) => {
    let n = 0; const partes = [];
    req.on('data', c => { n += c.length; if (n > LIMITE) { erro(new Error('corpo grande demais')); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')); } catch { erro(new Error('JSON inválido')); } });
    req.on('error', erro);
  });
}
// Normaliza uma foto para data URI (posts) ou Buffer (vídeo).
async function fotoBuffer(f) {
  if (!f) throw new Error('foto ausente');
  if (/^https?:\/\//.test(f)) { const r = await fetch(f); if (!r.ok) throw new Error('não baixou a foto: ' + r.status); return Buffer.from(await r.arrayBuffer()); }
  return Buffer.from(String(f).replace(/^data:[^,]+,/, ''), 'base64');
}
const comoDataUri = async f => (!f || String(f).startsWith('data:')) ? f : 'data:image/jpeg;base64,' + (await fotoBuffer(f)).toString('base64');
async function prepararDados(d = {}) { return { ...d, foto: await comoDataUri(d.foto), print: d.print ? await comoDataUri(d.print) : undefined }; }

// Uma montagem por vez: o servidor tem 2 núcleos e o Chromium/ffmpeg usam bastante memória.
let fila = Promise.resolve();
const emFila = tarefa => { const p = fila.then(tarefa, tarefa); fila = p.catch(() => {}); return p; };

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', r2: r2Ativo });
    if (!CHAVE || req.headers['x-api-key'] !== CHAVE) return json(res, 401, { erro: 'não autorizado' });
    if (req.method !== 'POST') return json(res, 404, { erro: 'rota não encontrada' });
    const corpo = await lerCorpo(req);
    const tam = { largura: corpo.largura || 1080, altura: corpo.altura || 1080 };

    if (url.pathname === '/post') {
      const png = await emFila(async () => renderPost(corpo.tipo, await prepararDados(corpo.dados), tam));
      if (!r2Ativo) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(png); }
      return json(res, 200, await enviar(png, 'jpg', 'image/jpeg'));
    }
    if (url.pathname === '/arquivo') {
      // Guarda uma foto gerada (base64 ou data URI) no R2 para reaproveitar depois ("refazer só o texto").
      if (!r2Ativo) return json(res, 400, { erro: 'R2 não configurado' });
      const buf = await fotoBuffer(corpo.base64 || corpo.foto);
      const ext = corpo.ext || 'jpg';
      return json(res, 200, await enviar(buf, ext, ext === 'png' ? 'image/png' : 'image/jpeg'));
    }
    if (url.pathname === '/carrossel') {
      const paginas = corpo.paginas || [];
      if (paginas.length < 2 || paginas.length > 10) return json(res, 400, { erro: 'carrossel precisa de 2 a 10 páginas' });
      const pngs = await emFila(async () => { const out = []; for (const p of paginas) out.push(await renderPost(p.tipo, await prepararDados(p.dados), tam)); return out; });
      if (!r2Ativo) return json(res, 200, { imagens: pngs.map(b => 'data:image/jpeg;base64,' + b.toString('base64')) });
      const urls = []; for (const b of pngs) urls.push((await enviar(b, 'jpg', 'image/jpeg')).url);
      return json(res, 200, { urls });
    }
    if (url.pathname === '/video') {
      const rot = corpo.roteiro || {};
      if (!rot.cenas?.length) return json(res, 400, { erro: 'roteiro sem cenas' });
      const r = await emFila(async () => {
        const cenas = []; for (const c of rot.cenas) cenas.push({ ...c, foto: await fotoBuffer(c.foto) });
        const saida = path.join(os.tmpdir(), `vcal-${Date.now()}.mp4`);
        const v = await renderVideo({ ...rot, cenas }, saida, corpo.opcoes || {});
        const buf = fs.readFileSync(saida); fs.rmSync(saida, { force: true });
        return { buf, duracao: v.duracao };
      });
      if (!r2Ativo) { res.writeHead(200, { 'Content-Type': 'video/mp4' }); return res.end(r.buf); }
      return json(res, 200, { ...(await enviar(r.buf, 'mp4', 'video/mp4')), duracao: r.duracao });
    }
    return json(res, 404, { erro: 'rota não encontrada' });
  } catch (e) {
    console.error(new Date().toISOString(), req.method, url.pathname, e);
    return json(res, 500, { erro: String(e.message || e) });
  }
});
servidor.requestTimeout = 300000;
servidor.listen(PORTA, () => console.log(`vcal-render na porta ${PORTA} | R2 ${r2Ativo ? 'ativo' : 'desligado'}`));
