/**
 * Ostvera — обработчик формы заявки  POST /api/lead
 * ------------------------------------------------------------------
 * Serverless-функция для РФ-облака (Yandex Cloud Functions / Timeweb Cloud).
 * Принимает JSON от формы на сайте → шлёт заявку в Telegram-бот и на e-mail.
 * CommonJS — максимально совместимо с рантаймом YC (Node.js 18).
 *
 * 152-ФЗ: функцию разворачиваем в российском регионе, секреты храним в
 * переменных окружения (не в коде), ПДн не логируем — только пересылаем.
 *
 * Переменные окружения (задать в консоли облака):
 *   TELEGRAM_BOT_TOKEN   токен бота от @BotFather                (обязательно для TG)
 *   TELEGRAM_CHAT_ID     id чата/канала/группы куда слать заявки (обязательно для TG)
 *   MAIL_TO              e-mail получателя заявок      (по умолчанию info@ostvera.ru)
 *   MAIL_FROM            e-mail отправителя            (по умолчанию = SMTP_USER)
 *   SMTP_HOST            хост SMTP (напр. smtp.yandex.ru)         (опц. — для e-mail)
 *   SMTP_PORT            порт SMTP (465 = SSL, 587 = STARTTLS)    (по умолчанию 465)
 *   SMTP_USER            логин SMTP
 *   SMTP_PASS            пароль/пароль приложения SMTP
 *   ALLOW_ORIGIN         разрешённый origin для CORS  (по умолчанию https://ostvera.ru)
 */

const MAX_LEN = 2000; // защита от «раздувания» полей

const FIELDS = [
  ['name', 'Имя'],
  ['company', 'Компания'],
  ['phone', 'Телефон'],
  ['email', 'E-mail'],
  ['need', 'Что требуется'],
  ['comment', 'Комментарий'],
];

function clean(v) {
  if (v == null) return '';
  return String(v).slice(0, MAX_LEN).trim();
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOW_ORIGIN || 'https://ostvera.ru',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(obj),
  };
}

/** Разбор тела запроса из разных форматов события (YCF / Timeweb / прямой JSON). */
function parseBody(event) {
  if (!event) return {};
  let raw = event.body;
  if (raw == null && typeof event === 'object' && !('httpMethod' in event)) {
    return event; // событие само по себе может быть телом
  }
  if (event.isBase64Encoded && typeof raw === 'string') {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  return raw && typeof raw === 'object' ? raw : {};
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, skipped: 'no TELEGRAM_* env' };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error('Telegram API ' + res.status + ' ' + detail.slice(0, 200));
  }
  return { ok: true };
}

async function sendEmail(subject, text) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return { ok: false, skipped: 'no SMTP_* env' };
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || SMTP_USER,
    to: process.env.MAIL_TO || 'info@ostvera.ru',
    subject,
    text,
  });
  return { ok: true };
}

module.exports.handler = async function (event) {
  event = event || {};
  const method = event.httpMethod || event.method || 'POST';
  if (method === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (method !== 'POST') return reply(405, { ok: false, error: 'method not allowed' });

  const data = parseBody(event);

  // 1) honeypot: реальный пользователь оставляет поле website пустым.
  if (clean(data.website)) return reply(200, { ok: true });

  // 2) согласие на обработку ПДн обязательно (152-ФЗ)
  const consent = data.consent;
  const consentOk = consent === 'yes' || consent === 'on' || consent === true || consent === 'true';
  if (!consentOk) return reply(422, { ok: false, error: 'consent required' });

  // 3) минимально необходимые поля
  const name = clean(data.name);
  const phone = clean(data.phone);
  if (!name || !phone) return reply(422, { ok: false, error: 'name and phone required' });

  // 4) текст заявки
  const lines = ['🩺 Новая заявка с сайта Ostvera', ''];
  for (const [key, label] of FIELDS) {
    const val = clean(data[key]);
    if (val) lines.push(`${label}: ${val}`);
  }
  lines.push('', 'Согласие на обработку ПДн: да');
  const text = lines.join('\n');
  const subject = `Заявка с сайта Ostvera — ${name}`;

  // 5) доставка: Telegram обязателен, e-mail — если настроен SMTP.
  const results = await Promise.allSettled([sendTelegram(text), sendEmail(subject, text)]);
  const delivered = results.some((r) => r.status === 'fulfilled' && r.value && r.value.ok);

  if (!delivered) {
    console.error('lead delivery failed', results.map((r) => (r.status === 'rejected' ? (r.reason && r.reason.message) : r.value)));
    return reply(502, { ok: false, error: 'delivery failed' });
  }
  return reply(200, { ok: true });
};

// Локальный запуск: node index.js '{"name":"Тест","phone":"+7","consent":"yes"}'
if (require.main === module) {
  module.exports.handler({ httpMethod: 'POST', body: process.argv[2] || '{}' })
    .then((r) => console.log(r.statusCode, r.body));
}
