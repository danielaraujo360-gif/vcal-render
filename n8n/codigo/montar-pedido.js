// Junta as fotos (novas ou mantidas) e monta o pedido para o serviço de montagem (vcal-render).
let est = $('Ler Texto').first().json.estado;
let fotos = est.fotos || [];
let novas = null;
try { novas = $('Guardar Foto').all().map(i => i.json.url); } catch (e) { novas = null; }
if (novas && novas.length && novas.every(Boolean)) fotos = novas;
est = { ...est, fotos };
const c = est.conteudo, pal = est.paleta;
let rota, corpo;
if (est.formato === 'foto') {
  rota = '/post'; corpo = { tipo: 'foto', dados: { paleta: pal, titulo: c.titulo, destaque: c.destaque, apoio: c.apoio, cta: c.cta, foto: fotos[0] } };
} else if (est.formato === 'frase') {
  rota = '/post'; corpo = { tipo: 'frase', dados: { paleta: pal, rotulo: c.rotulo, titulo: c.titulo, destaque: c.destaque, apoio: c.apoio, cta: c.cta } };
} else if (est.formato === 'mockup') {
  rota = '/post'; corpo = { tipo: 'mockup', dados: { paleta: pal, titulo: c.titulo, destaque: c.destaque, apoio: c.apoio, cta: c.cta, tela: c.tela } };
} else if (est.formato === 'carrossel') {
  const itens = c.itens || [], n = itens.length + 2;
  rota = '/carrossel';
  corpo = { paginas: [
    { tipo: 'foto', dados: { paleta: pal, titulo: c.capa.titulo, destaque: c.capa.destaque, cta: 'Arraste pro lado', foto: fotos[0] } },
    ...itens.map((it, i) => ({ tipo: 'item', dados: { paleta: pal, numero: i + 1, titulo: it.titulo, destaque: it.destaque, apoio: it.apoio, pagina: (i + 2) + '/' + n } })),
    { tipo: 'final', dados: { paleta: pal, titulo: c.final.titulo, cta: c.final.cta || 'Link na bio' } },
  ] };
} else if (est.formato === 'reels') {
  rota = '/video';
  corpo = { roteiro: { paleta: pal, cenas: (c.cenas || []).map((ce, i) => ({ texto: ce.texto, foto: fotos[i] || fotos[0] })), fim: { texto: c.fim.texto, botao: c.fim.botao || 'Link na bio', site: 'vcal.com.br' } } };
} else {
  throw new Error('formato desconhecido: ' + est.formato);
}
return [{ json: { rota, corpo, estado: est } }];
