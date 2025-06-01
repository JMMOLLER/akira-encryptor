import getCompressionOptions from '@gui/utils/getCompressionOptions'
import backupWorker from '@workers/backup.worker?nodeWorker'

interface Props {
  password: Buffer
  dest: string
  src: string
}
type Result = Omit<Props, 'password' | 'src'>

export default function runBackupWorker({ src, dest, password }: Props): Promise<Result> {
  const { algorithm, level, maxThreads } = getCompressionOptions()

  return new Promise((resolve, reject) => {
    const worker = backupWorker({
      workerData: {
        node7zOptions: {
          $raw: [level, algorithm, `-mmt=${maxThreads}`, '-mhe=on']
        },
        password,
        dest,
        src
      } satisfies BackupWorkerProps
    })

    let settled = false

    const safeResolve = (data: Result) => {
      if (!settled) {
        settled = true
        resolve(data)
      }
    }

    const safeReject = (err: unknown) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    }

    worker
      .on('message', async (message) => {
        switch (message.type) {
          case 'end':
            try {
              await worker.terminate()
              safeResolve({ dest })
            } catch (terminateErr) {
              safeReject(
                new Error('Error al finalizar el worker: ' + (terminateErr as Error).message)
              )
            }
            break
          case 'error':
            await worker
              .terminate()
              .finally(() => safeReject(new Error('Worker error: ' + message.error)))
            break
        }
      })
      .on('error', (err) => {
        safeReject(err)
      })
  })
}
