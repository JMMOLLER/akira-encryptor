import type { ProgressCallback } from '@akira-encryptor/core/types'
import { workerPath } from '@akira-encryptor/core/workers/encryptor'
import { parentPort, workerData as wd } from 'worker_threads'
import Encryptor from '@akira-encryptor/core'

type PayloadBase = Partial<FolderEncryptor> &
  Partial<FolderDecryptor> &
  Partial<FileEncryptor> &
  Partial<FileDecryptor>

if (!parentPort) throw new Error('IllegalState')

const workerData = wd as WorkerEncryptProps

async function main() {
  const { srcPath, itemId, extraProps } = workerData
  const password = Buffer.from(workerData.password)

  const ENCRYPTOR = await Encryptor.init(password.toString(), workerPath!, {
    allowExtraProps: true,
    minDelayPerStep: 0,
    silent: true
  })

  const sendProgress: ProgressCallback = (processedBytes, totalBytes) => {
    parentPort!.postMessage({
      type: 'progress',
      processedBytes,
      totalBytes,
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

  const payload: PayloadBase = {
    onProgress: sendProgress,
    extraProps,
    onEnd
  }

  if (workerData.actionFor === 'file') {
    payload.filePath = srcPath
  } else if (workerData.actionFor === 'folder') {
    payload.folderPath = srcPath
  } else {
    throw new Error('Invalid actionFor type')
  }

  try {
    if (workerData.action === 'encrypt') {
      workerData.actionFor === 'file'
        ? await ENCRYPTOR.encryptFile(payload as FileEncryptor)
        : await ENCRYPTOR.encryptFolder(payload as FolderDecryptor)
    } else if (workerData.action === 'decrypt') {
      workerData.actionFor === 'file'
        ? await ENCRYPTOR.decryptFile(payload as FileDecryptor)
        : await ENCRYPTOR.decryptFolder(payload as FolderDecryptor)
    } else {
      throw new Error('Acción no válida')
    }
  } catch (err) {
    parentPort!.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      srcPath,
      itemId
    })
  }
}

main().catch((err) => {
  parentPort!.postMessage({
    type: 'error',
    message: err instanceof Error ? err.message : String(err),
    srcPath: workerData.srcPath,
    itemId: workerData.itemId
  })
})
