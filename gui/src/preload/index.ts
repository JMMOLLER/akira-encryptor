import calculateUsageFromThreads from '@utils/calculateUsageFromThreads'
import calculateThreads from '@utils/calculateThreads'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { exposeConf } from 'electron-conf/preload'

// Expose the conf API to the renderer process
exposeConf()

// Custom APIs for renderer
// Define the actions in the ipcMain.ts file
const api = {
  calculateThreads,
  calculateUsageFromThreads,
  openDevTools: () => ipcRenderer.send('open-devtools'),
  openPath: (targetPath: string) => ipcRenderer.send('open-path', targetPath),
  openExplorer: (props: OpenExplorerProps) => ipcRenderer.invoke('open-explorer', props),
  backupAction: (props: BackupActionProps) => ipcRenderer.invoke('backup-action', props),
  initEncryptor: (password: string) => ipcRenderer.invoke('initialize-encryptor', password),
  encryptorAction: (props: EncryptFileProps) => ipcRenderer.invoke('encryptor-action', props),
  changeVisibility: (props: VisibilityActions) => ipcRenderer.invoke('visibility-action', props),
  getEncryptedContent: (password: string) => ipcRenderer.invoke('get-encrypted-content', password)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
