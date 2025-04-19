import { OpenDialogOptions } from 'electron'

declare global {
  type OpenExplorerProps = {
    title?: string
    properties: OpenDialogOptions['properties']
    filters?: OpenDialogOptions['filters']
  }

  interface ElectronIpcAPI {
    openExplorer: (props: OpenExplorerProps) => Promise<string[] | string | null>
  }
}
