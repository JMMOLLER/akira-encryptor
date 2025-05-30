import encryptorWorker from '@workers/encryptor.worker?nodeWorker'

type RunEncryptorWorkerParams = EncryptFileProps & {
  onProgress: (data: string) => void
  onError: (data: unknown) => void
  onEnd: (data: string) => void
  onExit: () => void
  password: Buffer
}

export default function runEncryptorWorker(props: RunEncryptorWorkerParams) {
  const { onProgress, onEnd, onError, onExit, ...rest } = props
  const worker = encryptorWorker({
    workerData: {
      ...rest,
      filePath: rest.filePath.toString()
    }
  })

  worker
    .on('message', (message) => {
      switch (message.type) {
        case 'progress':
          onProgress(message)
          break
        case 'end':
          onEnd(message)
          worker.terminate()
          break
        case 'error':
          onError(message)
          worker.terminate()
          break
      }
    })
    .on('error', (err) => {
      onError({ message: err.message, filePath: rest.filePath, itemId: rest.itemId })
    })
    .once('exit', () => {
      onExit()
    })
}
