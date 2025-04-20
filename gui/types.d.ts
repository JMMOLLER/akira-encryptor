import type { ItemType } from 'antd/es/menu/interface'
import type { OpenDialogOptions } from 'electron'

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

  interface EncryptedItem {
    type: 'files' | 'folders'
    status: 'loading' | 'encrypted' | 'error'
    percent: number
    message?: string
    filePath?: string
  }
  interface EncryptedItemContextType {
    encryptedItems: EncryptedItem[] | undefined
    setItems: React.Dispatch<React.SetStateAction<EncryptedItemContextType['encryptedItems']>>
  }

  type PendingEncryptType = Map<string, EncryptedItem>
  interface PendingEncryptContextType {
    pendingEncryptedItems: PendingEncryptType
    setPendingEncryptedItems: React.Dispatch<React.SetStateAction<PendingEncryptType>>
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
