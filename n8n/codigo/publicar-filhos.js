// Carrossel: uma imagem por item (cada uma vira um "filho" no Instagram).
const p = $('Preparar').first().json;
return p.midia.map(url => ({ json: { image_url: url, is_carousel_item: true } }));
