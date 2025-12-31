import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Build date is set at build time and injected via Vite's define
const BUILD_DATE = new Date().toISOString().split('T')[0];

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  image: {
    // Use compile-time image optimization since Cloudflare doesn't support Sharp at runtime
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false
      }
    }
  },
  integrations: [tailwind()],
  site: 'https://truschools.com',
  vite: {
    define: {
      // Inject build date at build time for sitemaps
      '__BUILD_DATE__': JSON.stringify(BUILD_DATE)
    }
  }
});
