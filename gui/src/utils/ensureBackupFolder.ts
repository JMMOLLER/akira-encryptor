import { app } from 'electron'
import path from 'path'
import fs from 'fs'

/**
 * @description `[ESP]` Asegura que la carpeta de backups exista, si no, la crea.
 * @description `[ENG]` Ensures that the backup folder exists, if not, it creates it.
 */
export default function ensureBackupFolder(pathToBackup?: string) {
  const backupPath = pathToBackup || path.join(app.getPath('userData'), 'Backups')
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
  }
  return backupPath
}
