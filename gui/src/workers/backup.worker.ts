import { parentPort, workerData as wd } from 'worker_threads'
import { add } from 'node-7z'

if (!parentPort) throw new Error('IllegalState')

const workerData = wd as BackupWorkerProps

async function main() {
  const { src, dest, node7zOptions } = workerData
  const password = Buffer.from(workerData.password)

  const proc = add(dest, src, {
    $bin: workerData.$bin,
    password: password.toString(),
    ...node7zOptions
  })

  proc.on('end', () => {
    parentPort?.postMessage({ type: 'end', success: true, dest })
  })

  proc.on('error', (error) => {
    parentPort?.postMessage({ type: 'error', error: error.message })
  })
}

main().catch((error) => {
  parentPort!.postMessage({ type: 'error', error: error.message })
})
