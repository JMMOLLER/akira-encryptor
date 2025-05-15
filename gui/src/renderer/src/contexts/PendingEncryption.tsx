import { createContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const PendingEncryptionContext = createContext<PendingEncryptContextType | undefined>(undefined)

// Provider component for the context
export function PendingEncryptionProvider({ children }: { children: ReactNode }) {
  const [pendingEncryptedItems, setPendingEncryptedItems] = useState<PendingStorage>(new Map())
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
    setPendingEncryptedItems((prev) => {
      const newMap = new Map(prev)
      const item = newMap.get(data.itemId)

      if (!item) return prev

      item.percent = Math.floor((data.processedBytes / data.totalBytes) * 100)

      return newMap
    })
  }, [])

  const onProgressErrorHandler = useCallback((_: unknown, data: ProgressCallbackErrorProps) => {
    setPendingEncryptedItems((prev) => {
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
      const { error, itemId, actionFor } = data
      if (error) {
        showEncryptionError(actionFor, error)
      }

      setPendingEncryptedItems((prev) => {
        return new Map(prev.entries().filter(([key]) => key !== itemId))
      })

      // force to update the encrypted items
      setItems(undefined)
    },
    [showEncryptionError, setItems]
  )

  // Show error notifications for pending items
  useEffect(() => {
    const errors = [...pendingEncryptedItems.entries()].filter(
      ([_, value]) => value.status === 'error'
    )
    if (errors.length > 0) {
      errors.forEach(([_, value]) => {
        showEncryptionError(value.type, value.message || 'Error desconocido')
      })
      // Remove the items with error status from the pendingEncryptedItems
      setPendingEncryptedItems((prev) => {
        return new Map([...prev.entries()].filter(([_, value]) => value.status !== 'error'))
      })
    }
  }, [pendingEncryptedItems, showEncryptionError])

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

  return (
    <PendingEncryptionContext.Provider value={{ pendingEncryptedItems, setPendingEncryptedItems }}>
      {children}
    </PendingEncryptionContext.Provider>
  )
}

export default PendingEncryptionContext
