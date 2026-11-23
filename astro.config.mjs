// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site.ts';

const hidden = ['/admin/', '/bestill/takk/', '/404/'];

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      filter: (page) => !hidden.some((p) => new URL(page).pathname === p),
      changefreq: 'monthly',
    }),
  ],
  image: {
    responsiveStyles: false,
  },
  devToolbar: { enabled: false },
});
