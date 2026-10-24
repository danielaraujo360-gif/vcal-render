// Lê o resultado da consulta: posts que passaram da hora sem aprovação (viraram "pulado") e o próximo
// post aprovado cuja hora já chegou. Monta os itens para criar o(s) container(s) no Instagram.
const res = $input.first().json.result || [];
const pulados = ((res[0] && res[0].results) || []).map(r => r.id);
const p = ((res[1] && res[1].results) || [])[0];
if (!p) return [{ json: { pulados, tem: false } }];
const midia = JSON.parse(p.midia || '[]');
const legenda = String(p.legenda || '').slice(0, 2200);
const tipo = p.formato === 'reels' ? 'reels' : p.formato === 'carrossel' ? 'carrossel' : 'imagem';
return [{ json: { pulados, tem: true, id: p.id, tipo, midia, legenda, data_publicar: p.data_publicar } }];
