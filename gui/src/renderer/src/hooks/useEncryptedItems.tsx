import EncryptedItemContext from '@renderer/contexts/EncryptedItemContext'
import { useContext } from 'react'

export function useEncryptedItems() {
  const context = useContext(EncryptedItemContext)
  if (!context) {
    throw new Error('useEncryptedItems debe usarse dentro de un <EncryptedItemProvider>')
  }
  return context
}
