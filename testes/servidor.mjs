// Testa o serviço local como o n8n vai chamar (sem R2: devolve os arquivos direto).
import fs from 'node:fs';
const B = 'http://localhost:8089', H = { 'Content-Type': 'application/json', 'X-API-Key': 'teste-local' };
const foto = n => 'data:image/jpeg;base64,' + fs.readFileSync(`saida/fotos/post-${n}.jpg`).toString('base64');
const t = async (nome, fn) => { const t0 = Date.now(); try { console.log('ok ', nome, await fn(), ((Date.now() - t0) / 1000).toFixed(1) + 's'); } catch (e) { console.log('ERRO', nome, e.message); } };
await t('health', async () => JSON.stringify(await (await fetch(B + '/health')).json()));
await t('sem chave -> 401', async () => (await fetch(B + '/post', { method: 'POST' })).status);
await t('post mockup (tela por nome)', async () => { const r = await fetch(B + '/post', { method: 'POST', headers: H, body: JSON.stringify({ tipo: 'mockup', dados: { paleta: 'coral', titulo: 'Sua cliente escolhe o horário sozinha', destaque: 'sozinha', apoio: 'Ela vê os horários livres e marca.', cta: 'Link na bio', tela: 'horarios' } }) }); const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync('saida/srv-mockup.png', b); return r.status + ' ' + Math.round(b.length / 1024) + 'KB'; });
await t('carrossel 5 paginas', async () => {
  const pal = 'azul';
  const paginas = [
    { tipo: 'foto', dados: { paleta: pal, titulo: '4 sinais de que sua agenda precisa de ajuda', destaque: 'sinais', cta: 'Arraste pro lado', foto: foto(3) } },
    { tipo: 'item', dados: { paleta: pal, numero: 1, titulo: 'Você responde horário até de madrugada', destaque: 'madrugada', apoio: 'Com a página de agendamento, a cliente marca sozinha.', pagina: '2/5' } },
    { tipo: 'item', dados: { paleta: pal, numero: 2, titulo: 'Cliente marca e não aparece', destaque: 'não aparece', apoio: 'O sinal antecipado deixa o compromisso mais firme.', pagina: '3/5' } },
    { tipo: 'item', dados: { paleta: pal, numero: 3, titulo: 'Você não sabe quanto entrou no mês', destaque: 'quanto entrou', apoio: 'O caixa mostra o total por dia e por profissional.', pagina: '4/5' } },
    { tipo: 'final', dados: { paleta: pal, titulo: 'Organize sua agenda com o VCALendar', cta: 'Link na bio' } },
  ];
  const r = await (await fetch(B + '/carrossel', { method: 'POST', headers: H, body: JSON.stringify({ paginas }) })).json();
  r.imagens.forEach((d, i) => fs.writeFileSync(`saida/srv-carrossel-${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
  return r.imagens.length + ' imagens';
});
await t('video', async () => {
  const roteiro = { paleta: 'lilas', cenas: [{ texto: 'Cliente pedindo horário o dia todo?', foto: foto(1) }, { texto: 'Mande o link da sua página.', foto: foto(3) }, { texto: 'Ela escolhe e marca sozinha.', foto: foto(5) }], fim: { texto: 'Sua agenda no automático', botao: 'Link na bio', site: 'vcal.com.br' } };
  const r = await fetch(B + '/video', { method: 'POST', headers: H, body: JSON.stringify({ roteiro }) });
  const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync('saida/srv-video.mp4', b); return r.status + ' ' + Math.round(b.length / 1024) + 'KB';
});
