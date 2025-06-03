import { parentPort, workerData as wd } from 'worker_threads'
import { ProgressCallback } from '../../../types'
import Encryptor from '@core/libs/Encryptor'

type Props = EncryptFileProps & {
  /**
   * @note Node.js worker threads do not support `Buffer` directly,
   * so Node.js casts `Buffer` to `Uint8Array`.
   */
  password: Uint8Array
}

if (!parentPort) throw new Error('IllegalState')

const workerData = wd as Props

async function main() {
  const { filePath, itemId, extraProps } = workerData
  const password = Buffer.from(workerData.password)

  const ENCRYPTOR = await Encryptor.init(password.toString(), {
    allowExtraProps: true,
    minDelayPerStep: 0,
    silent: true
  })

  const sendProgress: ProgressCallback = (
    processedBytes,
    totalBytes,
    processedFiles,
    totalFiles
  ) => {
    parentPort!.postMessage({
      type: 'progress',
      processedBytes,
      totalBytes,
      processedFiles,
      totalFiles,
      itemId
    })
  }

  const onEnd = (error?: Error | null) => {
    parentPort!.postMessage({
      error: error ? error.message : null,
      actionFor: workerData.actionFor,
      action: workerData.action,
      type: 'end',
      extraProps,
      itemId
    })
  }

  const payload = {
    filePath,
    onProgress: sendProgress,
    onEnd,
    extraProps
  }

  try {
    if (workerData.action === 'encrypt') {
      workerData.actionFor === 'file'
        ? await ENCRYPTOR.encryptFile(payload)
        : await ENCRYPTOR.encryptFolder(payload)
    } else if (workerData.action === 'decrypt') {
      workerData.actionFor === 'file'
        ? await ENCRYPTOR.decryptFile(payload)
        : await ENCRYPTOR.decryptFolder(payload)
    } else {
      throw new Error('Acción no válida')
    }
  } catch (err) {
    parentPort!.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      filePath,
      itemId
    })
  }
}

main().catch((err) => {
  parentPort!.postMessage({
    type: 'error',
    message: err instanceof Error ? err.message : String(err),
    filePath: workerData.filePath,
    itemId: workerData.itemId
  })
})
