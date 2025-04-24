import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { MessageInstance } from 'antd/es/message/interface'

type DecryptFileProps = {
  setter: PendingEncryptContextType['setPendingEncryptedItems']
  setEncryptedItems: EncryptedItemContextType['setItems']
  message: MessageInstance
  item: StorageItemType
  password: string
}

const cardActions = [
  {
    key: 'view',
    Icon: EyeOutlined,
    title: 'Ver contenido',
    onclick: () => {
      console.log('Not implemented yet.')
    }
  },
  {
    key: 'decrypt',
    Icon: KeyOutlined,
    title: 'Desencriptar',
    onclick: (props: DecryptFileProps) => {
      const { item, setter, message, password } = props
      if (!item.path) {
        message.error('No se ha proporcionado una ruta de archivo para la desencriptación.')
        console.error('No file path provided for decryption.')
        return
      }

      const lastSlashIndex = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\')) + 1
      if (lastSlashIndex < 0) {
        console.error('Invalid file path:', item.path)
        message.error('Ruta de archivo no válida.')
        return
      }

      // Construct the file path for decryption
      const basePath = item.path.substring(0, lastSlashIndex)
      const fileName = item.id + (item.type === 'file' ? '.enc' : '')
      const filePath = `${basePath}${fileName}`

      // Set pending item & remove from encrypted items
      setter((prev) => {
        return new Map(prev).set(item.id, {
          type: item.type,
          status: 'loading',
          percent: 0
        })
      })
      props.setEncryptedItems((prev) => {
        const newMap = new Map(prev)
        newMap.delete(item.id)
        return newMap
      })

      // Send decrypt action to main process
      window.electron.ipcRenderer.send('encryptor-action', {
        actionFor: item.type,
        action: 'decrypt',
        itemId: item.id,
        password,
        filePath
      })
    }
  },
  {
    key: 'info',
    Icon: InfoCircleOutlined,
    title: 'Información',
    onclick: () => {
      console.log('Not implemented yet.')
    }
  }
]

export default cardActions
