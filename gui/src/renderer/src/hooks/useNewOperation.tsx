import { usePendingOperation } from './usePendingOperation'
import { useEncryptedItems } from './useEncryptedItems'
import { useUserConfig } from './useUserConfig'
import useApp from 'antd/es/app/useApp'

interface Props {
  actionFor: EncryptFileProps['actionFor']
  srcPath: string
  id: string
}

export function useNewOperation() {
  const { addPendingItem } = usePendingOperation()
  const { setItems } = useEncryptedItems()
  const { userConfig } = useUserConfig()
  const { message, modal } = useApp()

  /**
   * @description `[ESP]` Crea una nueva operación de encriptación. Agrega un nuevo elemento a la lista de elementos pendientes. LLama a la función `encryptor-action` en el proceso principal.
   * @description `[ENG]` Creates a new encryption operation. Adds a new item to the pending items list. Calls the `encryptor-action` function in the main process.
   */
  const newEncrypt = async (props: Props) => {
    const { actionFor, srcPath, id } = props

    if (userConfig.autoBackup) {
      message.open({
        key: id,
        duration: 0,
        type: 'loading',
        content: 'Creando copia de seguridad...'
      })

      const res = await window.api.backupAction({
        filePath: srcPath,
        itemId: id
      })

      let skipBackupOnError = false
      if (res.error || !res.success) {
        message.error({
          key: id,
          content: 'Error al crear la copia de seguridad'
        })
        await new Promise((resolve) => {
          modal.confirm({
            title: 'Error al crear la copia de seguridad',
            content: '¿Desea continuar con la operación de encriptación?',
            cancelText: 'No',
            okText: 'Sí',
            onOk: () => {
              skipBackupOnError = true
              resolve(true)
            }
          })
        })
      } else {
        message.success({
          key: id,
          content: 'Copia de seguridad creada con éxito'
        })
      }

      if (!skipBackupOnError) return
    }

    // Set pending item
    addPendingItem(id, {
      type: actionFor,
      status: 'loading',
      percent: 0
    })

    // Set encrypted action to main process
    window.electron.ipcRenderer.send('encryptor-action', {
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
      filePath: srcPath,
      action: 'decrypt',
      itemId: id,
      actionFor
    })
  }

  return { newEncrypt, newDecrypt }
}
