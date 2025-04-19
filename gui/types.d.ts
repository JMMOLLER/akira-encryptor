import type { ItemType } from 'antd/es/menu/interface'
import type { OpenDialogOptions } from 'electron'

declare global {
  type OpenExplorerProps = {
    title?: string
    properties: OpenDialogOptions['properties']
    filters?: OpenDialogOptions['filters']
  }

  interface ElectronIpcAPI {
    openExplorer: (props: OpenExplorerProps) => Promise<string[] | string | null>
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
  }
  interface EncryptedItemContextType {
    encryptedItems: EncryptedItem[] | undefined
    setItems: React.Dispatch<React.SetStateAction<EncryptedItemContextType['encryptedItems']>>
  }
}
