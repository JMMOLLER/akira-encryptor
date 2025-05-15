import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProgressCallback } from '../../../types'
import Encryptor from '@core/libs/Encryptor'

export default function registerIpcMain() {
  ipcMain.on('encryptor-action', async (_event: IpcMainInvokeEvent, props: EncryptFileProps) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const { password, filePath, itemId } = props

    try {
      const encryptor = await Encryptor.init(password)
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
        filePath: String(filePath),
        onProgress: handleProgress,
        onEnd: handleEnd
      }

      switch (props.action) {
        case 'encrypt':
          props.actionFor === 'file'
            ? await encryptor.encryptFile(fileSendPayload)
            : await encryptor.encryptFolder(fileSendPayload)
          break
        case 'decrypt':
          props.actionFor === 'file'
            ? await encryptor.decryptFile(fileSendPayload)
            : await encryptor.decryptFolder(fileSendPayload)
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

  ipcMain.handle('open-explorer', async (_event: IpcMainInvokeEvent, props: OpenExplorerProps) => {
    const {
      filters = [{ name: 'Todos los archivos', extensions: ['*'] }],
      title = 'Selecciona un archivo',
      properties
    } = props

    const result = await dialog.showOpenDialog({
      properties,
      filters,
      title
    })

    if (result.canceled) return null
    return result.filePaths
  })

  ipcMain.handle('get-encrypted-content', async (_event: IpcMainInvokeEvent, password: string) => {
    try {
      const encryptor = await Encryptor.init(password)
      const content = encryptor.getStorage()

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
}
