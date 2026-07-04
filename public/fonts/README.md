# Шрифты

`@font-face` уже подключены в `src/styles/global.css`, а переменные обновлены:
- `--font-display` → **General Sans** (дисплейный гротеск), fallback — системный.
- `--font-body` → **IBM Plex Sans**, fallback — системный.

Пока файлов здесь нет — работает системный fallback, сайт не ломается. Положите
сюда `.woff2` **ровно с такими именами**, и шрифты подхватятся автоматически:

## General Sans (дисплейный) — Fontshare, бесплатно
Скачать: https://www.fontshare.com/fonts/general-sans → положить сюда:

| Файл | Начертание |
|---|---|
| `GeneralSans-Medium.woff2` | 500 |
| `GeneralSans-Bold.woff2` | 700 |
| `GeneralSans-Semibold.woff2` | 800 (используется для заголовков `font-weight:800`) |

> Хотите Neue Montreal вместо General Sans — замените `src` и `font-family`
> в блоках `@font-face` и в `--font-display` (это лицензионный шрифт, нужна покупка).

## IBM Plex Sans (текст) — SIL OFL, бесплатно
Скачать: https://github.com/IBM/plex/releases (пакет IBM Plex Sans) или
https://fonts.google.com/specimen/IBM+Plex+Sans → конвертировать в `.woff2` и положить:

| Файл | Начертание |
|---|---|
| `IBMPlexSans-Regular.woff2` | 400 |
| `IBMPlexSans-Medium.woff2` | 500 |
| `IBMPlexSans-SemiBold.woff2` | 600 |

## Проверка
После добавления файлов: `npm run dev`, открыть сайт, в DevTools → Network →
Fonts убедиться, что `*.woff2` грузятся со статусом 200. Кириллица: у обоих шрифтов
есть кириллический набор — берите версии с поддержкой Cyrillic.
