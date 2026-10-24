// Lê a resposta do Claude (se houve) e lista as fotos que precisam ser geradas, uma por item.
const p = $('Planejar').first().json;
let est = p.estado;
if (p.precisaTexto) {
  const r = $('Claude').first().json;
  const txt = (r.choices && r.choices[0] && r.choices[0].message.content) || '';
  // Lê o JSON tolerando quebras de linha soltas dentro dos textos (o Claude às vezes manda assim).
  // Às vezes ele manda dois JSONs ("corrigindo...") — separa os blocos {...} e usa o último que for válido.
  function lerJson(t) {
    t = String(t);
    const blocos = [];
    let out = '', nivel = 0, dentro = false, esc = false;
    for (const ch of t) {
      if (nivel === 0 && ch !== '{') continue;           // texto solto entre blocos
      if (dentro) {
        if (esc) { esc = false; out += ch; continue; }
        if (ch === '\\') { esc = true; out += ch; continue; }
        if (ch === '"') { dentro = false; out += ch; continue; }
        if (ch === '\n') { out += '\\n'; continue; }       // quebra de linha solta dentro do texto
        if (ch === '\r') continue;
        if (ch === '\t') { out += '\\t'; continue; }
        out += ch; continue;
      }
      if (ch === '"') dentro = true;
      if (ch === '{') nivel++;
      if (ch === '}') nivel--;
      out += ch;
      if (nivel === 0) { blocos.push(out); out = ''; }
    }
    for (let i = blocos.length - 1; i >= 0; i--) { try { return JSON.parse(blocos[i]); } catch (e) { /* tenta o anterior */ } }
    throw new Error('nenhum bloco JSON válido');
  }
  let c;
  try { c = lerJson(txt); }
  catch (e) { throw new Error('O Claude não devolveu um JSON válido (' + e.message + ')'); }
  const velho = est.conteudo;
  if (est.modo === 'texto' && velho) { // mantém as descrições das fotos antigas
    if (velho.prompt_foto) c.prompt_foto = velho.prompt_foto;
    if (velho.capa && c.capa) c.capa.prompt_foto = velho.capa.prompt_foto;
    if (velho.cenas && c.cenas) c.cenas.forEach((ce, i) => { if (velho.cenas[i]) ce.prompt_foto = velho.cenas[i].prompt_foto; });
    if (velho.tela) c.tela = velho.tela; // no print do app, a "foto" é a tela: refazer o texto mantém a mesma tela
  }
  c.paleta = est.paleta;
  est = { ...est, conteudo: c, custo_texto: (r.usage && r.usage.cost) || 0 };
}
const c = est.conteudo;
const prompts = est.formato === 'foto' ? [c.prompt_foto]
  : est.formato === 'carrossel' ? [c.capa && c.capa.prompt_foto]
  : est.formato === 'reels' ? (c.cenas || []).map(x => x.prompt_foto) : [];
const limpos = prompts.filter(Boolean);
if (!p.precisaFotos || !limpos.length) return [{ json: { semFoto: true, estado: est } }];
const extra = est.formato === 'reels' ? ', vertical portrait composition' : '';
return limpos.map((pr, i) => ({ json: { semFoto: false, indice: i, prompt: pr + extra + ', realistic photography, natural light, no text, no logo', estado: est } }));
