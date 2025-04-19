import MenuItemContext from '@renderer/contexts/MenuItemContext'
import { useContext } from 'react'

export function useMenuItem() {
  const context = useContext(MenuItemContext)
  if (!context) {
    throw new Error('useMenuItem debe usarse dentro de un <MenuItemProvider>')
  }
  return context
}
