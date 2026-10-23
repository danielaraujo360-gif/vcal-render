// Decide o que fazer com o clique: aprovar, refazer (foto/texto/tudo, até 3 tentativas) ou avisar.
const c = $('Ler Clique').first().json;
const p = ($input.first().json.result || [])[0]?.results?.[0];
const nomes = { foto: 'Refazendo a foto', texto: 'Refazendo o texto', tudo: 'Refazendo tudo' };
const base = { queryId: c.queryId, id: c.id, acao: c.acao, sql: null, gerar: null };
if (c.acao === 'negado') return [{ json: { ...base, resposta: 'Sem permissão.' } }];
if (!p) return [{ json: { ...base, resposta: 'Post #' + c.id + ' não encontrado.' } }];
if (p.status !== 'aguardando') return [{ json: { ...base, resposta: 'O post #' + p.id + ' já está como "' + p.status + '".' } }];
if (c.acao === 'ok') {
  return [{ json: { ...base, resposta: '✅ Post #' + p.id + ' aprovado! Ele sai em ' + p.data_publicar + '.', sql: { sql: "UPDATE vcal_posts SET status = 'aprovado', atualizado_em = datetime('now') WHERE id = ?", params: [p.id] } } }];
}
if (!nomes[c.acao]) return [{ json: { ...base, resposta: 'Botão desconhecido.' } }];
if ((p.tentativa || 1) >= 3) {
  return [{ json: { ...base, resposta: 'Já foram 3 tentativas para o post #' + p.id + '. Esse horário vai ser pulado e a sequência de cores continua no próximo.', sql: { sql: "UPDATE vcal_posts SET status = 'pulado', atualizado_em = datetime('now') WHERE id = ?", params: [p.id] } } }];
}
return [{ json: { ...base, resposta: '🔄 ' + nomes[c.acao] + ' do post #' + p.id + '… já te mando a nova versão.', sql: { sql: "UPDATE vcal_posts SET status = 'gerando', atualizado_em = datetime('now') WHERE id = ?", params: [p.id] }, gerar: { id: p.id, modo: c.acao } } }];
