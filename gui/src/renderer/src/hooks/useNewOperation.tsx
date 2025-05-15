import { usePendingEncryption } from './usePendingEncrypt'
import { useEncryptedItems } from './useEncryptedItems'
import { useUserConfig } from './useUserConfig'

interface Props {
  actionFor: EncryptFileProps['actionFor']
  srcPath: string
  id: string
}

export function useNewOperation() {
  const { addPendingItem } = usePendingEncryption()
  const { setItems } = useEncryptedItems()
  const { userConfig } = useUserConfig()

  /**
   * @description `[ESP]` Crea una nueva operación de encriptación. Agrega un nuevo elemento a la lista de elementos pendientes. LLama a la función `encryptor-action` en el proceso principal.
   * @description `[ENG]` Creates a new encryption operation. Adds a new item to the pending items list. Calls the `encryptor-action` function in the main process.
   */
  const newEncrypt = (props: Props) => {
    const { actionFor, srcPath, id } = props

    // Set pending item
    addPendingItem(id, {
      type: actionFor,
      status: 'loading',
      percent: 0
    })

    // Set encrypted action to main process
    window.electron.ipcRenderer.send('encryptor-action', {
      password: userConfig.password,
      actionFor: actionFor,
      filePath: srcPath,
      action: 'encrypt',
      itemId: id
    })
  }

  const newDecrypt = (props: Props) => {
    const { actionFor, srcPath, id } = props

    // Set pending item
    addPendingItem(id, {
      type: actionFor,
      status: 'loading',
      percent: 0
    })

    // Remove from encrypted items
    setItems((prev) => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })

    // Send decrypt action to main process
    window.electron.ipcRenderer.send('encryptor-action', {
      password: userConfig.password,
      filePath: srcPath,
      action: 'decrypt',
      itemId: id,
      actionFor
    })
  }

  return { newEncrypt, newDecrypt }
}
