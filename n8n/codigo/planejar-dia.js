// Decide os posts do dia seguinte: horário, formato, bloco de cor (3 seguidos por bloco) e cor de cada um.
// Pode ser chamado à mão pelo webhook com ?dia=AAAA-MM-DD&horarios=11:30,19:00&formato=reels para testar.
const CONFIG = {
  janelas: [[8, 10], [11, 13], [15, 17], [19, 21]], // 4 por dia desde 30/10, sem aprovação; hora sorteada em cada janela (pedido do Daniel: nada de horário fixo)
  blocos: ['verde', 'branco', 'colorido'],          // ordem dos blocos no feed (3 posts cada = 1 linha do grid)
  coloridas: ['rosa', 'amarelo', 'azul', 'lilas', 'coral'],
  formatos: ['meme', 'foto', 'meme', 'carrossel', 'meme', 'mockup', 'meme', 'frase'], // metade meme, metade técnico (campanha de dezembro). Reels fora até ter a galeria de músicas (Daniel avisa); para voltar: incluir 'reels' depois de 'mockup'
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
const sortear = ([a, b]) => String(a + Math.floor(Math.random() * (b - a))).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0');

// Janela desse dia que já tem post não gera outro (a não ser no teste manual, com ?horarios=).
const horasDoDia = linhas.filter(l => String(l.data_publicar).startsWith(dia)).map(l => Number(String(l.data_publicar).slice(11, 13)));
const livres = q.horarios ? String(q.horarios).split(',').map(s => s.trim())
  : CONFIG.janelas.filter(([a, b]) => !horasDoDia.some(h => h >= a && h < b)).map(sortear);
if (!livres.length) return [];

// Continua a sequência a partir do último post válido.
const ult = linhas[0];
let blocoIdx = ult ? CONFIG.blocos.indexOf(ult.bloco) : -1;
let pos = ult ? Number(ult.posicao) || 3 : 3;
let coloridos = linhas.filter(l => l.bloco === 'colorido').length;
const out = [];
livres.forEach((h, i) => {
  if (pos >= 3) { blocoIdx = (blocoIdx + 1) % CONFIG.blocos.length; pos = 1; } else pos++;
  const bloco = CONFIG.blocos[blocoIdx];
  const paleta = bloco === 'colorido' ? CONFIG.coloridas[coloridos++ % CONFIG.coloridas.length] : bloco;
  const formato = q.formato || CONFIG.formatos[(total + i) % CONFIG.formatos.length];
  out.push({ json: { modo: 'novo', data_publicar: dia + ' ' + h, formato, bloco, posicao: pos, paleta } });
});
return out;
