import DrawerContext from '@renderer/contexts/DrawerContext'
import { useContext } from 'react'

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useItemDrawer must be used within a ItemDrawerProvider')
  }
  return context
}
