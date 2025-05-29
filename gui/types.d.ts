import type { ItemType } from 'antd/es/menu/interface'
import { useAppProps } from 'antd/es/app/context'
import type { OpenDialogOptions } from 'electron'
import { StorageItem } from '../types'

declare global {
  type OpenExplorerProps = {
    title?: string
    properties: OpenDialogOptions['properties']
    filters?: OpenDialogOptions['filters']
  }

  type EncryptFileProps = {
    extraProps?: Record<string, JsonValue>
    action: 'encrypt' | 'decrypt'
    actionFor: 'file' | 'folder'
    filePath: string
    itemId: string
  }
  type BackupActionProps = Omit<EncryptFileProps, 'action' | 'actionFor'> & {
    action: 'create' | 'delete'
  }

  // Define this function in the preload.ts file
  interface ElectronIpcAPI {
    changeVisibility: (props: VisibilityActions) => Promise<IpcResponseStatus>
    openExplorer: (props: OpenExplorerProps) => Promise<string[] | string | null>
    backupAction: (props: BackupActionProps) => Promise<IpcResponseStatus & { dest: string }>
    getEncryptedContent: () => Promise<[string, StorageItem][] | Error>
    initEncryptor: (password: string) => Promise<IpcResponseStatus>
    encryptorAction: (props: EncryptFileProps) => Promise<void>
    openPath: (targetPath: string) => void
    openDevTools: () => void
  }

  interface DrawerContext {
    showDrawer: (_: { title?: string; content: React.ReactNode }) => void
    hideDrawer: () => void
  }

  type MenuItemOptions = 'files' | 'folders' | 'settings'

  interface MenuItemContextType {
    menuItem: MenuItemOptions
    setMenuItem: (val: MenuItemOptions) => void
  }

  type CustomItemType = ItemType & {
    danger?: boolean
    icon?: React.ReactNode
    title?: string
    key?: MenuItemOptions
  }

  interface EncryptedItemContextType {
    encryptedItems: Map<string, StorageItem> | undefined
    setItems: React.Dispatch<React.SetStateAction<EncryptedItemContextType['encryptedItems']>>
  }

  interface PendingItem {
    type: 'file' | 'folder'
    status: 'loading' | 'error'
    percent: number
    message?: string
    filePath?: string
  }
  type PendingStorage = Map<string, PendingItem>
  interface PendingEncryptContextType {
    pendingItems: PendingStorage
    removePendingItem: (id: string) => void
    addPendingItem: (id: string, item: PendingItem) => void
  }

  interface ProgressCallbackProps {
    processedBytes: number
    totalBytes: number
    itemId: string
  }
  interface ProgressCallbackErrorProps {
    filePath: string
    message: string
    itemId: string
  }

  interface ConfStoreType {
    userConfig: UserConfig
  }
  interface UserConfig {
    hashedPassword?: string
    autoBackup: boolean
    backupPath: string
    coreReady: boolean
    maxThreads: number
  }
  interface UserConfigContext {
    userConfig: UserConfig & { isLoggedIn: boolean }
    updateUserConfig: (newConfig: Partial<UserConfig>) => void
  }

  type PrevModalType = ReturnType<useAppProps['modal']['info']>

  type EncryptEndEvent = {
    extraProps?: Record<string, JsonValue>
    error: string | null
    actionFor: CliType
    action: CliAction
    itemId: string
  }

  type VisibilityActions = {
    action: 'show' | 'hide'
    itemId: string
  }
  type IpcResponseStatus = {
    error: string | null
    success: boolean
  }

  type CompressionLvl = '-mx=0' | '-mx=1' | '-mx=3' | '-mx=5' | '-mx=7' | '-mx=9'
  type CompressionAlgorithm =
    | '-m0=copy'
    | '-m0=lzma'
    | '-m0=lzma2'
    | '-m0=ppmd'
    | '-m0=bzip2'
    | '-m0=deflate'
    | '-m0=bcj'
    | '-m0=bcj2'
}
