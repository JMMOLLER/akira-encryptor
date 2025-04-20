import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { createContext, useState, ReactNode, useEffect } from 'react'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const PendingEncryptionContext = createContext<PendingEncryptContextType | undefined>(undefined)

// Provider component for the context
export function PendingEncryptionProvider({ children }: { children: ReactNode }) {
  const [pendingEncryptedItems, setPendingEncryptedItems] = useState<PendingEncryptType>(new Map())
  const { setItems } = useEncryptedItems()
  const { notification } = useApp()

  useEffect(() => {
    const processEncryption = async () => {
      const newMap = new Map(pendingEncryptedItems)
      let hasEncrypted = false

      for (const [key, value] of pendingEncryptedItems.entries()) {
        if (value.status === 'encrypted') {
          await new Promise((resolve) => setTimeout(resolve, 1000)) // Add 1-second delay
          setItems((prev) => {
            return prev ? [{ ...value }, ...prev] : prev
          })
          newMap.delete(key)
          hasEncrypted = true
        } else if (value.status === 'error') {
          notification.error({
            message: 'Error',
            description: `Error al encriptar el ${value.type}: ${value.message}`,
            placement: 'topRight',
            duration: 5
          })
          await new Promise((resolve) => setTimeout(resolve, 1000)) // Add 1-second delay
          newMap.delete(key)
          hasEncrypted = true
        }
      }

      if (hasEncrypted) {
        setPendingEncryptedItems(newMap)
      }
    }

    processEncryption()
  }, [pendingEncryptedItems, setItems, notification])

  return (
    <PendingEncryptionContext.Provider value={{ pendingEncryptedItems, setPendingEncryptedItems }}>
      {children}
    </PendingEncryptionContext.Provider>
  )
}

export default PendingEncryptionContext
