import { createContext, useState, ReactNode, useEffect } from 'react'

// Initialize the type for the context
const EncryptedItemContext = createContext<EncryptedItemContextType | undefined>(undefined)

// Provider component for the context
export function EncryptedItemProvider({ children }: { children: ReactNode }) {
  const [encryptedItems, setItems] = useState<EncryptedItemContextType['encryptedItems']>(undefined)

  useEffect(() => {
    const fakeLoad = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setItems(new Array(5).fill({}))
    }
    if (encryptedItems === undefined) {
      fakeLoad()
    }
  }, [encryptedItems])

  return (
    <EncryptedItemContext.Provider value={{ encryptedItems, setItems }}>
      {children}
    </EncryptedItemContext.Provider>
  )
}

export default EncryptedItemContext
