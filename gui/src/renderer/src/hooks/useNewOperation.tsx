import OperationContext from '@renderer/contexts/OperationContext'
import { useContext } from 'react'

export function useNewOperation() {
  const context = useContext(OperationContext)
  if (!context) {
    throw new Error('useNewOperation debe usarse dentro de un <OperationProvider>')
  }
  return context
}
