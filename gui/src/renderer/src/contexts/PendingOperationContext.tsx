import { createContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const PendingOperationContext = createContext<PendingEncryptContextType | undefined>(undefined)

// Provider component for the context
export function PendingOperationProvider({ children }: { children: ReactNode }) {
  const [pendingItems, setPendingItems] = useState<PendingStorage>(new Map())
  const { setItems } = useEncryptedItems()
  const { notification } = useApp()

  const showEncryptionError = useCallback(
    (fileType: string, msg: string) => {
      return notification.error({
        message: 'Error',
        description: `Error al encriptar el ${fileType}: ${msg}`,
        placement: 'topRight',
        duration: 5
      })
    },
    [notification]
  )

  const onProgressHandler = useCallback((_: unknown, data: ProgressCallbackProps) => {
    setPendingItems((prev) => {
      const newMap = new Map(prev)
      const item = newMap.get(data.itemId)

      if (!item) return prev

      item.percent = Math.floor((data.processedBytes / data.totalBytes) * 100)

      return newMap
    })
  }, [])

  const onProgressErrorHandler = useCallback((_: unknown, data: ProgressCallbackErrorProps) => {
    setPendingItems((prev) => {
      const newMap = new Map(prev)
      const item = newMap.get(data.itemId)

      if (!item) return prev

      item.status = 'error'
      item.message = data.message
      item.filePath = data.filePath

      return newMap
    })
  }, [])

  const onEncryptEndHandler = useCallback(
    (_: unknown, data: EncryptEndEvent) => {
      const { error, itemId, actionFor, action } = data
      if (error) {
        showEncryptionError(actionFor, error)
      } else if (!error && action === 'decrypt' && data.extraProps) {
        window.api
          .backupAction({
            filePath: data.extraProps.backupPath as string,
            action: 'delete',
            itemId
          })
          .then(({ error }) => {
            if (!error) return
            console.error('Error deleting backup after decryption:', error)
            notification.error({
              message: 'Error',
              description: `Error al eliminar la copia de seguridad: ${error || 'Error desconocido'}.`,
              placement: 'topRight',
              duration: 5
            })
          })
      }

      setPendingItems((prev) => {
        return new Map(prev.entries().filter(([key]) => key !== itemId))
      })

      // force to update the encrypted items
      setItems(undefined)
    },
    [showEncryptionError, setItems, notification]
  )

  // Show error notifications for pending items
  useEffect(() => {
    const errors = [...pendingItems.entries()].filter(([_, value]) => value.status === 'error')
    if (errors.length > 0) {
      errors.forEach(([_, value]) => {
        showEncryptionError(value.type, value.message || 'Error desconocido')
      })
      // Remove the items with error status from the pendingEncryptedItems
      setPendingItems((prev) => {
        return new Map([...prev.entries()].filter(([_, value]) => value.status !== 'error'))
      })
    }
  }, [pendingItems, showEncryptionError])

  // Register the listeners
  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('onProgress', onProgressHandler)
    const onErrorUnsubscribe = window.electron.ipcRenderer.on(
      'onProgressError',
      onProgressErrorHandler
    )
    const onOperationEnd = window.electron.ipcRenderer.on('onOperationEnd', onEncryptEndHandler)

    return () => {
      // Unregister the listeners
      unsubscribe()
      onOperationEnd()
      onErrorUnsubscribe()
    }
  }, [onEncryptEndHandler, onProgressErrorHandler, onProgressHandler])

  const addItem = useCallback((id: string, item: PendingItem) => {
    setPendingItems((prev) => {
      return new Map(prev).set(id, item)
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setPendingItems((prev) => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [])

  return (
    <PendingOperationContext.Provider
      value={{ pendingItems, addPendingItem: addItem, removePendingItem: removeItem }}
    >
      {children}
    </PendingOperationContext.Provider>
  )
}

export default PendingOperationContext
