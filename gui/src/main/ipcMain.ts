import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import type { BasicEncryptor } from '@akira-encryptor/core/types'
import runEncryptorWorker from './helpers/runEncryptorWorker'
import runBackupWorker from './helpers/runBackupWorker'
import Encryptor from '@akira-encryptor/core'
import CONF from '@configs/electronConf'
import moment from 'moment'
import path from 'path'
import fs from 'fs'

const getUserConfig = () => CONF.get('userConfig')
const EncryptorConfig = getUserConfig().encryptorConfig

let isDialogOpen = false
let ENCRYPTOR: BasicEncryptor
let PASSWORD: Buffer

export default function registerIpcMain() {
  ipcMain.handle('initialize-encryptor', async (_event: IpcMainInvokeEvent, password: string) => {
    try {
      // Using a buffer to have better memory control of the password.
      PASSWORD = Buffer.from(password, 'utf-8')
      ENCRYPTOR = await Encryptor.init(PASSWORD.toString()) // This is a basic instance of the Encryptor class
      return { error: null, success: true }
    } catch (error) {
      console.error('Error initializing encryptor:', error)
      return { error: (error as Error).message, success: false }
    }
  })

  ipcMain.handle('backup-action', async (_event, props: BackupActionProps) => {
    const src = String(props.srcPath)
    const { itemId, action } = props

    if (action === 'create') {
      const dest = path.join(
        getUserConfig().backupPath,
        `backup_${itemId}_${moment().format('DD-MM-YYYY_HH-mm-ss')}.7z`
      )
      console.log('Generate backup:', { src, dest })

      try {
        const result = await runBackupWorker({ src, dest, password: PASSWORD })
        return { error: null, success: true, dest: result.dest }
      } catch (error) {
        console.error(error)
        return { error: (error as Error).message, success: false, dest: null }
      }
    } else {
      try {
        console.log('Remove backup:', { src })
        fs.rmSync(src, { force: true, maxRetries: 3 })
        return { error: null, success: true, dest: null }
      } catch (error) {
        console.error('Error removing backup:', error)
        return { error: (error as Error).message, success: false }
      }
    }
  })

  ipcMain.on('encryptor-action', async (_event: IpcMainInvokeEvent, props: EncryptFileProps) => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0]

      const onProgress = (progressData: string) => {
        mainWindow?.webContents.send('onProgress', progressData)
      }
      const onEnd = async (endData: string) => {
        await ENCRYPTOR.refreshStorage()
        mainWindow?.webContents.send('onOperationEnd', endData)
      }
      const onError = (errorData: unknown) => {
        mainWindow?.webContents.send('onProgressError', errorData)
        console.error(errorData)
      }

      runEncryptorWorker({
        ...props,
        password: PASSWORD,
        EncryptorConfig,
        onProgress,
        onError,
        onEnd
      })
    } catch (error) {
      console.error('Error in encryptor action:', error)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow?.webContents.send('onProgressError', {
        message: (error as Error).message,
        srcPath: props.srcPath,
        itemId: props.itemId
      } as ProgressCallbackErrorProps)
    }
  })

  ipcMain.handle('open-explorer', async (event: IpcMainInvokeEvent, props: OpenExplorerProps) => {
    if (isDialogOpen) return null
    isDialogOpen = true
    const {
      filters = [{ name: 'Todos los archivos', extensions: ['*'] }],
      title = 'Selecciona un archivo',
      properties
    } = props

    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        properties,
        filters,
        title
      })

      if (result.canceled) return null
      return result.filePaths.toString()
    } catch (error) {
      console.error('Error opening file dialog:', error)
      return null
    } finally {
      isDialogOpen = false
    }
  })

  ipcMain.handle('get-encrypted-content', async (_event: IpcMainInvokeEvent) => {
    try {
      const content = ENCRYPTOR.getStorage()
      return Array.from(content.entries())
    } catch (error) {
      return error
    }
  })

  ipcMain.on('open-devtools', (_event) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.openDevTools()
    }
  })

  ipcMain.handle(
    'visibility-action',
    async (_event: IpcMainInvokeEvent, props: VisibilityActions) => {
      const { action, itemId } = props
      let success = false
      try {
        const storage = ENCRYPTOR.getStorage()
        const item = storage.get(itemId)
        if (!item) {
          throw new Error('Item not found')
        }
        if (action === 'show') {
          success = await ENCRYPTOR.revealStoredItem(itemId)
        } else {
          success = await ENCRYPTOR.hideStoredItem(itemId)
        }
        return { error: null, success }
      } catch (error) {
        console.error('Error in visibility action:', error)
        return {
          error: (error as Error).message,
          success
        }
      }
    }
  )

  ipcMain.on('open-path', (_event: IpcMainInvokeEvent, targetPath: string) => {
    if (!fs.existsSync(targetPath)) {
      console.error('Ruta no encontrada:', targetPath)
      return
    }

    if (fs.statSync(targetPath).isDirectory()) {
      shell.openPath(path.resolve(targetPath))
    } else {
      shell.showItemInFolder(path.resolve(targetPath))
    }
  })
}
