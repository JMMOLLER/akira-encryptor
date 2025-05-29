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
        '@libs': resolve(corePath, 'libs'),
        '@gui/utils': resolve('src/utils'),
        '@utils': resolve(corePath, 'utils'),
        '@configs': resolve(corePath, 'configs'),
        '@adapters': resolve(corePath, 'adapters'),
        '@gui/configs': resolve('src/configs')
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@configs': resolve(corePath, 'configs'),
        '@renderer': resolve('src/renderer/src'),
        '@utils': resolve(corePath, 'utils'),
        '@gui/utils': resolve('src/utils')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
