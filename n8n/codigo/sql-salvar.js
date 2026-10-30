// Grava (ou atualiza) o post já aprovado: desde 30/10 o Daniel não aprova mais, publica direto na hora marcada.
const est = $('Montar Pedido').first().json.estado;
const r = $input.first().json;
const midia = r.urls ? r.urls : [r.url];
if (!midia[0]) throw new Error('A montagem falhou: ' + JSON.stringify(r).slice(0, 300));
const c = est.conteudo;
const legenda = (c.legenda || '').trim() + '\n\n' + (c.hashtags || []).join(' ');
const vals = {
  data_publicar: est.data_publicar, formato: est.formato, bloco: est.bloco, posicao: est.posicao, tentativa: est.tentativa,
  status: 'aprovado', tema: c.tema || c.titulo || (c.capa && c.capa.titulo) || '',
  conteudo: JSON.stringify(c), fotos: JSON.stringify(est.fotos || []), midia: JSON.stringify(midia), legenda,
};
const chaves = Object.keys(vals);
let sql, params;
if (est.id) {
  sql = 'UPDATE vcal_posts SET ' + chaves.map(k => k + ' = ?').join(', ') + ", atualizado_em = datetime('now'), erro = NULL WHERE id = ? RETURNING id";
  params = [...Object.values(vals), est.id];
} else {
  sql = 'INSERT INTO vcal_posts (' + chaves.join(', ') + ') VALUES (' + chaves.map(() => '?').join(', ') + ') RETURNING id';
  params = Object.values(vals);
}
return [{ json: { sql, params, estado: { ...est, midia, legenda } } }];
