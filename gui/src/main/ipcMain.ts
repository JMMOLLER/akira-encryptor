import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProgressCallback } from '../../../types'
import Encryptor from '@core/libs/Encryptor'
import { Conf } from 'electron-conf/main'
import { path7za } from '7zip-bin'
import node7z from 'node-7z'
import moment from 'moment'
import path from 'path'

const COMPRESSION_ALGORITHM: CompressionAlgorithm = '-m0=lzma2'
const COMPRESSION_LVL: CompressionLvl = '-mx=5'
const CONF = new Conf<ConfStoreType>()
let isDialogOpen = false
let ENCRYPTOR: Encryptor
let PASSWORD: Buffer

export default function registerIpcMain() {
  ipcMain.handle('initialize-encryptor', async (_event: IpcMainInvokeEvent, password: string) => {
    try {
      // Using a buffer to have better memory control of the password.
      PASSWORD = Buffer.from(password, 'utf-8')
      ENCRYPTOR = await Encryptor.init(PASSWORD.toString(), {
        minDelayPerStep: 0,
        silent: true
      })
      return { error: null, success: true }
    } catch (error) {
      console.error('Error initializing encryptor:', error)
      return { error: (error as Error).message, success: false }
    }
  })

  ipcMain.handle('backup-action', async (_event: IpcMainInvokeEvent, props: BackupActionProps) => {
    try {
      const src = String(props.filePath)
      const { itemId } = props

      const dest = path.join(
        CONF.get('userConfig.backupPath'),
        `backup_${itemId}_${moment().format('YYYY-MM-DD_HH-mm-ss')}.7z`
      )
      console.log({ src, dest })

      const proc = node7z.add(dest, src, {
        $bin: path7za,
        recursive: true,
        password: PASSWORD.toString(),
        $raw: [COMPRESSION_LVL, COMPRESSION_ALGORITHM, '-mhe=on']
      })

      return await new Promise((resolve, reject) => {
        proc.on('error', (err: Error) => {
          reject({ error: err, success: false })
        })
        proc.on('end', () => {
          resolve({ error: null, success: true })
        })
      })
    } catch (error) {
      console.error('Error in backup action:', error)
      return { error: (error as Error).message, success: false }
    }
  })

  ipcMain.on('encryptor-action', async (_event: IpcMainInvokeEvent, props: EncryptFileProps) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const filePath = String(props.filePath)
    const { itemId } = props

    try {
      const handleProgress: ProgressCallback = (processedBytes, totalBytes) => {
        // send progress to renderer process
        if (focusedWindow) {
          focusedWindow.webContents.send('onProgress', {
            processedBytes,
            totalBytes,
            itemId
          })
        }
      }
      const handleEnd: EncryptorFuncion['onEnd'] = (err) => {
        // send progress to renderer process
        if (focusedWindow) {
          focusedWindow.webContents.send('onOperationEnd', {
            error: err ? (err instanceof Error ? err.message : String(err)) : null,
            actionFor: props.actionFor,
            itemId
          })
        }
      }

      // Payload to send to the encryptor
      const fileSendPayload: EncryptorFuncion = {
        filePath: filePath,
        onProgress: handleProgress,
        onEnd: handleEnd
      }

      switch (props.action) {
        case 'encrypt':
          props.actionFor === 'file'
            ? await ENCRYPTOR.encryptFile(fileSendPayload)
            : await ENCRYPTOR.encryptFolder(fileSendPayload)
          break
        case 'decrypt':
          props.actionFor === 'file'
            ? await ENCRYPTOR.decryptFile(fileSendPayload)
            : await ENCRYPTOR.decryptFolder(fileSendPayload)
          break
        default:
          throw new Error('Acción no válida')
      }
    } catch (error) {
      // Send error to renderer process
      if (focusedWindow) {
        focusedWindow.webContents.send('onProgressError', {
          message: (error as Error).message,
          filePath,
          itemId
        })
      }
      console.error(error)
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
      return result.filePaths
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
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.openDevTools()
    }
  })

  ipcMain.handle(
    'visibility-action',
    async (_event: IpcMainInvokeEvent, props: VisibilityActions) => {
      const { action, itemId } = props
      try {
        const storage = ENCRYPTOR.getStorage()
        const item = storage.get(itemId)
        if (!item) {
          throw new Error('Item not found')
        }
        if (action === 'show') {
          await ENCRYPTOR.revealStoredItem(itemId)
        } else {
          await ENCRYPTOR.hideStoredItem(itemId)
        }
        return { error: null, success: true }
      } catch (error) {
        console.error('Error in visibility action:', error)
        return {
          error: (error as Error).message,
          success: false
        }
      }
    }
  )
}
