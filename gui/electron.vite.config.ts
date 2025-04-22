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
        '@utils': resolve(corePath, 'utils'),
        '@libs': resolve(corePath, 'libs'),
        '@configs': resolve(corePath, 'configs'),
        '@adapters': resolve(corePath, 'adapters')
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
        '@renderer': resolve('src/renderer/src'),
        '@utils': resolve(corePath, 'utils')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
