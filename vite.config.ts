import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve';

  return {
    // AI Studio previews the app from '/', while GitHub Pages serves it from the repository path.
    base: isDevServer ? '/' : '/relevamiento-gasv-V1/',
    plugins: [
      {
        name: 'stale-html-proxy-fallback',
        enforce: 'pre',
        configureServer(server) {
          const cleanupScript = `(async () => {
  try {
    if (sessionStorage.getItem('gasv-sw-cleaned')) return;
    sessionStorage.setItem('gasv-sw-cleaned', '1');
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { console.warn('Limpieza SW/caché:', e); }
  location.reload();
})();
export default {};`;

          server.middlewares.use((req, res, next) => {
            const rawUrl = req.url?.split('?')[0] || '';
            if (rawUrl === '/' || rawUrl === '/index.html' || rawUrl === '/index.vite.html') {
              const origSetHeader = res.setHeader.bind(res);
              res.setHeader = ((name: string, value: any) => {
                if (typeof name === 'string' && name.toLowerCase() === 'cache-control') {
                  return origSetHeader('Cache-Control', 'no-store');
                }
                return origSetHeader(name, value);
              }) as any;
              origSetHeader('Cache-Control', 'no-store');
            }
            if (req.url && req.url.includes('html-proxy')) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.setHeader('Clear-Site-Data', '"cache", "storage"');
              return res.end(cleanupScript);
            }
            next();
          });
        },
        load(id) {
          if (id.includes('html-proxy')) {
            return `(async () => {
  try {
    if (sessionStorage.getItem('gasv-sw-cleaned')) return;
    sessionStorage.setItem('gasv-sw-cleaned', '1');
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { console.warn('Limpieza SW/caché:', e); }
  location.reload();
})();
export default {};`;
          }
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'gasv-icon-right.png',
          'gasv-logo.png',
        ],
        manifest: {
          id: '/relevamiento-gasv-V1/',
          name: 'Relevamiento Arquitectónico',
          short_name: 'Relevamiento',
          description:
            'Herramienta técnica de levantamiento, diagnóstico, registro fotográfico y cuantificación de proyectos arquitectónicos.',
          theme_color: '#17365d',
          background_color: '#17365d',
          display: 'standalone',
          orientation: 'any',
          start_url: '/relevamiento-gasv-V1/',
          scope: '/relevamiento-gasv-V1/',
          icons: [
            {
              src: './gasv-icon-right.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        // Keep the PWA service worker off during the AI Studio development preview.
        devOptions: {
          enabled: !isDevServer,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      rollupOptions: {
        input: path.resolve(process.cwd(), 'index.html'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
