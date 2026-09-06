import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function serveDataAndAssetsPlugin(): Plugin {
  return {
    name: 'serve-data-and-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // 1. Data folder requests
        if (req.url.startsWith('/data/') || req.url === '/data' || req.url === '/data/') {
          const relativePath = decodeURIComponent(req.url.replace(/^\/data\/?/, ''));
          const dataDir = path.resolve(__dirname, 'data');

          if (!relativePath) {
            // Return HTML directory listing to emulate Python http.server for discoverDataFiles()
            try {
              const files = fs.readdirSync(dataDir);
              const links = files.map(f => `<a href="${f}">${f}</a>`).join('<br>\n');
              const html = `<!DOCTYPE html><html><body>${links}</body></html>`;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
              return;
            } catch (err) {
              return next();
            }
          }

          const filePath = path.resolve(dataDir, relativePath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.json': 'application/json; charset=utf-8',
              '.txt': 'text/plain; charset=utf-8',
              '.csv': 'text/csv; charset=utf-8',
              '.tsv': 'text/tab-separated-values; charset=utf-8',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }

        // 2. Root assets: sw.js, manifest.json, icon.svg
        const rootAssets = ['/sw.js', '/manifest.json', '/icon.svg'];
        if (rootAssets.includes(req.url)) {
          const assetPath = path.resolve(__dirname, req.url.slice(1));
          if (fs.existsSync(assetPath)) {
            const ext = path.extname(assetPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.js': 'application/javascript; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.svg': 'image/svg+xml',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(assetPath).pipe(res);
            return;
          }
        }

        next();
      });
    },
    closeBundle() {
      // Copy data folder to dist/data
      const dataSrc = path.resolve(__dirname, 'data');
      const dataDest = path.resolve(__dirname, 'dist', 'data');
      if (fs.existsSync(dataSrc)) {
        fs.cpSync(dataSrc, dataDest, { recursive: true });
      }

      // Copy sw.js, manifest.json, icon.svg to dist/
      ['sw.js', 'manifest.json', 'icon.svg'].forEach(file => {
        const src = path.resolve(__dirname, file);
        const dest = path.resolve(__dirname, 'dist', file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      });

      // Mirror dist to docs/ folder for GitHub Pages /docs branch deployment
      const distDir = path.resolve(__dirname, 'dist');
      const docsDest = path.resolve(__dirname, 'docs');
      if (fs.existsSync(distDir)) {
        fs.cpSync(distDir, docsDest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDataAndAssetsPlugin()],
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
