import { rm } from 'fs/promises'
import { app } from 'electron'

export default async function deleteStorageAndReload(libraryPath: string) {
  await rm(libraryPath, { force: true, maxRetries: 3 })
  app.relaunch({ args: process.argv.slice(1) })
  app.quit()
}
