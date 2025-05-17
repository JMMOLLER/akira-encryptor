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
    action: 'encrypt' | 'decrypt'
    actionFor: 'file' | 'folder'
    password: string
    filePath: string
    itemId: string
  }

  // Define this function in the preload.ts file
  interface ElectronIpcAPI {
    getEncryptedContent: (password: string) => Promise<[string, StorageItem][] | Error>
    changeVisibility: (props: VisibilityActions) => Promise<ChangeVisibilityResponse>
    openExplorer: (props: OpenExplorerProps) => Promise<string[] | string | null>
    encryptorAction: (props: EncryptFileProps) => Promise<void>
    openDevTools: () => void
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
    userConfig: Omit<UserConfig, 'password'>
  }
  interface UserConfig {
    hashedPassword?: string
    password?: string
  }
  interface UserConfigContext {
    userConfig: UserConfig & { isLoggedIn: boolean }
    updateUserConfig: (newConfig: Partial<UserConfig>) => void
  }

  type PrevModalType = ReturnType<useAppProps['modal']['info']>

  type EncryptEndEvent = {
    error: string | null
    actionFor: CliType
    itemId: string
  }

  type VisibilityActions = {
    action: 'show' | 'hide'
    password: string
    itemId: string
  }
  type ChangeVisibilityResponse = {
    error: string | null
    success: boolean
  }
}
