// Junta o pedido (novo post ou refazer) com o que já existe no banco e monta o pedido de texto ao Claude.
const ent = $('Gatilho').first().json;
const res = $input.first().json.result || [];
const ant = ((res[0] && res[0].results) || [])[0] || null;
const temas = ((res[1] && res[1].results) || []).map(r => r.tema).filter(Boolean);
const modo = ent.modo || 'novo';
const conteudoAnt = ant && ant.conteudo ? JSON.parse(ant.conteudo) : null;
const fotosAnt = ant && ant.fotos ? JSON.parse(ant.fotos) : [];
const formato = (ant && ant.formato) || ent.formato || 'foto';
const estado = {
  id: ant ? ant.id : null, modo, formato,
  bloco: (ant && ant.bloco) || ent.bloco, posicao: (ant && ant.posicao) || ent.posicao,
  data_publicar: (ant && ant.data_publicar) || ent.data_publicar,
  tentativa: ant ? (ant.tentativa || 1) + 1 : 1,
  paleta: (conteudoAnt && conteudoAnt.paleta) || ent.paleta || 'rosa',
  conteudo: conteudoAnt, fotos: fotosAnt,
};
const precisaTexto = modo !== 'foto' || !conteudoAnt;
const precisaFotos = ['foto', 'carrossel', 'reels', 'meme'].includes(formato) && (modo !== 'texto' || !fotosAnt.length);

const SISTEMA = 'Você é o social media do VCALendar, app brasileiro de agendamento online para profissionais que atendem com hora marcada (salões, estética, cílios, unhas, sobrancelhas, barbearias, clínicas). Público: a PROFISSIONAL dona do negócio.\n' +
  'Tom: próximo, despojado, de quem conhece a rotina do salão. Português do Brasil, frases curtas, sem jargão de tecnologia, no máximo 1 emoji por texto.\n' +
  'FUNCIONALIDADES REAIS (use só estas, nunca invente outras nem números de resultado): agenda online por profissional; página de agendamento própria (link na bio) com catálogo e preços, a cliente marca sozinha 24h; cobrança de sinal antecipado; confirmação do horário pela cliente via WhatsApp (o horário fica reservado até ela confirmar); lista de espera para vagas que abrem; caixa (quanto recebeu por dia e por profissional); cadastro de clientes com histórico.\n' +
  'PROIBIDO: prometer lembrete automático, mensagem automática, inteligência artificial, integrações não listadas, depoimentos ou números inventados.\n' +
  'Responda com UM único objeto JSON válido, sem nenhum texto antes ou depois e sem se corrigir depois. Revise antes de responder.';
// Campanha de fim de ano (pedido do Daniel em 29/10): até 31/12 todos os posts giram em torno da correria de dezembro.
// Cada fase vale pela data de publicação; depois de 31/12 volta ao normal sozinho.
const diaPub = String(estado.data_publicar || '').slice(0, 10);
const CAMPANHA = diaPub >= '2026-10-29' && diaPub <= '2026-11-30' ? 'prepare-se para dezembro: a correria de fim de ano está chegando (festas, confraternizações, Natal, Réveillon), quem organiza a agenda agora não passa sufoco depois; abrir os horários de dezembro na página de agendamento, cobrar sinal para garantir as datas mais disputadas e evitar faltas, lista de espera para não perder cliente quando alguém desmarca'
  : diaPub >= '2026-12-01' && diaPub <= '2026-12-24' ? 'dezembro chegou: agenda lotada, festas, confraternizações e Natal; a cliente marca sozinha 24h pelo link sem você parar o atendimento para responder WhatsApp, o sinal garante quem realmente vem, a lista de espera preenche as desistências; clima natalino bonito e acolhedor, "você não precisa passar sufoco este ano"'
  : diaPub >= '2026-12-25' && diaPub <= '2026-12-31' ? 'fim de ano e Réveillon: últimos horários do ano, fechar o caixa de dezembro vendo quanto recebeu, já deixar a agenda de janeiro aberta; tom de celebração e gratidão pelo ano'
  : '';
// Um ângulo por post (sem isso os 3 posts do mesmo bloco saíram com o mesmo texto): gira pelo dia + posição no bloco.
const ANGULOS = [
  'a cliente marca sozinha pelo link, até de madrugada, enquanto você descansa ou atende',
  'cobrar sinal para segurar as datas mais disputadas (sexta e sábado antes do Natal, véspera do Réveillon) e acabar com o bolo',
  'lista de espera: quando alguém desmarca em dezembro, a vaga não fica vazia',
  'parar de passar o fim de ano respondendo WhatsApp em vez de atender quem está na cadeira',
  'página própria com catálogo e preços dos serviços de festa, para a cliente escolher e marcar',
  'caixa do dia e por profissional: saber quanto dezembro rendeu de verdade',
  'histórico da cliente: lembrar o que ela fez na festa do ano passado e oferecer de novo',
];
const ANGULO = CAMPANHA ? ANGULOS[(Number(diaPub.slice(8, 10)) * 3 + Number(estado.posicao || 1) + (estado.tentativa || 1) - 1) % ANGULOS.length] : '';
const FOTO = 'em inglês, cena fotográfica realista de uma profissional brasileira de beleza (lash, unhas, sobrancelha, cabelo ou estética) trabalhando ou usando o celular/notebook no salão, luz natural, sem texto, sem logotipo' +
  (CAMPANHA ? ', salão com decoração de Natal elegante e discreta (luzinhas quentes, pequenos enfeites dourados e vermelhos, árvore ao fundo desfocada)' : '');
