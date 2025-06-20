import { usePendingOperation } from '@renderer/hooks/usePendingOperation'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import { createContext, ReactNode, useState } from 'react'
import useApp from 'antd/es/app/useApp'

const OperationContext = createContext<OperationContextValue | null>(null)

export function OperationProvider({ children }: { children: ReactNode }) {
  const { addPendingItem, findByPath } = usePendingOperation()
  const [hasBackupInProgress, setBackuping] = useState(false)
  const { setItems } = useEncryptedItems()
  const { userConfig } = useUserConfig()
  const { message, modal } = useApp()

  /**
   * @description `[ESP]` Crea una nueva operación de encriptación. Agrega un nuevo elemento a la lista de elementos pendientes. LLama a la función `encryptor-action` en el proceso principal.
   * @description `[ENG]` Creates a new encryption operation. Adds a new item to the pending items list. Calls the `encryptor-action` function in the main process.
   */
  const newEncrypt = async (params: OperationProps) => {
    const { actionFor, srcPath, id } = params
    let backupPath: string | undefined = undefined

    if (hasBackupInProgress) {
      // This message is only for the developer, this case should be handled in a view component with `hasBackupInProgress`.
      console.warn(
        'No se puede iniciar una nueva operación de encriptación mientras hay una copia de seguridad en progreso.'
      )
      return
    } else if (findByPath(srcPath)) {
      // This message is only for the developer, this case should be handled in a view component with `findByPath`.
      console.warn(
        'Ya existe una operación pendiente para este archivo o carpeta. Por favor, espere a que se complete.'
      )
      return
    }

    if (userConfig.autoBackup) {
      setBackuping(true)
      message.open({
        key: id,
        duration: 0,
        type: 'loading',
        content: 'Creando copia de seguridad...'
      })

      const res = await window.api.backupAction({
        srcPath: srcPath,
        action: 'create',
        itemId: id
      })
      console.log(res)

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
            onOk: () => resolve(false),
            onCancel: () => {
              skipBackupOnError = true
              resolve(true)
            }
          })
        })
      } else {
        backupPath = res.dest
        message.success({
          key: id,
          content: 'Copia de seguridad creada con éxito'
        })
      }

      setBackuping(false)
      if (skipBackupOnError) return
    }

    // Set pending item
    addPendingItem(id, {
      type: actionFor,
      status: 'loading',
      srcPath: srcPath,
      percent: 0
    })

    // Set encrypted action to main process
    window.electron.ipcRenderer.send('encryptor-action', {
      actionFor: actionFor,
      srcPath: srcPath,
      action: 'encrypt',
      itemId: id,
      extraProps: {
        backupPath
      }
    } as EncryptFileProps)
  }

  const newDecrypt = (params: OperationProps) => {
    const { actionFor, srcPath, id } = params
    let backupPath: string | undefined = undefined

    // Set pending item
    addPendingItem(id, {
      type: actionFor,
      status: 'loading',
      percent: 0
    })

    // Remove from encrypted items
    setItems((prev) => {
      const newMap = new Map(prev)
      backupPath = newMap.get(id)?.extraProps?.backupPath as string | undefined
      newMap.delete(id)
      return newMap
    })

    // Send decrypt action to main process
    window.electron.ipcRenderer.send('encryptor-action', {
      srcPath: srcPath,
      action: 'decrypt',
      itemId: id,
      actionFor,
      extraProps: {
        backupPath
      }
    } as EncryptFileProps)
  }

  return (
    <OperationContext.Provider value={{ hasBackupInProgress, newEncrypt, newDecrypt }}>
      {children}
    </OperationContext.Provider>
  )
}

export default OperationContext
