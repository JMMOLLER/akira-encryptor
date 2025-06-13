import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const corePath = resolve(__dirname, '../core')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
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
