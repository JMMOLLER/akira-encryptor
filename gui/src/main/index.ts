import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { app, shell, BrowserWindow } from 'electron'
import icon from '../../resources/icon.png?asset'
import { Conf } from 'electron-conf/main'
import registerIpcMain from './ipcMain'
import { join } from 'path'
import fs from 'fs'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 870,
    height: 670,
    minWidth: 870,
    minHeight: 615,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Ensure that the app is not opened multiple times
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (BrowserWindow.getAllWindows().length) {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize all IPC handlers
  registerIpcMain()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (import.meta.env.MODE === 'development') {
    try {
      const envPath = join(__dirname, '../../.env')
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath) // Remove the .env file
      }
    } catch (error) {
      console.error('Error removing .env file:', error)
    }
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const conf = new Conf<ConfStoreType>({
  defaults: {
    userConfig: {
      coreReady: false,
      hashedPassword: undefined
    }
  },

  schema: {
    type: 'object',
    properties: {
      userConfig: {
        type: 'object',
        properties: {
          hashedPassword: {
            type: 'string',
            nullable: true
          },
          coreReady: {
            type: 'boolean',
            default: false
          }
        },
        required: ['coreReady']
      }
    },
    required: ['userConfig']
  }
}) // --> Que dolor de cabeza es definir esta vaina. 🫠

// set initial values
conf.set('userConfig.coreReady', false)
// register the renderer listener
conf.registerRendererListener()
