import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron'
import Encryptor from '@core/libs/Encryptor'

export default function registerIpcMain() {
  ipcMain.on('encrypt-file', async (_event: IpcMainInvokeEvent, props: EncryptFileProps) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const { password, filePath, itemId } = props

    try {
      const encryptor = await Encryptor.init(password)
      await encryptor.encryptFile({
        filePath: String(filePath),
        onProgress: (processedBytes, totalBytes) => {
          // send progress to renderer process
          if (focusedWindow) {
            focusedWindow.webContents.send('onProgress', {
              processedBytes,
              totalBytes,
              itemId
            })
          }
        }
      })
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
}
