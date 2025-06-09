import { default as pc } from 'picocolors'
import { Plugin } from 'vite'

export function adjustWorkerImports(): Plugin {
  const pluginName = 'adjust-worker-imports'
  return {
    name: pluginName,
    apply: 'build',
    generateBundle(_, bundle) {
      // For each asset in the bundle, we check if it is a chunk
      for (const [, chunkOrAsset] of Object.entries(bundle)) {
        // If it is a chunk, we replace the import of the encryptor worker from .ts to .js
        if (chunkOrAsset.type === 'chunk') {
          // Replace the import of the encryptor worker from .ts to .js
          chunkOrAsset.code = chunkOrAsset.code.replace(
            /(['"])core\/workers\/encryptor\.worker\.ts\1/g,
            `require('path').join(__dirname, 'core', 'workers', 'encryptor.worker.js')`
          )
        }
      }

      // Log a message to the console indicating that the import has been adjusted
      const prefix = pc.cyan(`[${pluginName}]`)
      const message = pc.green(
        'Referenced encryptor worker import adjusted to .js in the build output.'
      )
      console.log(`\n${prefix} ${message}`)
    }
  }
}
