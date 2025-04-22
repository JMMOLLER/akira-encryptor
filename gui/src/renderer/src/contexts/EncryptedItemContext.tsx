import { createContext, useState, ReactNode, useEffect } from 'react'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const EncryptedItemContext = createContext<EncryptedItemContextType | undefined>(undefined)

// Provider component for the context
export function EncryptedItemProvider({ children }: { children: ReactNode }) {
  const [encryptedItems, setItems] = useState<EncryptedItemContextType['encryptedItems']>(undefined)
  const { message } = useApp()

  useEffect(() => {
    const fakeLoad = async () => {
      try {
        const res = await window.api.getEncryptedContent('mypassword')
        if (res instanceof Error) {
          throw new Error(res.message)
        }
        const parsed = new Map(res)
        setItems(parsed)
      } catch (error) {
        console.error('Error loading encrypted items:', error)
        message.error('Ocurrió un error al cargar los elementos cifrados')
      }
    }
    if (encryptedItems === undefined) {
      fakeLoad()
    }
  }, [encryptedItems, message])

  return (
    <EncryptedItemContext.Provider value={{ encryptedItems, setItems }}>
      {children}
    </EncryptedItemContext.Provider>
  )
}

export default EncryptedItemContext
