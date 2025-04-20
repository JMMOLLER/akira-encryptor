import PendingEncryptionContext from '@renderer/contexts/PendingEncryption'
import { useContext } from 'react'

export function usePendingEncryption() {
  const context = useContext(PendingEncryptionContext)
  if (!context) {
    throw new Error('usePendingEncryption debe usarse dentro de un <PendingEncryptionProvider>')
  }
  return context
}
