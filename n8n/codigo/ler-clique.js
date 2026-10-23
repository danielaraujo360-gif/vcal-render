// Lê o botão apertado no Telegram (ok/foto/texto/tudo + número do post). Só aceita o Daniel.
const DONO = '7873865778';
const u = $input.first().json;
const q = u.callback_query;
if (!q) return [];
if (String(q.from && q.from.id) !== DONO) return [{ json: { acao: 'negado', id: 0, queryId: q.id } }];
const partes = String(q.data || '').split(':');
return [{ json: { acao: partes[0], id: Number(partes[1]) || 0, queryId: q.id } }];
