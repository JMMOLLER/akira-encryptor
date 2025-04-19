import MenuItemContext from '@renderer/contexts/MenuItemContext'
import { useContext } from 'react'

export function useMenuItemContext() {
  const context = useContext(MenuItemContext)
  if (!context) {
    throw new Error('useMyContext debe usarse dentro de un <MyContextProvider>')
  }
  return context
}
