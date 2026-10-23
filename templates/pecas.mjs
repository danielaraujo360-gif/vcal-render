// Peças reutilizadas pelos modelos: logo adaptável e celular realista (iPhone desenhado em código).
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'assets');
const cache = {};
const uri = f => (cache[f] ||= 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, f)).toString('base64'));
const PROPORCAO_LOGO = 1507 / 234; // logo-escuro.png

// Logo adaptável. cor = 'original' (verde/escuro da marca) ou qualquer cor CSS (branco, preto, tom da peça).
// Usa o próprio desenho do logo como máscara, então os detalhes do ícone continuam vazados.
export function logo(cor = 'original', altura = 40, sombra = false) {
  const w = Math.round(altura * PROPORCAO_LOGO);
  const s = sombra ? 'filter:drop-shadow(0 2px 8px rgba(0,0,0,.35));' : '';
  if (cor === 'original') return `<img src="${uri('logo-escuro.png')}" style="height:${altura}px;width:${w}px;display:block;${s}">`;
  return `<div style="height:${altura}px;width:${w}px;background:${cor};-webkit-mask:url(${uri('logo-escuro.png')}) center/contain no-repeat;mask:url(${uri('logo-escuro.png')}) center/contain no-repeat;${s}"></div>`;
}

// Ícones da barra de status (desenhados para a escala 1 = tela de 393 pt de largura).
const icones = cor => `
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="${cor}"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="${cor}"/><rect x="10" y="3" width="3" height="9" rx="1" fill="${cor}"/><rect x="15" y="0" width="3" height="12" rx="1" fill="${cor}"/></svg>
<span style="font-weight:700;font-size:12.5px;letter-spacing:-0.2px;color:${cor}">5G</span>
<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.9 1.5 11.3.5 8.5.5S3.1 1.5 1.1 3.5l1.2 1.2C3.9 3.1 6.1 2.2 8.5 2.2z" fill="${cor}"/><path d="M8.5 5.6c1.5 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.6 10.4 3.9 8.5 3.9s-3.7.7-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5z" fill="${cor}"/><path d="M8.5 9c.6 0 1.1.2 1.5.6L8.5 11.2 7 9.6c.4-.4.9-.6 1.5-.6z" fill="${cor}"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="${cor}" stroke-opacity=".38"/><rect x="2" y="2" width="20" height="9" rx="2.3" fill="${cor}"/><path d="M25 4.4v4.2c.9-.3 1.5-1.1 1.5-2.1s-.6-1.8-1.5-2.1z" fill="${cor}" fill-opacity=".45"/></svg>`;

// Celular realista com o print do app. largura = largura total do aparelho em px.
// O print (1170×2532, sem barra de status) entra logo abaixo da barra desenhada; a "ilha" fica por cima.
export function celular({ print, largura = 460, rotacao = 0, hora = '9:41', fundoTela = '#ffffff', corStatus = '#000000', sombra = true }) {
  const telaW = largura - largura * 0.06;          // borda do aparelho ~3% de cada lado
  const k = telaW / 393;                             // escala dos elementos desenhados (iPhone 393 pt)
  const telaH = telaW * 852 / 393;
  const altura = telaH + largura * 0.06;
  const r = largura * 0.175, rt = r - largura * 0.03;
  const statusH = 54 * k;
  const botoes = [[-1, 0.20, 0.055], [-1, 0.28, 0.095], [-1, 0.39, 0.095], [1, 0.30, 0.14]] // lado, topo, altura (fração)
    .map(([lado, top, h]) => `<div style="position:absolute;${lado < 0 ? 'left' : 'right'}:${-largura * 0.009}px;top:${altura * top}px;width:${largura * 0.012}px;height:${altura * h}px;border-radius:${largura * 0.006}px;background:linear-gradient(90deg,#3b3b3f,#1b1b1e,#3b3b3f)"></div>`).join('');
  return `<div style="position:relative;width:${largura}px;height:${altura}px;transform:rotate(${rotacao}deg);${sombra ? `filter:drop-shadow(0 ${largura * 0.06}px ${largura * 0.1}px rgba(0,0,0,.28)) drop-shadow(0 ${largura * 0.01}px ${largura * 0.02}px rgba(0,0,0,.25));` : ''}">
    ${botoes}
    <div style="position:absolute;inset:0;border-radius:${r}px;background:linear-gradient(145deg,#5a5a60 0%,#2a2a2e 18%,#1a1a1d 50%,#3c3c41 82%,#6a6a70 100%);padding:${largura * 0.009}px">
      <div style="width:100%;height:100%;border-radius:${r - largura * 0.009}px;background:#050506;padding:${largura * 0.021}px">
        <div style="position:relative;width:100%;height:100%;border-radius:${rt}px;overflow:hidden;background:${fundoTela}">
          <div style="position:absolute;left:0;right:0;top:0;height:${statusH}px;background:${fundoTela};z-index:2"></div>
          <img src="${print}" style="position:absolute;left:0;top:${statusH}px;width:100%;display:block;z-index:1">
          <div style="position:absolute;left:0;right:0;top:0;height:${statusH}px;z-index:4;display:flex;align-items:center;justify-content:space-between;padding:${4 * k}px ${30 * k}px 0 ${44 * k}px;font-family:-apple-system,'SF Pro Text','Inter','Figtree',sans-serif">
            <span style="font-weight:700;font-size:${17 * k}px;letter-spacing:-0.3px;color:${corStatus}">${hora}</span>
            <span style="display:flex;align-items:center;gap:${5 * k}px;transform:scale(${k});transform-origin:right center">${icones(corStatus)}</span>
          </div>
          <div style="position:absolute;left:50%;top:${11 * k}px;transform:translateX(-50%);width:${125 * k}px;height:${37 * k}px;border-radius:${20 * k}px;background:#000;z-index:5"></div>
          <div style="position:absolute;left:50%;bottom:${8 * k}px;transform:translateX(-50%);width:${134 * k}px;height:${5 * k}px;border-radius:${3 * k}px;background:rgba(0,0,0,.85);z-index:5"></div>
          <div style="position:absolute;inset:0;z-index:6;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 32%)"></div>
        </div>
      </div>
    </div>
  </div>`;
}

// Fontes embutidas no próprio serviço (sem depender do Google Fonts na hora de montar).
const fonte = f => 'data:font/ttf;base64,' + fs.readFileSync(path.join(ASSETS, 'fonts', f)).toString('base64');
let CSS_FONTES = null;
export const fontes = () => (CSS_FONTES ||= `<style>
@font-face{font-family:Figtree;font-style:normal;font-weight:300 900;src:url(${fonte('Figtree[wght].ttf')}) format('truetype')}
@font-face{font-family:Figtree;font-style:italic;font-weight:300 900;src:url(${fonte('Figtree-Italic[wght].ttf')}) format('truetype')}
</style>`);

// Prints reais do app (conta de demonstração, nomes fictícios), 1170×2532 sem barra de status.
export const TELAS = { agenda: 'agenda.webp', reserva: 'reserva.webp', caixa: 'caixa.webp', pagina: 'pagina.webp', espera: 'espera.webp', horarios: 'horarios.webp', cliente: 'cliente.webp', catalogo: 'catalogo.webp', servicos: 'servicos.webp' };
export const tela = nome => 'data:image/webp;base64,' + fs.readFileSync(path.join(ASSETS, 'prints', TELAS[nome] || TELAS.agenda)).toString('base64');
