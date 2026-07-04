export const locales = ['ru', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

/** Inline bilingual helper. Keeps copy next to markup. */
export function L(lang: Locale, ru: string, en: string): string {
  return lang === 'en' ? en : ru;
}

// Production domain. Keep in sync with astro.config.mjs and public/robots.txt.
export const SITE = 'https://ostvera.ru';

// Full name of the sole trader (ИП), built from parts so the patronymic (отчество)
// lives in one place. Order per Russian convention: Фамилия Имя Отчество.
const owner = {
  lastNameRu: 'Оболенский',
  firstNameRu: 'Владимир',
  patronymicRu: 'Владимирович', // отчество оператора
  lastNameEn: 'Obolenskiy',
  firstNameEn: 'Vladimir',
  patronymicEn: 'Vladimirovich',
};

const operatorRu = `ИП ${owner.lastNameRu} ${owner.firstNameRu} ${owner.patronymicRu}`.trim();
const operatorEn = `Sole trader ${owner.firstNameEn} ${owner.patronymicEn} ${owner.lastNameEn}`.trim();

export const company = {
  brand: 'Ostvera',
  phone: '+7 936 333-65-45',
  phoneHref: '+79363336545',
  telegram: '@ostvera',
  whatsapp: '+79363336545',
  inn: '774397462657',
  ogrnip: '324774600177170',
  addressRu: 'г. Москва, Пресненская набережная, 10',
  addressEn: 'Presnenskaya emb. 10, Moscow, Russia',
  owner,
  operatorRu,
  operatorEn,
  // E-mail оператора для обращений по обработке ПДн (152-ФЗ).
  email: 'info@ostvera.ru',
};
