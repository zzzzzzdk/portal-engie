import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version?: string }

interface PublicStaticAsset {
  fileName: string
  source: Buffer
}

function collectPublicStaticAssets(): PublicStaticAsset[] {
  const staticDir = path.resolve(__dirname, 'public/static')

  if (!fs.existsSync(staticDir)) {
    return []
  }

  const assets: PublicStaticAsset[] = []
  const publicDir = path.resolve(__dirname, 'public')

  const walk = (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath)
        return
      }

      const relativePath = path.relative(publicDir, fullPath)
      assets.push({
        fileName: relativePath.split(path.sep).join('/'),
        source: fs.readFileSync(fullPath),
      })
    })
  }

  walk(staticDir)

  return assets.sort((left, right) => left.fileName.localeCompare(right.fileName))
}

function emitExportRuntimeShellPlugin(): Plugin {
  return {
    name: 'emit-export-runtime-shell',
    generateBundle(_options, bundle) {
      const assetFiles = Object.keys(bundle)
        .filter(file => !file.endsWith('.map'))
        .sort((left, right) => left.localeCompare(right))
      const publicStaticAssets = collectPublicStaticAssets()

      publicStaticAssets.forEach(asset => {
        this.emitFile({
          type: 'asset',
          fileName: asset.fileName,
          source: asset.source,
        })
      })

      const indexHtml = [
        '<!doctype html>',
        '<html lang="zh-CN">',
        '  <head>',
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        '    <title>Portal Export Runtime</title>',
        '    <script src="./dashboard-data.js"></script>',
        '    <link rel="stylesheet" href="./static/export-runtime.css" />',
        '  </head>',
        '  <body>',
        '    <div id="root"></div>',
        '    <script src="./static/export-runtime.js"></script>',
        '  </body>',
        '  </html>',
        '',
      ].join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: indexHtml,
      })

      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(
          {
            version: packageJson.version || '0.0.0',
            files: Array.from(new Set([
              'index.html',
              'static/export-runtime.css',
              ...assetFiles,
              ...publicStaticAssets.map(asset => asset.fileName),
            ])),
          },
          null,
          2,
        ),
      })
    },
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [react(), emitExportRuntimeShellPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/assets/css/mixin.scss" as *;`,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/export-runtime'),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/export-runtime/main.tsx'),
      formats: ['iife'],
      name: 'PortalExportRuntime',
      fileName: () => 'export-runtime',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'static/export-runtime.js',
        chunkFileNames: 'static/chunks/[name]-[hash].js',
        assetFileNames: assetInfo => {
          if ((assetInfo.name || '').endsWith('.css')) {
            return 'static/export-runtime.css'
          }
          return 'static/assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
