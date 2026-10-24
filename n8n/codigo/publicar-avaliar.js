// O Instagram processa a mídia antes de publicar. Confere o andamento: pronto, erro ou esperar mais.
const r = $input.first().json;
const id = $('Container').first().json.creation_id;
const st = r.status_code || '';
if (st === 'FINISHED') return [{ json: { pronto: true, creation_id: id } }];
if (st === 'ERROR' || st === 'EXPIRED') throw new Error('O Instagram não conseguiu processar a mídia (' + String(r.status || st).replace(/:/g, ' -') + ')');
if ($runIndex >= 30) throw new Error('O Instagram demorou demais para processar a mídia (mais de 7 minutos)');
return [{ json: { pronto: false, creation_id: id } }];
