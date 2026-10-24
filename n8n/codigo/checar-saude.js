// Avisos de manutenção (roda junto com a preparação das 20h): saldo do OpenRouter acabando e
// autorização do Instagram perto de vencer (o Facebook pede reconfirmação a cada ~90 dias).
const VENCE_AUTORIZACAO = '2027-01-21';   // data aproximada; atualizar quando o Daniel refizer o "Generate Access Token"
const avisos = [];
const c = ($input.first().json.data) || {};
const saldo = Number(c.total_credits || 0) - Number(c.total_usage || 0);
if (c.total_credits !== undefined && saldo < 1) avisos.push('💳 O saldo do OpenRouter está em US$ ' + saldo.toFixed(2) + '. Coloque crédito em openrouter.ai para os textos dos posts não pararem.');
const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const dias = Math.ceil((new Date(VENCE_AUTORIZACAO + 'T12:00:00') - hoje) / 86400000);
if (dias <= 14) avisos.push('🔑 A autorização do Instagram do VCALendar vence em ' + Math.max(dias, 0) + ' dia(s) (por volta de ' + VENCE_AUTORIZACAO.split('-').reverse().join('/') + '). Me chame para refazer o "Generate Access Token" (1 minuto).');
if (!avisos.length) return [];
return [{ json: { texto: avisos.join('\n\n') } }];
