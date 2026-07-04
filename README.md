# Ostvera — сайт

Двуязычный (RU/EN) статический сайт на **Astro** для поставок медицинского оборудования из Китая в РФ.

## Стек
- **Astro** (статическая генерация, минимум JS)
- `@astrojs/sitemap` — карта сайта
- Локализация через папки `/ru` и `/en` + `hreflang`
- Дизайн-токены и стили — `src/styles/global.css`

## Запуск
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # сборка в ./dist
npm run preview  # предпросмотр сборки
```
> Сборка проверена. Важно: `@astrojs/sitemap` закреплён на `~3.4.1` — версии `3.5+`
> требуют хук `astro:routes:resolved` из Astro 5 и на Astro 4 падают при генерации
> карты сайта. Обновлять sitemap только вместе с переходом на Astro 5.

## Структура
```
public/            robots.txt, favicon.svg  (+ сюда класть /images для фото)
src/
  styles/global.css     все токены и стили
  i18n/utils.ts         L(lang,ru,en), реквизиты компании, домен SITE
  layouts/Base.astro    <head>, SEO, hreflang, JSON-LD, общий JS (reveal/счётчики/форма)
  components/
    Header.astro  Footer.astro  InnerPage.astro
  partials/
    home.ru.html  home.en.html   тело главной, язык уже отрисован (для SEO)
  pages/
    index.astro           редирект / → /ru/
    ru/*  en/*             index, about, services, contacts, privacy, consent, offer, cookie
```
Главная отдаётся на каждом языке отдельным HTML (контент виден поисковикам, а не прячется в атрибутах).

## Статус доработок
- ✅ **Домен** `https://ostvera.ru` и **e-mail** `info@ostvera.ru` подтверждены в
  `astro.config.mjs`, `src/i18n/utils.ts`, `public/robots.txt`. (Свободность домена
  и товарного знака проверить отдельно — ФИПС/Роспатент.)
- ✅ **Реквизиты оператора** (ФИО, ИНН, ОГРНИП, адрес, e-mail) централизованы в
  `src/i18n/utils.ts` → `company` и подставляются на всех страницах. Отчество не
  указано (у оператора нет); если появится — впишите `owner.patronymicRu/En`,
  пустые части имени отбрасываются автоматически.
- ✅ **Форма заявки** — обработчик `POST /api/lead` в `serverless/lead/`
  (Telegram + e-mail, honeypot + согласие проверяются на сервере). См. `serverless/README.md`.
- ✅ **Фото** — `<img>` теперь drop-in замена SVG-слотам. Инструкция: `public/images/README.md`.
- ✅ **Шрифты** — General Sans + IBM Plex Sans подключены через `@font-face`, переменные
  обновлены, работает системный fallback. Осталось положить `.woff2`: `public/fonts/README.md`.
- ⬜ **Юридические тексты** (`privacy/consent/offer/cookie`) — шаблоны, обязательно на проверку юристу.
- ⬜ **Яндекс.Метрика** — вставить счётчик в `Base.astro` (комментарий-метка в `<head>`), настроить цель на отправку формы.

## Форма и 152-ФЗ
Персональные данные из формы должны храниться на серверах в РФ. Рекомендуется:
- разместить сайт на российском облаке (**Timeweb Cloud** или **Yandex Cloud**);
- обработчик `/api/lead` — как serverless-функция в РФ: принимает JSON, шлёт заявку в **Telegram-бот** и на **e-mail**, пишет лог в РФ-хранилище;
- на форме уже есть чекбокс согласия и honeypot-поле `website` от спама.

## Деплой (кратко)
1. Запушить репозиторий на GitHub.
2. Timeweb Cloud / Yandex Cloud: собрать `npm run build`, отдавать `./dist` как статику (или CI из GitHub).
3. Прописать домен, HTTPS, редирект `/` → `/ru/` (уже есть страничный редирект как запасной).
4. Добавить serverless-функцию `/api/lead` в том же облаке.

## Доделать удобнее в Claude Code
Установку зависимостей, проверку сборки, оптимизацию изображений, реализацию `/api/lead`, пуш на GitHub и деплой удобно доводить в Claude Code — там это выполняется и проверяется вживую.
