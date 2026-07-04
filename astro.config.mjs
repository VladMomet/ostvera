import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production domain. Keep in sync with SITE in src/i18n/utils.ts and public/robots.txt.
export default defineConfig({
  site: 'https://ostvera.ru',
  integrations: [sitemap()],
});
