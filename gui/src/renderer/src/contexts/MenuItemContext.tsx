import { createContext, useState, ReactNode, useEffect, useRef } from 'react'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import useApp from 'antd/es/app/useApp'

// Initialize the type for the context
const MenuItemContext = createContext<MenuItemContextType | undefined>(undefined)

// Provider component for the context
export function MenuItemProvider({ children }: { children: ReactNode }) {
  const [menuItem, setMenuItem] = useState<MenuItemOptions>('files')
  const lastItem = useRef<MenuItemOptions>(menuItem)
  const { setItems } = useEncryptedItems()
  const { modal } = useApp()

  useEffect(() => {
    // Save the last selected item
    lastItem.current = menuItem

    // Reset items when the menu items change between 'files' and 'folders'
    if (menuItem === 'settings') {
      modal.confirm({
        title: '¿Estás seguro de que quieres salir de la configuración?',
        content:
          'No podrás volver a la configuración sin reiniciar la aplicación. Además, no deberías poder ver esto aún. 🤨'
      })
      return
    }

    setItems(undefined)
  }, [menuItem, setItems, modal])

  return (
    <MenuItemContext.Provider value={{ menuItem, setMenuItem }}>
      {children}
    </MenuItemContext.Provider>
  )
}

export default MenuItemContext
