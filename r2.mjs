// Envio para o Cloudflare R2 (mesmo bucket público do Reels). O Instagram precisa de um link público
// para buscar a imagem ou o vídeo na hora de publicar. As chaves vêm das variáveis do EasyPanel.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

// Aceita os mesmos nomes do ffmpg (R2_ENDPOINT, R2_BUCKET_NAME) para copiar as variáveis de lá sem mudar nada.
const E = process.env;
const R2_ACCESS_KEY_ID = E.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY = E.R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL = E.R2_PUBLIC_URL;
const R2_BUCKET = E.R2_BUCKET || E.R2_BUCKET_NAME;
const R2_ENDPOINT = E.R2_ENDPOINT || (E.R2_ACCOUNT_ID ? `https://${E.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
export const r2Ativo = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL);
const cliente = r2Ativo ? new S3Client({ region: 'auto', endpoint: R2_ENDPOINT, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } }) : null;

// Sobe o arquivo em vcal/AAAA-MM-DD/<id>.<ext> e devolve o link público.
export async function enviar(buffer, ext, tipoConteudo) {
  if (!r2Ativo) throw new Error('R2 não configurado');
  const dia = new Date().toISOString().slice(0, 10);
  const chave = `vcal/${dia}/${crypto.randomUUID()}.${ext}`;
  await cliente.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: chave, Body: buffer, ContentType: tipoConteudo, CacheControl: 'public, max-age=31536000' }));
  return { url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${chave}`, chave };
}
