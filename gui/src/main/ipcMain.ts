import { dialog, ipcMain, IpcMainInvokeEvent } from 'electron'

export default function registerIpcMain() {
  ipcMain.on('ping', () => console.log('pong'))

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
}
