import type { ItemType } from 'antd/es/menu/interface'
import type { OpenDialogOptions } from 'electron'
import { StorageItem } from '../types'

declare global {
  type OpenExplorerProps = {
    title?: string
    properties: OpenDialogOptions['properties']
    filters?: OpenDialogOptions['filters']
  }

  type EncryptFileProps = {
    password: string
    filePath: string
    itemId: string
  }

  interface ElectronIpcAPI {
    getEncryptedContent: (password: string) => Promise<[string, StorageItem][] | Error>
    openExplorer: (props: OpenExplorerProps) => Promise<string[] | string | null>
    encryptFile: (props: EncryptFileProps) => Promise<void>
  }

  type MenuItemOptions = 'files' | 'folders' | 'settings'

  interface MenuItemContextType {
    item: MenuItemOptions
    setItem: (val: MenuItemOptions) => void
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
    type: 'files' | 'folders'
    status: 'loading' | 'encrypted' | 'error'
    percent: number
    message?: string
    filePath?: string
  }
  type PendingStorage = Map<string, PendingItem>
  interface PendingEncryptContextType {
    pendingEncryptedItems: PendingStorage
    setPendingEncryptedItems: React.Dispatch<React.SetStateAction<PendingStorage>>
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
}
