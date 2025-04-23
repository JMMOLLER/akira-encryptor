import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { MessageInstance } from 'antd/es/message/interface'

type DecryptFileProps = {
  setter: PendingEncryptContextType['setPendingEncryptedItems']
  setEncryptedItems: EncryptedItemContextType['setItems']
  message: MessageInstance
  item: StorageItemType
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
      const { item, setter, message } = props
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

      const filePath = item.path.substring(0, lastSlashIndex) + item.id + '.enc'
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
      window.electron.ipcRenderer.send('encryptor-action', {
        password: 'mypassword', // TODO: Get password from input
        actionFor: item.type,
        action: 'decrypt',
        itemId: item.id,
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