const COMUM = '"legenda": "até 450 caracteres, termina chamando para o link na bio", "hashtags": ["5 a 8"], "tema": "assunto em até 6 palavras"';
const FORMATOS = {
  meme: 'Meme de Instagram para a profissional da beleza se identificar, comentar e marcar a amiga. JSON: {"estilo": "whatsapp, pov ou faixa", "titulo": "whatsapp: até 5 palavras terminando em dois-pontos, ex.: A lash em dezembro: | pov: começa com POV: e tem até 14 palavras | faixa: até 7 palavras", "msg1": "só no estilo whatsapp: a mensagem que ela recebeu", "msg2": "só no estilo whatsapp: a resposta engraçada dela", "prompt_foto": "em inglês, foto realista e engraçada da cena, com a profissional brasileira (ou cliente) exausta, exagerada ou numa situação absurda do salão, sem texto, sem logotipo; no estilo whatsapp a pessoa fica na metade de BAIXO da foto, porque a de cima recebe a conversa e não pode cobrir o rosto: lower half of the frame, empty wall above", ' + COMUM + '}',
  foto: 'Post quadrado com foto e frase numa caixa colorida. JSON: {"titulo": "até 8 palavras", "destaque": "1 ou 2 palavras do título", "apoio": "até 12 palavras", "cta": "ex.: Leia a legenda", "prompt_foto": "' + FOTO + ', deixando a parte de baixo da imagem limpa", ' + COMUM + '}',
  frase: 'Card colorido só com texto forte. JSON: {"rotulo": "1 a 3 palavras, ex.: Dica rápida", "titulo": "até 8 palavras", "destaque": "1 ou 2 palavras do título", "apoio": "até 14 palavras", "cta": "ex.: Link na bio", ' + COMUM + '}',
  mockup: 'Post com o print real do app num iPhone. JSON: {"titulo": "até 7 palavras", "destaque": "1 ou 2 palavras do título", "apoio": "até 12 palavras", "cta": "ex.: Link na bio", "tela": "uma de: agenda, reserva, caixa, pagina, espera, horarios, cliente, catalogo, servicos (a que mostra a funcionalidade do texto)", ' + COMUM + '}',
  carrossel: 'Carrossel educativo: capa com foto + 3 páginas numeradas + página final. JSON: {"capa": {"titulo": "até 8 palavras, promete uma lista", "destaque": "1 ou 2 palavras", "prompt_foto": "' + FOTO + '"}, "itens": [{"titulo": "até 7 palavras", "destaque": "1 ou 2 palavras", "apoio": "até 16 palavras, ligando à funcionalidade"}], "final": {"titulo": "até 6 palavras", "cta": "até 4 palavras"}, ' + COMUM + '} (exatamente 3 itens)',
  reels: 'Reels de slides 9:16 contando uma pequena história (dor, virada com o VCALendar, resultado). JSON: {"cenas": [{"texto": "até 7 palavras", "prompt_foto": "' + FOTO + ', composição vertical"}], "fim": {"texto": "até 6 palavras", "botao": "até 4 palavras"}, ' + COMUM + '} (exatamente 4 cenas)',
};
let pedido = FORMATOS[formato] + '\nAssuntos usados recentemente (não repita): ' + (temas.slice(0, 15).join('; ') || 'nenhum') + '.';
if (formato === 'meme') pedido += '\nREGRAS DO MEME: humor da rotina real, sem cara de propaganda. A imagem NUNCA fala do VCALendar nem vende nada. Escolha UMA situação e uma profissão por vez (manicure, lash, designer de sobrancelha, cabeleireira, esteticista, barbeiro), variando: cliente marcou e não veio; "faz um precinho"; "é só uma sobrancelha rapidinho"; almoço às 16h ou almoço de pipoca; responder WhatsApp de madrugada; cliente atrasada 40 minutos; "tem horário hoje?" às 22h; dor nas costas; a família só te vê em janeiro. Em dezembro puxe a correria de fim de ano. Legenda curta: uma pergunta que puxa comentário (ex.: Por aí também é assim?) e só no fim, de leve, como o VCALendar ajuda, com link na bio.' + (CAMPANHA ? ' Estamos no fim de ano: use a correria de dezembro.' : '');
else if (CAMPANHA) pedido += '\nCAMPANHA DE FIM DE ANO — o post inteiro (texto, foto e legenda) deve girar em torno disto: ' + CAMPANHA + '. ÂNGULO DESTE POST (o título e o texto falam SÓ disto, não liste todas as funções): ' + ANGULO + '. Copy bonita e emocional, com cara de Natal, sem ficar brega. Na legenda, convide a testar o VCALendar: 30 dias grátis, sem cartão, link na bio.';
if (modo === 'texto' && conteudoAnt && conteudoAnt.tela) {
  pedido += '\nO print do app vai continuar sendo a tela "' + conteudoAnt.tela + '". Escreva textos NOVOS sobre a funcionalidade que essa tela mostra.';
} else if (modo === 'texto' && conteudoAnt) {
  const fotosDesc = conteudoAnt.prompt_foto || (conteudoAnt.capa && conteudoAnt.capa.prompt_foto) || (conteudoAnt.cenas || []).map(c => c.prompt_foto);
  pedido += '\nAs fotos já existem e serão mantidas. Escreva textos NOVOS que combinem com elas, mantendo a mesma quantidade de itens/cenas. Fotos: ' + JSON.stringify(fotosDesc);
}
if (modo === 'tudo' && conteudoAnt) pedido += '\nA versão anterior foi recusada (tema: ' + (conteudoAnt.tema || '') + '). Faça algo diferente.';
const pedidoClaude = { model: 'anthropic/claude-sonnet-5.5', response_format: { type: 'json_object' }, max_tokens: 2500, messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: pedido }] };
return [{ json: { estado, precisaTexto, precisaFotos, pedidoClaude } }];
