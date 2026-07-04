# Serverless-обработчик заявки `/api/lead`

Функция принимает `POST /api/lead` (JSON от формы на сайте) и отправляет заявку
**в Telegram-бот** и **на e-mail**. Рассчитана на российское облако и хранение
ПДн в РФ (152-ФЗ): секреты — в переменных окружения, ПДн не логируются.

```
serverless/lead/
  index.mjs      обработчик (export const handler)
  package.json   зависимость nodemailer (для e-mail)
```

Фронтенд уже шлёт запрос: `fetch('/api/lead', { method:'POST', body: JSON.stringify(...) })`
(см. `src/layouts/Base.astro`). На форме есть honeypot-поле `website` и чекбокс
согласия `consent` — оба проверяются на сервере.

## Переменные окружения

| Переменная | Назначение | Обяз. |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота от [@BotFather](https://t.me/BotFather) | для TG |
| `TELEGRAM_CHAT_ID` | id чата/группы/канала получателя | для TG |
| `MAIL_TO` | e-mail получателя (по умолч. `info@ostvera.ru`) | нет |
| `MAIL_FROM` | e-mail отправителя (по умолч. = `SMTP_USER`) | нет |
| `SMTP_HOST` | хост SMTP, напр. `smtp.yandex.ru` | для почты |
| `SMTP_PORT` | `465` (SSL) или `587` (STARTTLS), по умолч. `465` | нет |
| `SMTP_USER` / `SMTP_PASS` | логин и пароль (пароль приложения) SMTP | для почты |
| `ALLOW_ORIGIN` | CORS-origin, по умолч. `https://ostvera.ru` | нет |

> Telegram обязателен как минимум один канал; e-mail включается только если заданы `SMTP_*`.

## Как получить `TELEGRAM_CHAT_ID`

1. Создать бота у @BotFather → получить `TELEGRAM_BOT_TOKEN`.
2. Написать что-нибудь боту (или добавить его в группу и упомянуть).
3. Открыть `https://api.telegram.org/bot<TOKEN>/getUpdates` → взять `chat.id` из ответа.

## Локальная проверка

```bash
cd serverless/lead
npm install
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=123456 \
  node index.mjs '{"name":"Иван","phone":"+79990000000","need":"3 УЗИ","consent":"yes"}'
# → 200 {"ok":true}
```

## Деплой — Yandex Cloud Functions

1. Cloud Functions → создать функцию, среда **Node.js 18**, точка входа `index.handler`.
2. Загрузить содержимое `serverless/lead/` (ZIP или из репозитория). `nodemailer`
   подтянется по `package.json`.
3. Прописать переменные окружения из таблицы выше.
4. Сделать функцию публичной **или** повесить перед ней **API Gateway** со спецификацией:

   ```yaml
   openapi: 3.0.0
   info: { title: ostvera-api, version: "1.0" }
   paths:
     /api/lead:
       post:
         x-yc-apigateway-integration:
           type: cloud_functions
           function_id: <ID_функции>
           service_account_id: <ID_сервисного_аккаунта>
   ```

5. Домен/поддомен `ostvera.ru` → на API Gateway так, чтобы путь `/api/lead`
   попадал в функцию, а остальное — на статику из `./dist`.

## Деплой — Timeweb Cloud

Вариант А — **Timeweb Cloud Apps (Функции)**: создать функцию Node.js 18,
загрузить `serverless/lead/`, задать переменные окружения, привязать путь `/api/lead`.

Вариант Б — если сайт на **облачном сервере/VPS** Timeweb: держать статику `./dist`
за Nginx, а функцию запустить рядом как маленький Node-сервис и проксировать
`location /api/lead { proxy_pass http://127.0.0.1:3001; }`. Обёртку над `handler`
для http-сервера добавить несложно — скажите, если нужен готовый вариант.

## Заметки по 152-ФЗ

- Разворачивайте функцию в **российском регионе** облака.
- Секреты — только в переменных окружения, не в коде и не в репозитории.
- Функция **не пишет ПДн в логи** (в консоль уходит лишь факт ошибки доставки).
- Для полноты: разместите на сайте политику/согласие (уже есть `/ru/privacy`,
  `/ru/consent`) и при необходимости подайте уведомление в Роскомнадзор как оператор ПДн.
