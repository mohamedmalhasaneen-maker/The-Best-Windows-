import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const SITE_URL = 'https://the-best-windows.vercel.app';
const PUBLIC_INDEXABLE_ROUTES: Array<{
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}> = [
  {
    path: '/',
    changefreq: 'weekly',
    priority: '1.0',
  },
];

function buildSitemapXml(lastmod?: string): string {
  const urls = PUBLIC_INDEXABLE_ROUTES.map((route) => {
    const loc = `${SITE_URL}${route.path}`;
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function seoSitemapPlugin(): Plugin {
  return {
    name: 'the-best-windows-seo-sitemap',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0];
        if (cleanUrl === '/sitemap.xml') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(buildSitemapXml());
          return;
        }
        if (cleanUrl === '/robots.txt') {
          const robotsPath = path.resolve(__dirname, 'public/robots.txt');
          if (fs.existsSync(robotsPath)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(fs.readFileSync(robotsPath, 'utf-8'));
            return;
          }
        }
        next();
      });
    },
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist');
      const lastmod =
        process.env.SITEMAP_LASTMOD ||
        (process.env.VERCEL ? new Date().toISOString().split('T')[0] : undefined);
      const xml = buildSitemapXml(lastmod);
      fs.mkdirSync(outDir, {recursive: true});
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf-8');
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), seoSitemapPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
