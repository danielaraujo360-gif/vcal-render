// Guarda o id do container criado (imagem, Reels ou carrossel) para acompanhar o processamento.
const r = $input.first().json;
if (!r.id) throw new Error('O Instagram recusou o post (' + String((r.error && r.error.message) || 'sem detalhe').replace(/:/g, ' -') + ')');
return [{ json: { creation_id: r.id } }];
