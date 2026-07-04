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
> Проект собран без доступа к сети, поэтому сборка (`npm run build`) здесь не проверялась. Первый локальный запуск может потребовать мелких правок версий — при необходимости `npm i astro@latest @astrojs/sitemap@latest`.

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

## Что нужно доделать (TODO)
1. **Домен** — заменить `https://ostvera.ru` в `astro.config.mjs`, `src/i18n/utils.ts`, `public/robots.txt`. Предварительно проверить свободность домена и товарного знака (ФИПС/Роспатент).
2. **E-mail оператора** — заменить `info@ostvera.ru` в `src/i18n/utils.ts` и юридических страницах.
3. **Отчество оператора** — дополнить «ИП Оболенский Владимир …» в `utils.ts` и реквизитах.
4. **Юридические тексты** (`privacy/consent/offer/cookie`) — шаблоны, обязательно на проверку юристу.
5. **Фото** — сейчас в слотах фирменные SVG-иллюстрации. Реальные снимки положить в `public/images/` и заменить содержимое `<span class="illu">…</span>` в `src/partials/home.*.html` на `<img src="/images/…" alt="…">` (слот уже нужного размера).
6. **Шрифты** — сейчас системный стек. Для акцента подключить дисплейный гротеск (напр. Neue Montreal / General Sans) и IBM Plex Sans; положить в `public/fonts`, добавить `@font-face` в `global.css`, обновить `--font-display/--font-body`.
7. **Яндекс.Метрика** — вставить счётчик в `Base.astro` (комментарий-метка в `<head>`), настроить цель на отправку формы.
8. **Форма заявки** — фронт уже шлёт `POST /api/lead`. Нужен серверный обработчик (см. ниже).

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
