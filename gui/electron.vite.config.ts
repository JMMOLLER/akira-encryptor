import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { adjustWorkerImports } from './utils/adjustWorkerImports'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const corePath = resolve(__dirname, '../core')

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          // {
          //   src: '../node_modules/piscina/dist/worker.js',
          //   dest: './'
          // },
          // {
          //   src: '../node_modules/piscina/dist/symbols.js',
          //   dest: './'
          // },
          // {
          //   src: '../node_modules/piscina/dist/common.js',
          //   dest: './'
          // },
          // {
          //   src: '../dist/core/workers/encryptor.worker.cjs',
          //   rename: 'encryptor.worker.js',
          //   dest: './core/workers'
          // }
        ]
      })
      // adjustWorkerImports()
    ],
    resolve: {
      alias: {
        '@core': corePath,
        '@workers': resolve('src/workers'),
        '@libs': resolve(corePath, 'libs'),
        '@gui/utils': resolve('src/utils'),
        '@utils': resolve(corePath, 'utils'),
        '@crypto': resolve(corePath, 'crypto'),
        '@gui/configs': resolve('src/configs'),
        '@configs': resolve(corePath, 'configs'),
        '@adapters': resolve(corePath, 'adapters')
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    build: {
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@gui/utils': resolve('src/utils')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@configs': resolve(corePath, 'configs'),
        '@renderer': resolve('src/renderer/src'),
        '@utils': resolve(corePath, 'utils'),
        '@gui/utils': resolve('src/utils'),
        '@workers': resolve('src/workers')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
