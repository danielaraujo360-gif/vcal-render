// Monta a prévia que vai para o Telegram (cabeçalho + legenda, até 1024 caracteres).
const est = $('SQL Salvar').first().json.estado;
const r = $input.first().json;
const linha = r.result && r.result[0] && r.result[0].results && r.result[0].results[0];
const id = (linha && linha.id) || est.id;
const partes = String(est.data_publicar || '').split(' ');
const d = partes[0], h = partes[1];
const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const quando = d ? dias[new Date(d + 'T12:00:00').getDay()] + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7) + ' às ' + h : 'sem data';
const nomes = { foto: 'Post com foto', frase: 'Post de frase', mockup: 'Post com print do app', carrossel: 'Carrossel', reels: 'Reels' };
const cab = '📅 ' + quando + ' · ' + (nomes[est.formato] || est.formato) + '\n🎨 Bloco ' + est.bloco + ' ' + est.posicao + '/3 · cor ' + est.paleta + (est.tentativa > 1 ? ' · tentativa ' + est.tentativa : '') + '\n#' + id;
let leg = est.legenda || '';
const max = 1024 - cab.length - 4;
if (leg.length > max) leg = leg.slice(0, max - 1) + '…';
// semfoto = print do app ou frase: a prévia não mostra o botão "Refazer foto".
const tipo = est.formato === 'reels' ? 'video' : est.formato === 'carrossel' ? 'album' : est.formato === 'foto' ? 'foto' : 'semfoto';
return [{ json: { id, tipo, legenda: cab + '\n\n' + leg, midia: est.midia, primeira: est.midia[0] } }];
