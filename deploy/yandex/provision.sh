#!/usr/bin/env bash
# Поднимает инфраструктуру Ostvera в Yandex Cloud и печатает значения для секретов GitHub.
# Идемпотентно: существующие ресурсы переиспользуются, не пересоздаются.
#
# Требуется: yc (авторизован: `yc init`), jq. Запуск из корня репозитория:
#   bash deploy/yandex/provision.sh
#
# Что создаёт (всё в текущем folder из `yc config`):
#   - бакет Object Storage со static website hosting (публичное чтение)
#   - сервисный аккаунт ostvera-ci + роль editor на folder
#   - static access key (для заливки статики / GitHub Actions)
#   - авторизованный ключ JSON (для деплоя функции из GitHub Actions)
#   - Cloud Function ostvera-lead (код зальёт CI или `yc ... version create`)
#   - API Gateway ostvera (из apigateway.yaml с подставленными id)
set -euo pipefail

# ── параметры (можно переопределить через env) ─────────────────────────────
BUCKET="${BUCKET:-ostvera-site}"      # имя бакета — ГЛОБАЛЬНО уникальное
SA_NAME="${SA_NAME:-ostvera-ci}"
FUNCTION_NAME="${FUNCTION_NAME:-ostvera-lead}"
GATEWAY_NAME="${GATEWAY_NAME:-ostvera}"
SPEC_SRC="deploy/yandex/apigateway.yaml"
SPEC_OUT="deploy/yandex/apigateway.generated.yaml"   # временный, не коммитить

command -v yc >/dev/null || { echo "❌ yc не установлен. https://cloud.yandex.ru/docs/cli/quickstart"; exit 1; }
command -v jq >/dev/null || { echo "❌ jq не установлен"; exit 1; }

FOLDER_ID="$(yc config get folder-id)"
[ -n "$FOLDER_ID" ] || { echo "❌ folder-id не задан. Выполните: yc init"; exit 1; }
echo "▶ folder: $FOLDER_ID"

# ── 1. бакет + website hosting + публичное чтение ──────────────────────────
if yc storage bucket get --name "$BUCKET" >/dev/null 2>&1; then
  echo "✔ бакет $BUCKET уже есть"
else
  echo "▶ создаю бакет $BUCKET"
  yc storage bucket create --name "$BUCKET" --max-size 1073741824 >/dev/null
fi
yc storage bucket update --name "$BUCKET" \
  --website-index-document index.html --website-error-document 404.html \
  --public-read >/dev/null
echo "✔ website hosting включён: https://$BUCKET.website.yandexcloud.net"

# ── 2. сервисный аккаунт + роль editor на folder ───────────────────────────
if yc iam service-account get "$SA_NAME" >/dev/null 2>&1; then
  echo "✔ сервисный аккаунт $SA_NAME уже есть"
else
  echo "▶ создаю сервисный аккаунт $SA_NAME"
  yc iam service-account create --name "$SA_NAME" >/dev/null
fi
SA_ID="$(yc iam service-account get "$SA_NAME" --format json | jq -r .id)"
# editor покрывает: заливку в бакет, деплой и вызов функции.
# Для least-privilege замените на: storage.editor + serverless.functions.admin + serverless.functions.invoker
yc resource-manager folder add-access-binding "$FOLDER_ID" \
  --role editor --subject "serviceAccount:$SA_ID" >/dev/null 2>&1 || true
echo "✔ SA_ID=$SA_ID (роль editor выдана)"

# ── 3. ключи ───────────────────────────────────────────────────────────────
echo "▶ создаю static access key (для Object Storage)"
STATIC_KEY_JSON="$(yc iam access-key create --service-account-id "$SA_ID" --format json)"
STORAGE_KEY_ID="$(echo "$STATIC_KEY_JSON" | jq -r .access_key.key_id)"
STORAGE_SECRET="$(echo "$STATIC_KEY_JSON" | jq -r .secret)"

echo "▶ создаю авторизованный ключ (для деплоя функции)"
yc iam key create --service-account-id "$SA_ID" --output sa-key.json >/dev/null
echo "✔ ключи созданы (sa-key.json — не коммитить, удалить после занесения в секреты)"

# ── 4. Cloud Function ──────────────────────────────────────────────────────
if yc serverless function get "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "✔ функция $FUNCTION_NAME уже есть"
else
  echo "▶ создаю функцию $FUNCTION_NAME"
  yc serverless function create --name "$FUNCTION_NAME" >/dev/null
fi
FUNCTION_ID="$(yc serverless function get "$FUNCTION_NAME" --format json | jq -r .id)"
echo "✔ FUNCTION_ID=$FUNCTION_ID (код зальёт GitHub Actions при пуше в main)"

# ── 5. API Gateway из шаблона ──────────────────────────────────────────────
echo "▶ генерирую спецификацию и создаю/обновляю API Gateway $GATEWAY_NAME"
sed -e "s|<FUNCTION_ID>|$FUNCTION_ID|g" \
    -e "s|<SERVICE_ACCOUNT_ID>|$SA_ID|g" \
    -e "s|<BUCKET_NAME>|$BUCKET|g" \
    "$SPEC_SRC" > "$SPEC_OUT"
if yc serverless api-gateway get "$GATEWAY_NAME" >/dev/null 2>&1; then
  yc serverless api-gateway update "$GATEWAY_NAME" --spec="$SPEC_OUT" >/dev/null
else
  yc serverless api-gateway create --name "$GATEWAY_NAME" --spec="$SPEC_OUT" >/dev/null
fi
GW_DOMAIN="$(yc serverless api-gateway get "$GATEWAY_NAME" --format json | jq -r .domain)"
echo "✔ API Gateway домен по умолчанию: https://$GW_DOMAIN"

# ── итог: значения для секретов GitHub ─────────────────────────────────────
cat <<EOF

════════════════════════════════════════════════════════════════════
ГОТОВО. Значения для секретов GitHub (Settings → Secrets → Actions):

  YC_BUCKET            = $BUCKET
  YC_STORAGE_KEY_ID    = $STORAGE_KEY_ID
  YC_STORAGE_SECRET    = $STORAGE_SECRET
  YC_FUNCTION_ID       = $FUNCTION_ID
  YC_SA_JSON_CREDENTIALS = (содержимое файла sa-key.json целиком)

Ещё задайте секреты бота/почты: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
и при необходимости MAIL_TO, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.

Быстро через gh (если установлен и авторизован):
  gh secret set YC_BUCKET -b "$BUCKET"
  gh secret set YC_STORAGE_KEY_ID -b "$STORAGE_KEY_ID"
  gh secret set YC_STORAGE_SECRET -b "$STORAGE_SECRET"
  gh secret set YC_FUNCTION_ID -b "$FUNCTION_ID"
  gh secret set YC_SA_JSON_CREDENTIALS < sa-key.json

Дальше:
  1) задайте секреты; 2) Actions → Deploy to Yandex Cloud → Run workflow
     (или git push) — статика и функция выложатся;
  3) проверьте https://$GW_DOMAIN/ru/ ; привяжите домен ostvera.ru к шлюзу
     (Certificate Manager + DNS) — см. deploy/yandex/README.md;
  4) удалите sa-key.json:  rm sa-key.json
════════════════════════════════════════════════════════════════════
EOF
