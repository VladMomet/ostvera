# CI/CD: GitHub Actions → Yandex Cloud

Workflow `.github/workflows/deploy.yml` при пуше в `main`:
1. `npm ci && npm run build`;
2. синхронизирует `./dist` в бакет Object Storage (ассеты `/_astro/**` — с длинным кэшем,
   остальное — с коротким и `--delete` для удаления устаревших файлов);
3. деплоит функцию `serverless/lead` в Cloud Functions.

Разовая подготовка в облаке нужна один раз (см. `deploy/yandex/README.md`):
бакет с static website hosting, функция, API Gateway. Дальше выкладку делает CI.

## Секреты репозитория

GitHub → репозиторий → **Settings → Secrets and variables → Actions → New repository secret**.

| Секрет | Что это | Обяз. |
|---|---|---|
| `YC_BUCKET` | имя бакета, напр. `ostvera-site` | да |
| `YC_STORAGE_KEY_ID` | **static access key** сервисного аккаунта (Access Key ID) | да |
| `YC_STORAGE_SECRET` | секретная часть static access key | да |
| `YC_SA_JSON_CREDENTIALS` | авторизованный ключ сервисного аккаунта (весь JSON-файл) | да |
| `YC_FUNCTION_ID` | id функции из Cloud Functions | да |
| `TELEGRAM_BOT_TOKEN` | токен бота | для TG |
| `TELEGRAM_CHAT_ID` | id чата получателя | для TG |
| `MAIL_TO` | почта получателя (по умолч. `info@ostvera.ru`) | нет |
| `MAIL_FROM` | почта отправителя | нет |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP для e-mail | для почты |

> Секреты, которые не задали, пробросятся в функцию пустыми — это ок: без `SMTP_*`
> письмо просто не отправляется, заявка всё равно уходит в Telegram.

## Как получить ключи

**Сервисный аккаунт** (один на CI): в консоли YC → IAM → создать SA, роли:
`storage.editor` (заливка в бакет) и `functions.editor` (деплой функции).

**Static access key** (для Object Storage / AWS CLI):
```bash
yc iam access-key create --service-account-name <SA> --format json
# → выведет key_id и secret — в YC_STORAGE_KEY_ID и YC_STORAGE_SECRET
```

**Авторизованный ключ** (для yc-actions/yc-sls-function):
```bash
yc iam key create --service-account-name <SA> --output sa-key.json
# содержимое sa-key.json целиком → секрет YC_SA_JSON_CREDENTIALS (потом файл удалить)
```

**Function ID:**
```bash
yc serverless function get <имя-функции> --format json | jq -r .id
```

## Ручной запуск
Actions → «Deploy to Yandex Cloud» → **Run workflow**.

## Проверка после деплоя
- `https://ostvera.ru/ru/` и `/en/` открываются;
- `POST /api/lead` → `200 {"ok":true}`, заявка пришла в Telegram/на почту;
- в Actions лог зелёный на обоих шагах (sync + function).

## Примечание про версию action
Инпуты `yc-actions/yc-sls-function@v3` сверьте с её README, если поменяется мажорная
версия: https://github.com/yc-actions/yc-sls-function
