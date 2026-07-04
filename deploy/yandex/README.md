# Деплой на Yandex Cloud

Архитектура: статика (`./dist`) в **Object Storage** (static website hosting),
форма `POST /api/lead` — в **Cloud Function**, оба на одном домене через **API Gateway**.
Всё в РФ-регионе (`ru-central1`) — данные хранятся в РФ (152-ФЗ).

```
Пользователь ──▶ API Gateway (домен ostvera.ru, HTTPS)
                   ├─ POST /api/lead ─▶ Cloud Function (Telegram + e-mail)
                   └─ GET *          ─▶ Object Storage (website endpoint) ─▶ ./dist
```

Нужен установленный и авторизованный `yc` (`yc init`).

## 1. Собрать сайт
```bash
npm ci && npm run build      # → ./dist
```

## 2. Object Storage: бакет со static website hosting
```bash
BUCKET=ostvera-site
yc storage bucket create --name $BUCKET --default-storage-class standard --max-size 1073741824
# включить website hosting: index.html как индекс, 404
yc storage bucket update --name $BUCKET \
  --website-index-document index.html --website-error-document 404.html
# публичный доступ на чтение (только на статику; функция отдельно)
yc storage bucket update --name $BUCKET --public-read
# залить сборку
aws s3 --endpoint-url=https://storage.yandexcloud.net sync ./dist s3://$BUCKET/ --delete
```
> Заливать можно и через `yc storage s3 cp/sync`, и любым S3-клиентом
> (endpoint `https://storage.yandexcloud.net`). Website-endpoint бакета:
> `https://ostvera-site.website.yandexcloud.net`.

## 3. Cloud Function из serverless/lead
```bash
cd serverless/lead && npm ci && zip -r ../lead.zip . && cd ../..
yc serverless function create --name ostvera-lead
yc serverless function version create \
  --function-name ostvera-lead \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m --execution-timeout 10s \
  --source-path serverless/lead.zip \
  --environment TELEGRAM_BOT_TOKEN=xxx,TELEGRAM_CHAT_ID=123456,MAIL_TO=info@ostvera.ru,SMTP_HOST=smtp.yandex.ru,SMTP_PORT=465,SMTP_USER=...,SMTP_PASS=...,ALLOW_ORIGIN=https://ostvera.ru
```
Секреты лучше хранить в **Lockbox** и монтировать в функцию, а не в открытых env.

## 4. Сервисный аккаунт для шлюза
```bash
yc iam service-account create --name ostvera-gw
# дать права на вызов функции и (если понадобится) на бакет
yc serverless function add-access-binding ostvera-lead \
  --role serverless.functions.invoker \
  --service-account-name ostvera-gw
```

## 5. API Gateway
Подставьте `<FUNCTION_ID>`, `<SERVICE_ACCOUNT_ID>`, `<BUCKET_NAME>` в
`deploy/yandex/apigateway.yaml`, затем:
```bash
yc serverless api-gateway create --name ostvera --spec=deploy/yandex/apigateway.yaml
```
ID функции: `yc serverless function get ostvera-lead --format json | jq -r .id`.

## 6. Домен и HTTPS
1. В API Gateway привязать кастомный домен `ostvera.ru` (нужен сертификат в
   **Certificate Manager**, подтверждение по DNS).
2. В DNS домена — CNAME/ALIAS на адрес шлюза.
3. Проверить: `https://ostvera.ru/ru/`, `https://ostvera.ru/en/`,
   и что форма реально доходит (Telegram + письмо).

## 7. Обновления
- Статика: `npm run build && aws s3 --endpoint-url=... sync ./dist s3://$BUCKET/ --delete`.
- Функция: пересобрать zip и `yc serverless function version create ...`.
- Удобно завести GitHub Actions (build → sync в бакет → новая версия функции).

## Проверки
- В браузере DevTools → Network: `POST /api/lead` возвращает `200 {"ok":true}`.
- В Telegram и на почте пришла заявка.
- honeypot: если заполнить скрытое поле `website` — заявка не уходит (сервер вернёт 200, но не отправит).
