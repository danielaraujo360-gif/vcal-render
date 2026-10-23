// Decide os posts do dia seguinte: horário, formato, bloco de cor (3 seguidos por bloco) e cor de cada um.
// Pode ser chamado à mão pelo webhook com ?dia=AAAA-MM-DD&horarios=11:30,19:00&formato=reels para testar.
const CONFIG = {
  horarios: ['11:30', '19:00'],
  blocos: ['verde', 'branco', 'colorido'],          // ordem dos blocos no feed (3 posts cada = 1 linha do grid)
  coloridas: ['rosa', 'amarelo', 'azul', 'lilas', 'coral'],
  formatos: ['foto', 'carrossel', 'mockup', 'reels', 'foto', 'frase'],
};
const res = $input.first().json.result || [];
const linhas = (res[0] && res[0].results) || [];            // posts válidos, mais novos primeiro
const total = Number(((res[1] && res[1].results) || [])[0]?.n || 0);
let q = {};
try { q = $('Gerar Agora').first().json.query || {}; } catch (e) { q = {}; }

const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dia = q.dia || iso(amanha);
const horarios = q.horarios ? String(q.horarios).split(',').map(s => s.trim()) : CONFIG.horarios;

// Se já existe post para esse dia, não gera de novo (a não ser no teste manual).
if (!q.dia && linhas.some(l => String(l.data_publicar).startsWith(dia))) return [];

// Continua a sequência a partir do último post válido.
const ult = linhas[0];
let blocoIdx = ult ? CONFIG.blocos.indexOf(ult.bloco) : -1;
let pos = ult ? Number(ult.posicao) || 3 : 3;
let coloridos = linhas.filter(l => l.bloco === 'colorido').length;
const out = [];
horarios.forEach((h, i) => {
  if (pos >= 3) { blocoIdx = (blocoIdx + 1) % CONFIG.blocos.length; pos = 1; } else pos++;
  const bloco = CONFIG.blocos[blocoIdx];
  const paleta = bloco === 'colorido' ? CONFIG.coloridas[coloridos++ % CONFIG.coloridas.length] : bloco;
  const formato = q.formato || CONFIG.formatos[(total + i) % CONFIG.formatos.length];
  out.push({ json: { modo: 'novo', data_publicar: dia + ' ' + h, formato, bloco, posicao: pos, paleta } });
});
return out;
