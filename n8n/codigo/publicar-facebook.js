// Depois do Instagram, o mesmo post vai para a página do Facebook do VCALendar.
// Foto: 1 envio publicado. Carrossel: cada imagem sobe oculta e depois vira um post só (FB Juntar). Reels: vídeo da página.
const p = $('Preparar').first().json;
if (p.tipo === 'reels') return [{ json: { rota: 'videos', corpo: { file_url: p.midia[0], description: p.legenda } } }];
if (p.tipo === 'carrossel') return p.midia.map(url => ({ json: { rota: 'photos', corpo: { url, published: false } } }));
return [{ json: { rota: 'photos', corpo: { url: p.midia[0], caption: p.legenda } } }];
