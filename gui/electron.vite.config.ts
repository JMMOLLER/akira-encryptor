import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@workers': resolve('src/workers'),
        '@configs': resolve('src/configs'),
        '@utils': resolve('src/utils')
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
        '@utils': resolve('src/utils')
      }
    }
  },
  renderer: {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['util', 'crypto', 'stream', 'fs', 'path']
      })
    ],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@workers': resolve('src/workers')
      }
    }
  }
})
