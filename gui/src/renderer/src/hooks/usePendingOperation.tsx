import PendingOperationContext from '@renderer/contexts/PendingOperationContext'
import { useContext } from 'react'

export function usePendingOperation() {
  const context = useContext(PendingOperationContext)
  if (!context) {
    throw new Error('usePendingOperation debe usarse dentro de un <PendingOperationProvider>')
  }
  return context
}
